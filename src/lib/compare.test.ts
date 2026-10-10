import { describe, it, expect } from "vitest";
import { scoreItineraries, totalDuration, preferenceLabel } from "./compare";
import { itineraries } from "./mock";

describe("totalDuration", () => {
  it("sums all leg durations", () => {
    expect(totalDuration(itineraries[0]!)).toBe(75);
  });
});

describe("scoreItineraries", () => {
  it("returns empty for no input", () => {
    expect(scoreItineraries([], "balanced")).toEqual([]);
  });

  it("marks exactly one winner and sorts by score", () => {
    const rows = scoreItineraries(itineraries, "balanced");
    expect(rows).toHaveLength(itineraries.length);
    expect(rows.filter((r) => r.winner)).toHaveLength(1);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.score).toBeGreaterThanOrEqual(rows[i]!.score);
    }
  });

  it("favours the cheapest option for the cheapest preference", () => {
    const template = itineraries[0]!;
    const cheap = { ...template, id: "cheap", price: 1000, safetyScore: 50, reliabilityPct: 50, rating: 2, co2Kg: 300 };
    const fast = { ...template, id: "fast", price: 9000, safetyScore: 95, reliabilityPct: 95, rating: 4.6, co2Kg: 100 };
    expect(scoreItineraries([cheap, fast], "cheapest")[0]!.itinerary.id).toBe("cheap");
  });

  it("favours the fastest option for the fastest preference", () => {
    const template = itineraries[0]!;
    const slow = {
      ...template,
      id: "slow",
      price: 1000,
      legs: [{ ...template.legs[0]!, durationMin: 600 }],
    };
    const quick = {
      ...template,
      id: "quick",
      price: 9000,
      legs: [{ ...template.legs[0]!, durationMin: 60 }],
    };
    expect(scoreItineraries([slow, quick], "fastest")[0]!.itinerary.id).toBe("quick");
  });

  it("labels preferences", () => {
    expect(preferenceLabel("safest")).toBe("Safest");
  });
});
