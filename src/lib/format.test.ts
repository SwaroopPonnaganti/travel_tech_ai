import { describe, it, expect } from "vitest";
import { formatMoney, formatDuration, formatDate, initials, clamp } from "./format";

describe("formatMoney", () => {
  it("formats INR by default", () => {
    expect(formatMoney(6480)).toMatch(/6,480/);
  });

  it("formats USD when requested", () => {
    expect(formatMoney(1200, "USD")).toContain("$");
  });
});

describe("formatDuration", () => {
  it("uses hours and minutes", () => {
    expect(formatDuration(75)).toBe("1h 15m");
  });

  it("omits zero units", () => {
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(45)).toBe("45m");
  });

  it("guards invalid input", () => {
    expect(formatDuration(-5)).toBe("—");
    expect(formatDuration(Number.NaN)).toBe("—");
  });
});

describe("formatDate", () => {
  it("returns an em dash for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats a valid ISO date", () => {
    expect(formatDate("2026-10-18")).toMatch(/2026/);
  });
});

describe("initials", () => {
  it("takes the first two initials", () => {
    expect(initials("Swaroop Ponnaganti")).toBe("SP");
    expect(initials("madonna")).toBe("M");
  });
});

describe("clamp", () => {
  it("clamps within bounds", () => {
    expect(clamp(12, 1, 9)).toBe(9);
    expect(clamp(-2, 1, 9)).toBe(1);
    expect(clamp(5, 1, 9)).toBe(5);
  });
});
