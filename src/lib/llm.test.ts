import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAgentStatus, resolveTripPlan, UNKNOWN_AGENT_STATUS, requestLlmPlan } from "./llm";
import { ApiError } from "./api";

const TODAY = new Date("2026-10-10T00:00:00");

function okJson(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

function errorJson(status: number, message: string): Response {
  return {
    ok: false,
    status,
    statusText: message,
    json: async () => ({ error: message }),
    text: async () => message,
  } as unknown as Response;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAgentStatus", () => {
  it("returns the server-reported status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ llmConfigured: true, model: "gpt-4o-mini", provider: "api.openai.com" })),
    );
    const status = await getAgentStatus();
    expect(status.llmConfigured).toBe(true);
    expect(status.model).toBe("gpt-4o-mini");
  });

  it("falls back to the unknown status when the endpoint is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await getAgentStatus()).toEqual(UNKNOWN_AGENT_STATUS);
  });
});

describe("requestLlmPlan", () => {
  it("throws when the server reports the LLM is unavailable (501)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorJson(501, "LLM is not configured on this server")));
    await expect(requestLlmPlan("hello", TODAY)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("resolveTripPlan", () => {
  it("uses the rule parser when no LLM is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorJson(501, "LLM is not configured on this server")),
    );
    const result = await resolveTripPlan("from Pune to Mumbai for 2 people tomorrow", { today: TODAY });
    expect(result.source).toBe("rule");
    expect(result.plan.origin).toBe("Pune");
    expect(result.plan.destination).toBe("Mumbai");
    expect(result.plan.passengers).toBe(2);
    expect(result.plan.departureDate).toBe("2026-10-11");
  });

  it("merges an LLM plan and lets LLM values win over the rule parser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okJson({
          plan: {
            origin: "Agra",
            destination: "Delhi",
            departureDate: "2026-11-20",
            departureTime: "07:30",
            passengers: 4,
            maxBudget: 7500,
            coachClass: "seater",
          },
          model: "gpt-4o-mini",
          source: "llm",
        }),
      ),
    );
    const result = await resolveTripPlan("from Pune to Mumbai for 2 people", { today: TODAY });
    expect(result.source).toBe("llm");
    expect(result.plan.origin).toBe("Agra");
    expect(result.plan.destination).toBe("Delhi");
    expect(result.plan.passengers).toBe(4);
    expect(result.plan.departureDate).toBe("2026-11-20");
  });

  it("returns the rule plan untouched for empty input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ plan: { origin: "Agra" } })),
    );
    const result = await resolveTripPlan("   ", { today: TODAY });
    expect(result.source).toBe("rule");
    expect(result.plan.origin).toBeNull();
  });

  it("treats an all-null LLM response as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okJson({ plan: {} })),
    );
    const result = await resolveTripPlan("from Pune to Mumbai", { today: TODAY });
    expect(result.source).toBe("rule");
    expect(result.plan.origin).toBe("Pune");
  });
});
