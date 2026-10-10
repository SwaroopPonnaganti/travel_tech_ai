import { describe, it, expect } from "vitest";
import { respondToMessage } from "./chat";

describe("respondToMessage", () => {
  it("greets the user", () => {
    const reply = respondToMessage("hello there");
    expect(reply.text.toLowerCase()).toContain("roamagent");
    expect(reply.chips?.length).toBeGreaterThan(0);
  });

  it("recognises disruption questions", () => {
    const reply = respondToMessage("my flight is delayed, what are my options?");
    expect(reply.text).toMatch(/disruption|rebook|lane|alert/i);
  });

  it("returns a structured request for a travel query", () => {
    const reply = respondToMessage("plan a cheap weekend trip from Bengaluru to Hyderabad for 2 under 6000");
    expect(reply.request).toBeDefined();
    expect(reply.request?.from).toBe("Bengaluru");
    expect(reply.request?.to).toBe("Hyderabad");
    expect(reply.text).toMatch(/top picks/i);
  });

  it("asks for more info on empty input", () => {
    const reply = respondToMessage("   ");
    expect(reply.text).toMatch(/where you want to go/i);
  });
});
