import type {
  Connection,
  DatasetInfo,
  DepartureWindow,
  ItineraryFilters,
  ItinerarySort,
  PlanRejection,
  PlanResult,
  PlannedItinerary,
  Transfer,
  TransferRisk,
  TripPlan,
} from "./types";
import { DATASET_INFO, connectionsForDate, datasetCities, DEMO_SERVICE_DATE } from "./connections";

/**
 * Route-planning engine over the fixed simulated connection dataset.
 *
 * The graph is small and fully known, so we enumerate feasible multi-leg paths
 * with a depth-limited time-aware search rather than a heuristic shortest-path
 * search. Every constraint is validated and impossible connections are rejected
 * with an explanation.
 */

export const MIN_TRANSFER_MIN = 30;
export const MAX_LEGS = 3;
const HORIZON_MIN = 30 * 60;
const MAX_RESULTS = 12;
const MAX_REJECTIONS = 6;

const WINDOW_RANGES: Record<DepartureWindow, [number, number]> = {
  "early-morning": [240, 480],
  morning: [480, 720],
  afternoon: [720, 1020],
  evening: [1020, 1260],
  night: [1260, 1440],
};

const RISK_ORDER: TransferRisk[] = ["none", "low", "medium", "high"];

export interface PlanOptions {
  /** Service date to plan for. Defaults to the plan's departure date. */
  date?: string;
  /** Reference time for freshness, defaults to now. */
  now?: Date;
  /** Override the connection pool (used in tests). */
  connections?: Connection[];
}

// ── time helpers ─────────────────────────────────────────────────────────────

/** Parse an ISO local datetime (no timezone) into epoch milliseconds. */
export function parseWall(iso: string): number {
  return Date.parse(iso.includes("Z") || iso.includes("+") ? iso : `${iso}Z`);
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((parseWall(b) - parseWall(a)) / 60000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Shift an ISO local datetime by a number of minutes, preserving the format. */
export function shiftIso(iso: string, deltaMin: number): string {
  const d = new Date(parseWall(iso) + deltaMin * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

/** Return a copy of a connection rescheduled by a number of minutes. */
export function shiftConnection(c: Connection, deltaMin: number): Connection {
  return { ...c, id: `${c.id}${deltaMin >= 0 ? "+" : ""}${deltaMin}`, depart: shiftIso(c.depart, deltaMin), arrive: shiftIso(c.arrive, deltaMin) };
}

function minuteOfDay(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The full connection pool the engine searches: the requested service date plus
 * the following day so overnight journeys can still reach their destination.
 * Day-two services are marked with an `@d2` suffix so every row keeps a unique id.
 */
export function servicePool(date: string): Connection[] {
  return [
    ...connectionsForDate(date),
    ...connectionsForDate(addDays(date, 1)).map((c) => ({ ...c, id: `${c.id}@d2` })),
  ];
}

// ── city matching ────────────────────────────────────────────────────────────

const CITY_ALIASES: Record<string, string> = {
  vizag: "Visakhapatnam",
  vishakhapatnam: "Visakhapatnam",
  "visakha patnam": "Visakhapatnam",
  bangalore: "Bengaluru",
  bombay: "Mumbai",
  madras: "Chennai",
  bezwada: "Vijayawada",
  bezawada: "Vijayawada",
};

export function canonicalCity(input: string | null | undefined): string | null {
  if (!input) return null;
  const norm = input.trim().toLowerCase();
  for (const city of datasetCities()) {
    if (city.toLowerCase() === norm) return city;
  }
  return CITY_ALIASES[norm] ?? null;
}

// ── derived metrics ──────────────────────────────────────────────────────────

function riskFor(waitMin: number, stationChange: boolean): TransferRisk {
  let idx = waitMin < 45 ? 2 : waitMin < 75 ? 1 : 0;
  if (stationChange) idx = Math.min(2, idx + 1);
  return (["low", "medium", "high"] as TransferRisk[])[idx]!;
}

export function deriveTransfers(connections: Connection[]): Transfer[] {
  const transfers: Transfer[] = [];
  for (let i = 1; i < connections.length; i += 1) {
    const prev = connections[i - 1]!;
    const cur = connections[i]!;
    const waitMin = minutesBetween(prev.arrive, cur.depart);
    const stationChange = prev.toStop !== cur.fromStop;
    transfers.push({
      location: `${cur.from} — ${prev.toStop}`,
      waitMin,
      risk: riskFor(waitMin, stationChange),
      stationChange,
      fromMode: prev.mode,
      toMode: cur.mode,
    });
  }
  return transfers;
}

const COMFORT_LABELS: Record<Connection["comfort"], string> = {
  sleeper: "Sleeper",
  seater: "Seater",
  standard: "Standard",
};

export function comfortLabel(connections: Connection[]): string {
  const unique = [...new Set(connections.map((c) => c.comfort))];
  return unique.map((c) => COMFORT_LABELS[c]).join(" + ");
}

function worstRisk(transfers: Transfer[]): TransferRisk {
  let worst: TransferRisk = "none";
  for (const t of transfers) {
    if (RISK_ORDER.indexOf(t.risk) > RISK_ORDER.indexOf(worst)) worst = t.risk;
  }
  return worst;
}

// ── result assembly ──────────────────────────────────────────────────────────

interface BuildContext {
  plan: TripPlan;
  date: string;
  deadlineIso: string | null;
  startMin: number;
  endMin: number;
}

function buildItinerary(connections: Connection[], ctx: BuildContext): PlannedItinerary {
  const { plan, deadlineIso } = ctx;
  const passengers = plan.passengers ?? 1;
  const first = connections[0]!;
  const last = connections[connections.length - 1]!;
  const transfers = deriveTransfers(connections);
  const fare = connections.reduce((sum, c) => sum + c.fare, 0);
  const totalFare = fare * passengers;
  const travelDurationMin = connections.reduce((sum, c) => sum + c.durationMin, 0);
  const totalDurationMin = minutesBetween(first.depart, last.arrive);
  const modes = [...new Set(connections.map((c) => c.mode))];
  const comfort = comfortLabel(connections);
  const transferRisk = worstRisk(transfers);

  const meetsArrivalDeadline = !deadlineIso || parseWall(last.arrive) <= parseWall(deadlineIso);
  const arrivalSlackMin = deadlineIso ? minutesBetween(last.arrive, deadlineIso) : null;

  const relaxations: string[] = [];
  if (plan.maxBudget != null && totalFare > plan.maxBudget) {
    relaxations.push(`Over budget by ₹${(totalFare - plan.maxBudget).toLocaleString("en-IN")}`);
  }
  if (plan.coachClass && !connections.every((c) => c.comfort === plan.coachClass)) {
    relaxations.push(`Not all legs are ${plan.coachClass}`);
  }
  if (minuteOfDay(first.depart) > ctx.endMin) {
    relaxations.push("Departs later than your preferred time");
  }
  if (!meetsArrivalDeadline && arrivalSlackMin != null) {
    relaxations.push(`Arrives ${Math.abs(arrivalSlackMin)} min after your deadline`);
  }

  const tags: string[] = [];
  if (connections.length === 1) tags.push("Direct");
  else tags.push(`${transfers.length} transfer${transfers.length > 1 ? "s" : ""}`);
  tags.push(comfort);
  if (first.depart.slice(0, 10) !== last.arrive.slice(0, 10)) tags.push("Overnight");
  if (connections.some((c) => c.availability === "limited")) tags.push("Limited seats");
  if (meetsArrivalDeadline && deadlineIso) tags.push("Meets deadline");
  tags.push("Simulated");

  const updatedAt = connections
    .map((c) => c.updatedAt)
    .sort()[0]!;
  const source = [...new Set(connections.map((c) => c.source))].join(", ");

  return {
    id: connections.map((c) => c.id).join(">"),
    from: first.from,
    to: last.to,
    date: ctx.date,
    connections,
    transfers,
    depart: first.depart,
    arrive: last.arrive,
    travelDurationMin,
    totalDurationMin,
    fare,
    totalFare,
    passengers,
    legs: connections.length,
    modes,
    comfort,
    transferRisk,
    meetsArrivalDeadline,
    arrivalSlackMin,
    score: 0,
    simulated: true,
    source,
    updatedAt,
    tags,
    relaxations,
  };
}

/**
 * Assemble a PlannedItinerary from an explicit ordered list of connections.
 * Used by the disruption simulator to evaluate composed prefix + recalculation
 * journeys against the original plan's constraints. The departure window is
 * intentionally ignored because the journey is already underway.
 */
export function assembleItinerary(connections: Connection[], plan: TripPlan, date: string): PlannedItinerary {
  const deadlineIso = plan.arrivalDate ? `${plan.arrivalDate}T${plan.arrivalTime ?? "23:59"}:00` : null;
  const ctx: BuildContext = { plan, date, deadlineIso, startMin: 0, endMin: 1440 };
  return buildItinerary(connections, ctx);
}

// ── scoring ──────────────────────────────────────────────────────────────────

function range(arr: number[]): { min: number; max: number } {
  return { min: Math.min(...arr), max: Math.max(...arr) };
}

function invNorm(v: number, min: number, max: number): number {
  return max === min ? 1 : (max - v) / (max - min);
}

const RISK_SCORE: Record<TransferRisk, number> = { none: 1, low: 0.8, medium: 0.5, high: 0.2 };
const COMFORT_SCORE: Record<string, number> = { Sleeper: 1, Seater: 0.6, Standard: 0.45 };

function applyScores(items: PlannedItinerary[]): void {
  if (items.length === 0) return;
  const fares = range(items.map((i) => i.totalFare));
  const durs = range(items.map((i) => i.totalDurationMin));
  for (const it of items) {
    const priceScore = invNorm(it.totalFare, fares.min, fares.max);
    const durScore = invNorm(it.totalDurationMin, durs.min, durs.max);
    const riskScore = RISK_SCORE[it.transferRisk];
    const comfortScore = COMFORT_SCORE[it.comfort] ?? 0.5;
    it.score = Math.round(1000 * (0.4 * priceScore + 0.3 * durScore + 0.2 * riskScore + 0.1 * comfortScore)) / 10;
  }
}

// ── main entry point ─────────────────────────────────────────────────────────

function uniqueRejections(rejections: PlanRejection[]): PlanRejection[] {
  const seen = new Set<string>();
  const out: PlanRejection[] = [];
  for (const r of rejections) {
    const key = r.reason;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= MAX_REJECTIONS) break;
  }
  return out;
}

export function planItineraries(plan: TripPlan, options: PlanOptions = {}): PlanResult {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const date = options.date ?? plan.departureDate ?? DEMO_SERVICE_DATE;
  const origin = canonicalCity(plan.origin);
  const destination = canonicalCity(plan.destination);

  const empty = (explanation: string, rejections: PlanRejection[] = []): PlanResult => ({
    feasible: [],
    alternatives: [],
    rejections: uniqueRejections(rejections),
    explanation,
    simulated: true,
    generatedAt,
    dataset: DATASET_INFO,
  });

  if (!origin || !destination || origin === destination) {
    const known = datasetCities().join(", ");
    return empty(
      `RoamAgent has no simulated schedules for "${plan.origin ?? "?"}" → "${plan.destination ?? "?"}". ` +
        `This demonstration dataset covers: ${known}.`,
    );
  }

  const pool = options.connections ?? servicePool(date);

  const byFrom = new Map<string, Connection[]>();
  for (const c of pool) {
    const list = byFrom.get(c.from);
    if (list) list.push(c);
    else byFrom.set(c.from, [c]);
  }

  const passengers = plan.passengers ?? 1;
  const accessibility = plan.accessibility ?? [];
  const luggage = plan.luggage;

  // Departure window (minutes of day on the service date).
  let startMin = 0;
  let endMin = 1440;
  if (plan.departureTime) {
    startMin = minuteOfDay(`2000-01-01T${plan.departureTime}:00`);
    endMin = Math.min(1440, startMin + 180);
  } else if (plan.departureWindow) {
    [startMin, endMin] = WINDOW_RANGES[plan.departureWindow];
  }
  // Allow a grace band beyond the preferred window so we can still offer
  // clearly labelled alternatives when nothing sits inside it.
  const graceEnd = Math.min(1440, endMin + 240);

  const deadlineIso = plan.arrivalDate
    ? `${plan.arrivalDate}T${plan.arrivalTime ?? "23:59"}:00`
    : null;

  const horizon = parseWall(`${date}T00:00:00`) + (graceEnd + HORIZON_MIN) * 60000;

  const ctx: BuildContext = { plan, date, deadlineIso, startMin, endMin };

  const results = new Map<string, PlannedItinerary>();
  const rejections: PlanRejection[] = [];

  function reject(conns: Connection[], c: Connection, reason: string): void {
    rejections.push({ connectionIds: [...conns.map((x) => x.id), c.id], reason });
  }

  function validateConnection(c: Connection): string | null {
    if (c.availability === "sold-out") {
      return `${c.operator} ${c.code} is sold out.`;
    }
    if (c.seatsLeft !== null && c.seatsLeft < passengers) {
      return `${c.operator} ${c.code} has only ${c.seatsLeft} seat(s) left for ${passengers} traveller(s).`;
    }
    const missing = accessibility.filter((a) => !c.accessible.includes(a));
    if (missing.length > 0) {
      return `${c.operator} ${c.code} does not support: ${missing.join(", ")}.`;
    }
    if (luggage && (luggage.cabin > c.luggageCabin || luggage.checked > c.luggageChecked)) {
      return `${c.operator} ${c.code} luggage allowance (${c.luggageCabin} cabin, ${c.luggageChecked} checked) is below your requirement.`;
    }
    return null;
  }

  function expand(node: string, conns: Connection[], visited: Set<string>): void {
    if (conns.length >= MAX_LEGS) return;
    for (const c of byFrom.get(node) ?? []) {
      if (parseWall(c.depart) > horizon) continue;
      const prev = conns[conns.length - 1]!;
      const wait = minutesBetween(prev.arrive, c.depart);
      if (wait < 0) continue;
      if (wait < MIN_TRANSFER_MIN) {
        reject(conns, c, `Only ${wait} min to change at ${prev.to}; the minimum connection time is ${MIN_TRANSFER_MIN} min.`);
        continue;
      }
      const failure = validateConnection(c);
      if (failure) {
        reject(conns, c, failure);
        continue;
      }
      if (visited.has(c.to)) continue;
      const next = [...conns, c];
      const nextVisited = new Set(visited);
      nextVisited.add(c.to);
      if (c.to === destination) {
        const it = buildItinerary(next, ctx);
        if (!results.has(it.id)) results.set(it.id, it);
      } else {
        expand(c.to, next, nextVisited);
      }
    }
  }

  for (const c of byFrom.get(origin) ?? []) {
    if (!c.depart.startsWith(date)) continue;
    const mod = minuteOfDay(c.depart);
    if (mod < startMin || mod > graceEnd) continue;
    const failure = validateConnection(c);
    if (failure) {
      reject([], c, failure);
      continue;
    }
    const visited = new Set<string>([origin, c.to]);
    if (c.to === destination) {
      const it = buildItinerary([c], ctx);
      if (!results.has(it.id)) results.set(it.id, it);
    } else {
      expand(c.to, [c], visited);
    }
  }

  const all = [...results.values()];
  applyScores(all);

  const feasible = all.filter((i) => i.relaxations.length === 0).sort((a, b) => b.score - a.score);
  const alternatives = all.filter((i) => i.relaxations.length > 0).sort((a, b) => b.score - a.score);

  const trimmedFeasible = feasible.slice(0, MAX_RESULTS);
  const trimmedAlternatives = alternatives.slice(0, MAX_RESULTS);

  let explanation: string;
  if (trimmedFeasible.length > 0) {
    explanation =
      `${trimmedFeasible.length} simulated itinerary option(s) meet all your constraints for ${origin} → ${destination}. ` +
      `Schedules, fares and availability are simulated for demonstration.`;
  } else {
    const relaxations = [...new Set(trimmedAlternatives.flatMap((a) => a.relaxations))];
    explanation =
      `No itinerary satisfies every constraint for ${origin} → ${destination} on ${date}. ` +
      `This demonstration dataset is small, so some routes or dates have no matching service.`;
    if (relaxations.length > 0) {
      explanation += ` The closest alternatives relax: ${relaxations.join("; ")}.`;
    }
    if (rejections.length > 0) {
      explanation += ` Rejected connections: ${uniqueRejections(rejections)
        .slice(0, 3)
        .map((r) => r.reason)
        .join(" ")}`;
    }
  }

  return {
    feasible: trimmedFeasible,
    alternatives: trimmedAlternatives,
    rejections: uniqueRejections(rejections),
    explanation,
    simulated: true,
    generatedAt,
    dataset: DATASET_INFO,
  };
}

// ── sorting / filtering ──────────────────────────────────────────────────────

export function sortItineraries(items: PlannedItinerary[], sort: ItinerarySort): PlannedItinerary[] {
  const copy = [...items];
  switch (sort) {
    case "price":
      return copy.sort((a, b) => a.totalFare - b.totalFare || a.totalDurationMin - b.totalDurationMin);
    case "duration":
      return copy.sort((a, b) => a.totalDurationMin - b.totalDurationMin || a.totalFare - b.totalFare);
    case "arrival":
      return copy.sort((a, b) => parseWall(a.arrive) - parseWall(b.arrive) || a.totalFare - b.totalFare);
    case "departure":
      return copy.sort((a, b) => parseWall(a.depart) - parseWall(b.depart) || a.totalFare - b.totalFare);
    case "transfers":
      return copy.sort((a, b) => a.transfers.length - b.transfers.length || a.totalFare - b.totalFare);
    case "recommended":
    default:
      return copy.sort((a, b) => b.score - a.score || a.totalFare - b.totalFare);
  }
}

export function filterItineraries(items: PlannedItinerary[], filters: ItineraryFilters): PlannedItinerary[] {
  return items.filter((it) => {
    if (filters.maxPrice != null && it.totalFare > filters.maxPrice) return false;
    if (filters.maxDurationMin != null && it.totalDurationMin > filters.maxDurationMin) return false;
    if (filters.modes.length > 0 && !it.modes.every((m) => filters.modes.includes(m))) return false;
    if (filters.coachClass && !it.connections.every((c) => c.comfort === filters.coachClass)) return false;
    if (filters.deadlineOnly && !it.meetsArrivalDeadline) return false;
    if (filters.directOnly && it.transfers.length > 0) return false;
    if (filters.availabilityOnly && it.connections.some((c) => c.availability !== "available")) return false;
    return true;
  });
}

export function datasetInfo(): DatasetInfo {
  return DATASET_INFO;
}
