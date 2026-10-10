import {
  MIN_TRANSFER_MIN,
  assembleItinerary,
  minutesBetween,
  parseWall,
  planItineraries,
  servicePool,
  shiftConnection,
} from "./itinerary";
import type {
  Connection,
  DisruptionEvent,
  DisruptionKind,
  DisruptionSeverity,
  DisruptionSimulation,
  PlannedItinerary,
  RevisedItinerary,
  TripPlan,
} from "./types";

/**
 * Disruption simulator.
 *
 * Given an itinerary from the route-planning engine and one simulated
 * disruption, this module perturbs the connection graph and asks the real
 * engine to recalculate the remaining journey. The recovered options are then
 * composed back onto the untouched prefix and re-evaluated against the original
 * plan's deadline, budget and comfort constraints. Nothing here is hard-coded:
 * every alternative comes from `planItineraries`.
 *
 * EVERYTHING IS SIMULATED. The dataset, the disruption and the recovery options
 * are demonstration data and are never presented as live travel information.
 */

const KIND_LABEL: Record<DisruptionKind, string> = {
  "bus-delay": "Bus delay",
  "bus-cancellation": "Bus cancellation",
  "missed-connection": "Missed connection",
  "last-mile-unavailable": "Last-mile transport unavailable",
};

const KIND_SEVERITY: Record<DisruptionKind, DisruptionSeverity> = {
  "bus-delay": "warning",
  "bus-cancellation": "critical",
  "missed-connection": "critical",
  "last-mile-unavailable": "warning",
};

const DEFAULT_DELAY: Record<DisruptionKind, number> = {
  "bus-delay": 90,
  "bus-cancellation": 0,
  "missed-connection": 120,
  "last-mile-unavailable": 0,
};

export const DEFAULT_DELAY_MIN = 90;

/** The kind's natural target leg: first leg, the first transfer, or the last leg. */
export function defaultLegIndex(kind: DisruptionKind, itinerary: PlannedItinerary): number {
  const n = itinerary.connections.length;
  if (kind === "last-mile-unavailable") return Math.max(0, n - 1);
  if (kind === "missed-connection") return n > 1 ? 1 : 0;
  return 0;
}

export interface SimulateOptions {
  /** Delay in minutes for delay and missed-connection events. */
  delayMin?: number;
  /** Override the affected leg (zero-based). */
  legIndex?: number;
  /** Reference time, defaults to now. */
  now?: Date;
  /** Override the connection pool (used in tests). */
  connections?: Connection[];
}

function removeConnections(pool: Connection[], conn: Connection): Connection[] {
  const base = conn.id.replace(/@d2$/, "");
  return pool.filter((c) => c.id !== conn.id && c.id !== base && c.id !== `${base}@d2`);
}

function detailFor(kind: DisruptionKind, affected: Connection, delayMin: number): string {
  switch (kind) {
    case "bus-delay":
      return `${affected.operator} ${affected.code} from ${affected.from} is delayed by ${delayMin} min. Simulated event.`;
    case "bus-cancellation":
      return `${affected.operator} ${affected.code} from ${affected.from} has been cancelled by the operator. Simulated event.`;
    case "missed-connection":
      return `A ${delayMin} min delay means ${affected.operator} ${affected.code} at ${affected.from} is missed. Simulated event.`;
    case "last-mile-unavailable":
      return `The final leg ${affected.operator} ${affected.code} into ${affected.to} is unavailable. Simulated event.`;
  }
}

function budgetTradeoff(plan: TripPlan, itinerary: PlannedItinerary): string | null {
  if (plan.maxBudget == null) return null;
  const diff = itinerary.totalFare - plan.maxBudget;
  if (diff > 0) return `Over budget by ₹${diff.toLocaleString("en-IN")}`;
  return `Within budget by ₹${Math.abs(diff).toLocaleString("en-IN")}`;
}

function buildTradeoffs(
  original: PlannedItinerary,
  itinerary: PlannedItinerary,
  preservedLegs: number,
  plan: TripPlan,
  additionalCost: number,
  addedDelayMin: number,
): string[] {
  const out: string[] = [];
  if (additionalCost > 0) out.push(`Costs ₹${additionalCost.toLocaleString("en-IN")} more than the original`);
  else if (additionalCost < 0) out.push(`Saves ₹${Math.abs(additionalCost).toLocaleString("en-IN")}`);
  else out.push("Same fare as the original");

  if (addedDelayMin > 0) out.push(`Arrives ${addedDelayMin} min later than the original`);
  else if (addedDelayMin < 0) out.push(`Arrives ${Math.abs(addedDelayMin)} min earlier than the original`);
  else out.push("Same arrival time as the original");

  if (itinerary.meetsArrivalDeadline) out.push("Meets your arrival deadline");
  else out.push(`Misses your deadline by ${Math.abs(itinerary.arrivalSlackMin ?? 0)} min`);

  const budget = budgetTradeoff(plan, itinerary);
  if (budget) out.push(budget);

  if (preservedLegs > 0) {
    out.push(`Keeps your first ${preservedLegs} of ${original.connections.length} leg(s)`);
  } else {
    out.push("Whole journey rebooked");
  }

  if (itinerary.transferRisk === "medium" || itinerary.transferRisk === "high") {
    out.push(`${itinerary.transferRisk}-risk transfer`);
  }
  return out;
}

function strategyFor(kind: DisruptionKind, preservedLegs: number, itinerary: PlannedItinerary): string {
  const tail = itinerary.connections[preservedLegs];
  const via = tail ? ` from ${tail.from}` : "";
  switch (kind) {
    case "bus-delay":
      return preservedLegs > 0 ? `Wait for the delayed service, then continue${via}` : `Rebook onto a later service${via}`;
    case "bus-cancellation":
      return preservedLegs > 0 ? `Rebook the cancelled leg${via}` : `Rebook from ${itinerary.from}`;
    case "missed-connection":
      return `Recover after the missed connection${via}`;
    case "last-mile-unavailable":
      return `Replace the unavailable last leg${via}`;
  }
}

export function simulateDisruption(
  original: PlannedItinerary,
  plan: TripPlan,
  kind: DisruptionKind,
  options: SimulateOptions = {},
): DisruptionSimulation {
  const now = options.now ?? new Date();
  const date = original.date;
  const generatedAt = now.toISOString();
  const delayMin = options.delayMin ?? DEFAULT_DELAY[kind];
  const n = original.connections.length;

  let idx = options.legIndex ?? defaultLegIndex(kind, original);
  idx = Math.max(0, Math.min(idx, n - 1));
  const affected = original.connections[idx]!;

  const event: DisruptionEvent = {
    id: `sim-${kind}-${idx}-${now.getTime()}`,
    kind,
    label: KIND_LABEL[kind],
    severity: KIND_SEVERITY[kind],
    legIndex: idx,
    detail: detailFor(kind, affected, delayMin),
    delayMin: kind === "bus-delay" || kind === "missed-connection" ? delayMin : null,
    createdAt: generatedAt,
    simulated: true,
  };

  const base: Omit<DisruptionSimulation, "event" | "affected" | "recalculation" | "revised" | "feasible" | "alternatives" | "noAlternative" | "explanation"> = {
    original,
    simulated: true,
    generatedAt,
  };

  const build = (
    recalculation: string,
    revised: RevisedItinerary[],
    explanation: string,
    noAlternative: boolean,
  ): DisruptionSimulation => {
    const feasible = revised.filter((r) => r.feasible);
    const alternatives = revised.filter((r) => !r.feasible);
    return { ...base, event, affected: { index: idx, connection: affected }, recalculation, revised, feasible, alternatives, noAlternative, explanation };
  };

  // A missed connection only exists when there is a transfer to miss.
  if (kind === "missed-connection" && n < 2) {
    return build(
      `This itinerary has no transfer to miss.`,
      [],
      `The selected journey is a single direct leg, so there is no connection to miss. Simulated scenario.`,
      true,
    );
  }

  const pool = options.connections ?? servicePool(date);

  let prefix: Connection[];
  let modifiedPool: Connection[];
  let t0Iso: string;
  let resume: string;

  if (kind === "bus-delay") {
    prefix = original.connections.slice(0, idx);
    const delayed = shiftConnection(affected, delayMin);
    modifiedPool = pool.map((c) => (c.id === affected.id ? delayed : c));
    t0Iso = delayed.depart;
    resume = affected.from;
  } else if (kind === "bus-cancellation") {
    prefix = original.connections.slice(0, idx);
    modifiedPool = removeConnections(pool, affected);
    t0Iso = affected.depart;
    resume = affected.from;
  } else if (kind === "missed-connection") {
    const prev = original.connections[idx - 1]!;
    const delayedPrev = shiftConnection(prev, delayMin);
    prefix = [...original.connections.slice(0, idx - 1), delayedPrev];
    modifiedPool = removeConnections(pool, affected);
    t0Iso = delayedPrev.arrive;
    resume = affected.from;
  } else {
    // last-mile-unavailable
    prefix = original.connections.slice(0, idx);
    modifiedPool = removeConnections(pool, affected);
    t0Iso = affected.depart;
    resume = affected.from;
  }

  const remainingPlan: TripPlan = {
    ...plan,
    origin: resume,
    destination: original.to,
    departureDate: date,
    departureWindow: null,
    departureTime: null,
    passengers: plan.passengers ?? original.passengers,
  };

  const remaining = planItineraries(remainingPlan, { date, connections: modifiedPool, now });

  const candidates = [...remaining.feasible, ...remaining.alternatives];
  const seen = new Set<string>();
  const revised: RevisedItinerary[] = [];

  for (const cand of candidates) {
    if (cand.connections.length === 0) continue;
    const first = cand.connections[0]!;
    if (parseWall(first.depart) < parseWall(t0Iso)) continue;
    if (cand.connections.some((c) => c.id === affected.id)) continue;

    const combined = [...prefix, ...cand.connections];
    const keys = combined.map((c) => c.id);
    if (new Set(keys).size !== keys.length) continue;
    const comboKey = keys.join(">");
    if (seen.has(comboKey)) continue;
    seen.add(comboKey);

    const itinerary = assembleItinerary(combined, plan, date);
    if (itinerary.transfers.some((t) => t.waitMin < 0)) continue;

    const tight = itinerary.transfers.filter((t) => t.waitMin < MIN_TRANSFER_MIN);
    if (tight.length > 0) {
      itinerary.relaxations.push(
        `Only ${tight[0]!.waitMin} min to change at ${tight[0]!.location.split(" — ")[0]}; the minimum is ${MIN_TRANSFER_MIN} min`,
      );
    }

    const additionalCost = itinerary.totalFare - original.totalFare;
    const addedDelayMin = minutesBetween(original.arrive, itinerary.arrive);
    const preservedLegs = prefix.length;
    const withinBudget = plan.maxBudget == null ? null : itinerary.totalFare <= plan.maxBudget;
    const feasible = itinerary.relaxations.length === 0;

    revised.push({
      itinerary,
      strategy: strategyFor(kind, preservedLegs, itinerary),
      additionalCost,
      addedDelayMin,
      meetsArrivalDeadline: itinerary.meetsArrivalDeadline,
      arrivalSlackMin: itinerary.arrivalSlackMin,
      withinBudget,
      preservedLegs,
      tradeoffs: buildTradeoffs(original, itinerary, preservedLegs, plan, additionalCost, addedDelayMin),
      feasible,
    });
  }

  revised.sort((a, b) => {
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    return a.addedDelayMin - b.addedDelayMin || a.additionalCost - b.additionalCost;
  });

  const recalculation =
    `Re-planning the remaining journey from ${resume} to ${original.to} on ${date}, ` +
    `departing ${t0Iso.slice(11, 16)} or later, using the simulated connection graph.`;

  const noAlternative = revised.length === 0;
  let explanation: string;
  if (noAlternative) {
    explanation =
      `No simulated recovery option connects ${resume} to ${original.to} after the ${KIND_LABEL[kind].toLowerCase()}. ` +
      `The demonstration dataset is small, so this leg has no replacement service. Simulated scenario.`;
  } else {
    const feasibleCount = revised.filter((r) => r.feasible).length;
    explanation =
      feasibleCount > 0
        ? `${feasibleCount} simulated recovery option(s) meet your deadline and budget after the ${KIND_LABEL[kind].toLowerCase()}.`
        : `No recovery option meets every constraint after the ${KIND_LABEL[kind].toLowerCase()} — review the labelled alternatives.`;
    explanation += " All recovery options are simulated demonstration data.";
  }

  return build(recalculation, revised, explanation, noAlternative);
}
