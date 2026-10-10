import { describe, it, expect } from "vitest";
import {
  createEmptyTripPlan,
  extractTripPlan,
  mergeTripPlan,
  missingFields,
  normalizeInput,
  normalizeTelugu,
  plannerQuestion,
  sanitizeTripPlan,
  summarizePlan,
  validateTripPlan,
  capturedFields,
  ESSENTIAL_FIELDS,
} from "./planner";
import type { TripPlan } from "./types";

const TODAY = new Date("2026-10-10T00:00:00");

describe("normalizeTelugu", () => {
  it("reorders the 'from' postposition before the city", () => {
    const out = normalizeTelugu("హైదరాబాద్ నుండి తిరుపతి");
    expect(out).toContain("from hyderabad");
    expect(out).toContain("tirupati");
  });

  it("converts the dative suffix to 'to'", () => {
    const out = normalizeTelugu("తిరుపతికి");
    expect(out).toBe("to tirupati");
  });

  it("leaves pure English untouched", () => {
    expect(normalizeTelugu("from Hyderabad to Chennai")).toBe("from Hyderabad to Chennai");
  });
});

describe("extractTripPlan (English)", () => {
  it("extracts a rich plan from one sentence", () => {
    const { plan } = extractTripPlan(
      "Weekend trip from Hyderabad to Bengaluru for 2 people under ₹6000 in a sleeper coach",
      { today: TODAY },
    );
    expect(plan.origin).toBe("Hyderabad");
    expect(plan.destination).toBe("Bengaluru");
    expect(plan.departureDate).toBe("2026-10-10");
    expect(plan.passengers).toBe(2);
    expect(plan.maxBudget).toBe(6000);
    expect(plan.coachClass).toBe("sleeper");
  });

  it("never invents a date that was not stated", () => {
    const { plan } = extractTripPlan("I want to go from Pune to Mumbai", { today: TODAY });
    expect(plan.departureDate).toBeNull();
  });

  it("maps time-of-day words to a departure window", () => {
    const { plan } = extractTripPlan("leave Chennai in the morning", { today: TODAY });
    expect(plan.departureWindow).toBe("morning");
  });

  it("reads an explicit clock time", () => {
    const { plan } = extractTripPlan("depart Delhi at 6:30 am", { today: TODAY });
    expect(plan.departureTime).toBe("06:30");
    expect(plan.departureWindow).toBe("morning");
  });

  it("captures accessibility needs", () => {
    const { plan } = extractTripPlan("travelling with a wheelchair and an infant", { today: TODAY });
    expect(plan.accessibility).toContain("wheelchair");
    expect(plan.accessibility).toContain("infant");
  });

  it("captures luggage details", () => {
    const { plan } = extractTripPlan("2 checked bags and 1 cabin bag", { today: TODAY });
    expect(plan.luggage).not.toBeNull();
    expect(plan.luggage?.checked).toBe(2);
    expect(plan.luggage?.cabin).toBe(1);
  });
});

describe("extractTripPlan (Telugu)", () => {
  it("extracts route, date, passengers and accessibility", () => {
    const { plan } = extractTripPlan("హైదరాబాద్ నుండి తిరుపతి రేపు ఉదయం 4 మంది, వీల్‌చైర్ కావాలి", {
      today: TODAY,
    });
    expect(plan.origin).toBe("Hyderabad");
    expect(plan.destination).toBe("Tirupati");
    expect(plan.departureDate).toBe("2026-10-11");
    expect(plan.departureWindow).toBe("morning");
    expect(plan.passengers).toBe(4);
    expect(plan.accessibility).toContain("wheelchair");
  });

  it("normalizes input to lowercase English tokens", () => {
    expect(normalizeInput("రేపు")).toBe("tomorrow");
  });
});

describe("captured / missing", () => {
  it("lists the essential fields when the plan is empty", () => {
    const { essential } = missingFields(createEmptyTripPlan());
    expect(essential).toEqual(ESSENTIAL_FIELDS);
  });

  it("reports captured fields", () => {
    const plan: TripPlan = { ...createEmptyTripPlan(), origin: "Pune", passengers: 2 };
    expect(capturedFields(plan)).toEqual(["origin", "passengers"]);
  });
});

describe("mergeTripPlan", () => {
  it("never overwrites values already present in the base plan", () => {
    const base: TripPlan = { ...createEmptyTripPlan(), origin: "Pune", passengers: 2 };
    const merged = mergeTripPlan(base, { origin: "Delhi", destination: "Agra", passengers: 5 });
    expect(merged.origin).toBe("Pune");
    expect(merged.passengers).toBe(2);
    expect(merged.destination).toBe("Agra");
  });

  it("ignores placeholder answers", () => {
    const merged = mergeTripPlan(createEmptyTripPlan(), { destination: "not sure" });
    expect(merged.destination).toBeNull();
  });
});

describe("sanitizeTripPlan", () => {
  it("coerces valid values and drops invalid ones", () => {
    const plan = sanitizeTripPlan({
      origin: "  Kochi ",
      destination: 42,
      departureDate: "2026-12-01",
      departureTime: "7:00 pm",
      passengers: "3",
      maxBudget: "8000",
      coachClass: "sleeper",
      accessibility: ["wheelchair", "bogus", 7],
      luggage: { cabin: "1", checked: 2 },
    });
    expect(plan.origin).toBe("Kochi");
    expect(plan.destination).toBeNull();
    expect(plan.departureTime).toBe("19:00");
    expect(plan.passengers).toBe(3);
    expect(plan.maxBudget).toBe(8000);
    expect(plan.coachClass).toBe("sleeper");
    expect(plan.accessibility).toEqual(["wheelchair"]);
    expect(plan.luggage).toEqual({ cabin: 1, checked: 2, special: null });
  });

  it("returns an empty plan for non-objects", () => {
    expect(sanitizeTripPlan(null)).toEqual(createEmptyTripPlan());
  });
});

describe("validateTripPlan", () => {
  it("flags missing essentials and past dates", () => {
    const result = validateTripPlan(createEmptyTripPlan(), new Date("2026-10-10T00:00:00"));
    expect(result.ok).toBe(false);
    expect(result.errors.origin).toBeDefined();
    expect(result.errors.destination).toBeDefined();
    expect(result.errors.departureDate).toBeDefined();
    expect(result.errors.passengers).toBeDefined();
  });

  it("accepts a complete, coherent plan", () => {
    const plan: TripPlan = {
      ...createEmptyTripPlan(),
      origin: "Hyderabad",
      destination: "Bengaluru",
      departureDate: "2026-12-01",
      passengers: 2,
    };
    expect(validateTripPlan(plan, new Date("2026-10-10T00:00:00")).ok).toBe(true);
  });

  it("rejects identical origin and destination", () => {
    const plan: TripPlan = {
      ...createEmptyTripPlan(),
      origin: "Pune",
      destination: "Pune",
      departureDate: "2026-12-01",
      passengers: 1,
    };
    const result = validateTripPlan(plan, new Date("2026-10-10T00:00:00"));
    expect(result.errors.destination).toBe("planner.error.sameCity");
  });

  it("rejects arrival before departure on the same date", () => {
    const plan: TripPlan = {
      ...createEmptyTripPlan(),
      origin: "Pune",
      destination: "Mumbai",
      departureDate: "2026-12-01",
      departureTime: "18:00",
      arrivalDate: "2026-12-01",
      arrivalTime: "10:00",
      passengers: 1,
    };
    const result = validateTripPlan(plan, new Date("2026-10-10T00:00:00"));
    expect(result.errors.arrivalTime).toBe("planner.error.arrivalTimeBeforeDeparture");
  });
});

describe("plannerQuestion & summarizePlan", () => {
  it("asks for the first missing field in English", () => {
    const q = plannerQuestion("origin", createEmptyTripPlan(), "en");
    expect(q).toMatch(/city/i);
  });

  it("asks in Telugu when requested", () => {
    const q = plannerQuestion("passengers", createEmptyTripPlan(), "te");
    expect(q).toContain("ఎంతమంది");
  });

  it("summarizes a plan", () => {
    const plan: TripPlan = {
      ...createEmptyTripPlan(),
      origin: "Pune",
      destination: "Mumbai",
      departureDate: "2026-12-01",
      passengers: 2,
      maxBudget: 5000,
    };
    const summary = summarizePlan(plan);
    expect(summary).toContain("Pune → Mumbai");
    expect(summary).toContain("2 passengers");
    expect(summary).toContain("₹5000");
  });
});
