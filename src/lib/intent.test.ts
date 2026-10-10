import { describe, it, expect } from "vitest";
import { extractBudget, extractTravellers, extractDate, extractPreference, parseTripRequest } from "./intent";

const VOCAB = ["Bengaluru", "Hyderabad", "Chennai", "Mumbai", "Kochi"] as const;

describe("extractBudget", () => {
  it("reads a plain rupee amount", () => {
    expect(extractBudget("budget ₹6000 for the trip")).toBe(6000);
  });

  it("expands k suffix", () => {
    expect(extractBudget("under 8k")).toBe(8000);
  });

  it("returns null without a budget signal", () => {
    expect(extractBudget("hello there")).toBeNull();
  });
});

describe("extractTravellers", () => {
  it("reads numeric pax", () => {
    expect(extractTravellers("for 3 people")).toBe(3);
  });

  it("reads worded counts", () => {
    expect(extractTravellers("traveling with two of us")).toBe(2);
  });

  it("defaults to one", () => {
    expect(extractTravellers("just a trip")).toBe(1);
  });
});

describe("extractDate", () => {
  const today = new Date("2026-10-10T00:00:00Z");

  it("handles tomorrow", () => {
    expect(extractDate("leaving tomorrow", today)).toBe("2026-10-11");
  });

  it("handles next weekend", () => {
    expect(extractDate("next weekend", today)).toBe("2026-10-17");
  });

  it("handles explicit ISO dates", () => {
    expect(extractDate("on 2026-12-01", today)).toBe("2026-12-01");
  });
});

describe("extractPreference", () => {
  it("detects cheapest", () => {
    expect(extractPreference("i want the cheapest option").pref).toBe("cheapest");
  });

  it("detects safety", () => {
    expect(extractPreference("a safe trip for family").pref).toBe("safest");
  });
});

describe("parseTripRequest", () => {
  const today = new Date("2026-10-10T00:00:00Z");

  it("extracts a full request", () => {
    const req = parseTripRequest(
      "I need a cheap trip from Bengaluru to Hyderabad next weekend for 2 people under 6000",
      VOCAB,
      today,
    );
    expect(req.from).toBe("Bengaluru");
    expect(req.to).toBe("Hyderabad");
    expect(req.travellers).toBe(2);
    expect(req.budget).toBe(6000);
    expect(req.pref).toBe("cheapest");
    expect(req.date).toBe("2026-10-17");
    expect(req.confidence).toBeGreaterThan(0.5);
  });

  it("falls back to vocabulary detection", () => {
    const req = parseTripRequest("thinking about Chennai", VOCAB, today);
    expect(req.to === "Chennai" || req.from === "Chennai").toBe(true);
  });
});
