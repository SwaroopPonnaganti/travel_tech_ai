import { describe, it, expect } from "vitest";
import {
  canonicalCity,
  comfortLabel,
  datasetInfo,
  deriveTransfers,
  filterItineraries,
  MIN_TRANSFER_MIN,
  parseWall,
  planItineraries,
  sortItineraries,
} from "./itinerary";
import { connectionsForDate, datasetCities, DEMO_SERVICE_DATE } from "./connections";
import { createEmptyTripPlan } from "./planner";
import type { ItineraryFilters, TripPlan } from "./types";

const DATE = DEMO_SERVICE_DATE;
const NOW = new Date("2026-10-10T09:00:00Z");

function plan(overrides: Partial<TripPlan> = {}): TripPlan {
  return { ...createEmptyTripPlan(), origin: "Visakhapatnam", destination: "Hyderabad", departureDate: DATE, passengers: 1, ...overrides };
}

const NO_FILTERS: ItineraryFilters = {
  maxPrice: null,
  maxDurationMin: null,
  modes: [],
  coachClass: null,
  deadlineOnly: false,
  directOnly: false,
  availabilityOnly: false,
};

describe("canonicalCity", () => {
  it("matches dataset cities case-insensitively", () => {
    expect(canonicalCity("hyderabad")).toBe("Hyderabad");
    expect(canonicalCity(" Visakhapatnam ")).toBe("Visakhapatnam");
  });

  it("resolves common aliases", () => {
    expect(canonicalCity("vizag")).toBe("Visakhapatnam");
    expect(canonicalCity("bangalore")).toBe("Bengaluru");
  });

  it("returns null for unknown cities", () => {
    expect(canonicalCity("Atlantis")).toBeNull();
    expect(canonicalCity(null)).toBeNull();
  });
});

describe("connectionsForDate", () => {
  it("materialises dated, simulated connections with a source and timestamp", () => {
    const conns = connectionsForDate(DATE);
    expect(conns.length).toBeGreaterThan(20);
    for (const c of conns) {
      expect(c.simulated).toBe(true);
      expect(c.source).toContain("Simulated");
      expect(c.updatedAt).toBeTruthy();
      expect(c.depart.startsWith(DATE)).toBe(true);
      expect(parseWall(c.arrive)).toBeGreaterThan(parseWall(c.depart));
      expect(c.durationMin).toBeGreaterThan(0);
    }
  });
});

describe("planItineraries — feasible routes", () => {
  it("finds both direct and multi-leg options for Visakhapatnam → Hyderabad", () => {
    const result = planItineraries(plan(), { now: NOW });
    expect(result.simulated).toBe(true);
    expect(result.dataset.simulated).toBe(true);
    expect(result.feasible.length).toBeGreaterThan(0);

    const direct = result.feasible.filter((i) => i.legs === 1);
    const multi = result.feasible.filter((i) => i.legs > 1);
    expect(direct.length).toBeGreaterThan(0);
    expect(multi.length).toBeGreaterThan(0);

    for (const it of [...result.feasible, ...result.alternatives]) {
      expect(it.from).toBe("Visakhapatnam");
      expect(it.to).toBe("Hyderabad");
      expect(it.simulated).toBe(true);
      for (const c of it.connections) expect(c.simulated).toBe(true);
      for (const t of it.transfers) expect(t.waitMin).toBeGreaterThanOrEqual(MIN_TRANSFER_MIN);
      expect(it.totalFare).toBe(it.fare * it.passengers);
      expect(it.totalDurationMin).toBeGreaterThanOrEqual(it.travelDurationMin);
    }
  });

  it("does not invent an itinerary when the route is unknown", () => {
    const result = planItineraries(plan({ destination: "Jaipur" }), { now: NOW });
    expect(result.feasible).toHaveLength(0);
    expect(result.alternatives).toHaveLength(0);
    expect(result.explanation).toContain("no simulated schedules");
    expect(result.explanation).toContain("Visakhapatnam");
  });
});

describe("planItineraries — constraint validation", () => {
  it("classifies over-budget journeys as labelled alternatives", () => {
    const result = planItineraries(plan({ maxBudget: 600 }), { now: NOW });
    expect(result.feasible).toHaveLength(0);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives.every((a) => a.relaxations.some((r) => r.includes("Over budget")))).toBe(true);
    expect(result.explanation).toContain("Over budget");
  });

  it("rejects sold-out connections", () => {
    const result = planItineraries(plan(), { now: NOW });
    expect(result.rejections.some((r) => r.reason.includes("sold out"))).toBe(true);
    for (const it of [...result.feasible, ...result.alternatives]) {
      expect(it.connections.every((c) => c.availability !== "sold-out")).toBe(true);
    }
  });

  it("rejects connections that lack seats for the party", () => {
    const result = planItineraries(plan({ passengers: 4 }), { now: NOW });
    expect(result.rejections.some((r) => r.reason.includes("seat(s) left"))).toBe(true);
    for (const it of [...result.feasible, ...result.alternatives]) {
      for (const c of it.connections) {
        if (c.seatsLeft !== null) expect(c.seatsLeft).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("rejects transfers shorter than the minimum connection time", () => {
    const result = planItineraries(plan(), { now: NOW });
    const tooShort = result.rejections.filter((r) => r.reason.includes("minimum connection time"));
    expect(tooShort.length).toBeGreaterThan(0);
    expect(tooShort.some((r) => r.reason.includes("Vijayawada"))).toBe(true);
  });

  it("rejects connections that do not support required accessibility", () => {
    const result = planItineraries(plan({ accessibility: ["wheelchair"] }), { now: NOW });
    expect(result.rejections.some((r) => r.reason.includes("does not support: wheelchair"))).toBe(true);
    for (const it of result.feasible) {
      for (const c of it.connections) expect(c.accessible).toContain("wheelchair");
    }
  });

  it("honours an arrival deadline and flags late alternatives", () => {
    const onTime = planItineraries(plan({ arrivalDate: DATE, arrivalTime: "18:00" }), { now: NOW });
    expect(onTime.feasible.length).toBeGreaterThan(0);
    const compliant = onTime.feasible.filter((i) => i.meetsArrivalDeadline);
    expect(compliant.length).toBeGreaterThan(0);
    expect(compliant[0]!.arrivalSlackMin).toBeGreaterThanOrEqual(0);

    const tooLate = planItineraries(plan({ arrivalDate: DATE, arrivalTime: "08:00" }), { now: NOW });
    expect(tooLate.feasible.filter((i) => i.meetsArrivalDeadline)).toHaveLength(0);
    expect(tooLate.alternatives.some((a) => a.relaxations.some((r) => r.includes("after your deadline")))).toBe(true);
  });

  it("limits the departure window and labels out-of-window options", () => {
    const result = planItineraries(plan({ departureWindow: "morning" }), { now: NOW });
    for (const it of result.feasible) {
      const hour = Number(it.depart.slice(11, 13));
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThan(12);
    }
  });
});

describe("deriveTransfers", () => {
  it("computes wait, location and risk for each stop", () => {
    const conns = connectionsForDate(DATE).filter((c) => ["vz-bza-1", "bza-hyd-3"].includes(c.id));
    const transfers = deriveTransfers(conns);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]!.location).toContain("Vijayawada");
    expect(transfers[0]!.waitMin).toBeGreaterThanOrEqual(MIN_TRANSFER_MIN);
    expect(["low", "medium", "high"]).toContain(transfers[0]!.risk);
  });
});

describe("comfort labels", () => {
  it("summarises mixed coach classes", () => {
    const conns = connectionsForDate(DATE).filter((c) => ["vz-bza-1", "bza-hyd-3"].includes(c.id));
    expect(comfortLabel(conns)).toBe("Standard + Sleeper");
  });
});

describe("sorting and filtering", () => {
  const result = planItineraries(plan(), { now: NOW });
  const all = [...result.feasible, ...result.alternatives];

  it("sorts by price ascending", () => {
    const sorted = sortItineraries(all, "price");
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]!.totalFare).toBeGreaterThanOrEqual(sorted[i - 1]!.totalFare);
    }
  });

  it("sorts by duration ascending", () => {
    const sorted = sortItineraries(all, "duration");
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]!.totalDurationMin).toBeGreaterThanOrEqual(sorted[i - 1]!.totalDurationMin);
    }
  });

  it("sorts by arrival time ascending", () => {
    const sorted = sortItineraries(all, "arrival");
    for (let i = 1; i < sorted.length; i += 1) {
      expect(parseWall(sorted[i]!.arrive)).toBeGreaterThanOrEqual(parseWall(sorted[i - 1]!.arrive));
    }
  });

  it("filters to direct-only journeys", () => {
    const direct = filterItineraries(all, { ...NO_FILTERS, directOnly: true });
    expect(direct.length).toBeGreaterThan(0);
    expect(direct.every((i) => i.transfers.length === 0)).toBe(true);
  });

  it("filters by maximum price", () => {
    const cheap = filterItineraries(all, { ...NO_FILTERS, maxPrice: 1200 });
    expect(cheap.every((i) => i.totalFare <= 1200)).toBe(true);
  });
});

describe("dataset metadata", () => {
  it("exposes the simulated dataset label and cities", () => {
    expect(datasetInfo().simulated).toBe(true);
    expect(datasetInfo().note).toContain("Simulated");
    expect(datasetCities()).toContain("Visakhapatnam");
    expect(datasetCities()).toContain("Hyderabad");
  });
});
