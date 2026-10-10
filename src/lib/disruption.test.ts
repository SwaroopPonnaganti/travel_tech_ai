import { describe, it, expect } from "vitest";
import { defaultLegIndex, simulateDisruption } from "./disruption";
import { MIN_TRANSFER_MIN, parseWall, planItineraries } from "./itinerary";
import { DEMO_SERVICE_DATE } from "./connections";
import { createEmptyTripPlan } from "./planner";
import type { PlannedItinerary, TripPlan } from "./types";

const DATE = DEMO_SERVICE_DATE;
const NOW = new Date("2026-10-10T09:00:00Z");

function plan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    ...createEmptyTripPlan(),
    origin: "Visakhapatnam",
    destination: "Hyderabad",
    departureDate: DATE,
    passengers: 1,
    ...overrides,
  };
}

function allOptions(overrides: Partial<TripPlan> = {}): PlannedItinerary[] {
  const result = planItineraries(plan(overrides), { now: NOW });
  return [...result.feasible, ...result.alternatives];
}

function multiLeg(overrides: Partial<TripPlan> = {}): PlannedItinerary {
  const it = allOptions(overrides).find((i) => i.legs > 1);
  if (!it) throw new Error("expected a multi-leg itinerary in the simulated dataset");
  return it;
}

function direct(overrides: Partial<TripPlan> = {}): PlannedItinerary {
  const it = allOptions(overrides).find((i) => i.legs === 1);
  if (!it) throw new Error("expected a direct itinerary in the simulated dataset");
  return it;
}

describe("defaultLegIndex", () => {
  it("targets the first leg, first transfer and last leg per kind", () => {
    const it = multiLeg();
    expect(defaultLegIndex("bus-delay", it)).toBe(0);
    expect(defaultLegIndex("bus-cancellation", it)).toBe(0);
    expect(defaultLegIndex("missed-connection", it)).toBe(1);
    expect(defaultLegIndex("last-mile-unavailable", it)).toBe(it.legs - 1);
  });

  it("falls back to the only leg when there is no transfer", () => {
    const it = direct();
    expect(defaultLegIndex("missed-connection", it)).toBe(0);
  });
});

describe("simulateDisruption — bus delay", () => {
  it("recalculates the remaining journey and marks everything simulated", () => {
    const original = direct();
    const sim = simulateDisruption(original, plan(), "bus-delay", { delayMin: 120, now: NOW });

    expect(sim.simulated).toBe(true);
    expect(sim.event.simulated).toBe(true);
    expect(sim.event.kind).toBe("bus-delay");
    expect(sim.event.severity).toBe("warning");
    expect(sim.event.delayMin).toBe(120);
    expect(sim.event.legIndex).toBe(0);
    expect(sim.recalculation).toContain("Re-planning");

    expect(sim.revised.length).toBeGreaterThan(0);
    for (const r of sim.revised) {
      expect(r.itinerary.simulated).toBe(true);
      expect(r.itinerary.from).toBe(original.from);
      expect(r.itinerary.to).toBe(original.to);
      expect(r.itinerary.totalFare).toBe(r.itinerary.fare * r.itinerary.passengers);
      expect(Number.isFinite(r.additionalCost)).toBe(true);
      expect(Number.isFinite(r.addedDelayMin)).toBe(true);
      expect(r.tradeoffs.length).toBeGreaterThan(0);
    }
  });

  it("keeps the untouched prefix of a multi-leg journey", () => {
    const original = multiLeg();
    const sim = simulateDisruption(original, plan(), "bus-delay", { legIndex: 1, delayMin: 60, now: NOW });
    expect(sim.affected.index).toBe(1);
    for (const r of sim.revised) {
      expect(r.preservedLegs).toBe(1);
      expect(r.itinerary.connections[0]!.id).toBe(original.connections[0]!.id);
    }
  });
});

describe("simulateDisruption — bus cancellation recovery", () => {
  it("removes the cancelled connection and finds replacement options", () => {
    const original = direct();
    const cancelledId = original.connections[0]!.id;
    const sim = simulateDisruption(original, plan(), "bus-cancellation", { now: NOW });

    expect(sim.event.kind).toBe("bus-cancellation");
    expect(sim.event.severity).toBe("critical");
    expect(sim.event.delayMin).toBeNull();
    expect(sim.revised.length).toBeGreaterThan(0);
    expect(sim.explanation).toContain("simulated");

    for (const r of sim.revised) {
      expect(r.itinerary.connections.some((c) => c.id === cancelledId)).toBe(false);
      expect(r.itinerary.to).toBe(original.to);
    }
    expect(sim.revised.some((r) => r.feasible)).toBe(true);
  });

  it("re-checks the budget for each recovery option", () => {
    const original = direct();
    const sim = simulateDisruption(original, plan({ maxBudget: 100 }), "bus-cancellation", { now: NOW });
    for (const r of sim.revised) {
      expect(r.withinBudget).toBe(r.itinerary.totalFare <= 100);
      if (!r.withinBudget) {
        expect(r.tradeoffs.some((t) => t.includes("Over budget"))).toBe(true);
      }
    }
  });
});

describe("simulateDisruption — missed connection", () => {
  it("respects the minimum transfer time on every feasible recovery", () => {
    const original = multiLeg();
    const missedId = original.connections[1]!.id;
    const sim = simulateDisruption(original, plan(), "missed-connection", {
      legIndex: 1,
      delayMin: 150,
      now: NOW,
    });

    expect(sim.event.kind).toBe("missed-connection");
    expect(sim.event.delayMin).toBe(150);
    expect(sim.recalculation).toContain(original.to);

    for (const r of sim.revised) {
      expect(r.itinerary.connections.some((c) => c.id === missedId)).toBe(false);
      for (const t of r.itinerary.transfers) expect(t.waitMin).toBeGreaterThanOrEqual(0);
    }
    for (const r of sim.feasible) {
      for (const t of r.itinerary.transfers) {
        expect(t.waitMin).toBeGreaterThanOrEqual(MIN_TRANSFER_MIN);
      }
    }
  });

  it("reports no transfer to miss on a direct journey", () => {
    const sim = simulateDisruption(direct(), plan(), "missed-connection", { now: NOW });
    expect(sim.noAlternative).toBe(true);
    expect(sim.revised).toHaveLength(0);
    expect(sim.explanation).toContain("no connection to miss");
  });
});

describe("simulateDisruption — last-mile transport unavailable", () => {
  it("recovers by replacing the unavailable final leg", () => {
    const original = multiLeg();
    const lastId = original.connections[original.connections.length - 1]!.id;
    const sim = simulateDisruption(original, plan(), "last-mile-unavailable", { now: NOW });

    expect(sim.affected.index).toBe(original.legs - 1);
    expect(sim.event.delayMin).toBeNull();
    for (const r of sim.revised) {
      expect(r.itinerary.connections.some((c) => c.id === lastId)).toBe(false);
      expect(r.itinerary.to).toBe(original.to);
    }
  });

  it("returns a clear no-alternative result when the destination is unreachable", () => {
    const original = direct();
    const sim = simulateDisruption(original, plan(), "last-mile-unavailable", {
      connections: [],
      now: NOW,
    });
    expect(sim.noAlternative).toBe(true);
    expect(sim.revised).toHaveLength(0);
    expect(sim.explanation).toContain("No simulated recovery option");
    expect(sim.explanation).toContain(original.to);
  });
});

describe("simulateDisruption — constraints", () => {
  it("flags recovery options that miss the arrival deadline", () => {
    const original = direct();
    const sim = simulateDisruption(original, plan({ arrivalDate: DATE, arrivalTime: "06:00" }), "bus-cancellation", {
      now: NOW,
    });
    for (const r of sim.revised) {
      expect(r.meetsArrivalDeadline).toBe(parseWall(r.itinerary.arrive) <= parseWall(`${DATE}T06:00:00`));
      if (!r.meetsArrivalDeadline) {
        expect(r.tradeoffs.some((t) => t.includes("deadline"))).toBe(true);
      }
    }
  });
});
