import { apiFetch } from "./api";
import {
  createEmptyTripPlan,
  extractTripPlan,
  mergeTripPlan,
  sanitizeTripPlan,
  type ExtractOptions,
} from "./planner";
import type { AgentStatus, PlanExtraction, TripPlan } from "./types";

export const UNKNOWN_AGENT_STATUS: AgentStatus = {
  llmConfigured: false,
  model: null,
  provider: null,
};

/** Queries the proxy for whether a server-side LLM is configured. Never throws. */
export async function getAgentStatus(): Promise<AgentStatus> {
  try {
    return await apiFetch<AgentStatus>("/api/agent/status", { timeoutMs: 3000 });
  } catch {
    return UNKNOWN_AGENT_STATUS;
  }
}

function localISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Asks the server-side LLM to extract a plan. Throws when unavailable. */
export async function requestLlmPlan(message: string, today = new Date()): Promise<TripPlan> {
  const response = await apiFetch<{ plan: unknown }>("/api/agent/plan", {
    method: "POST",
    body: JSON.stringify({ message, today: localISODate(today) }),
    timeoutMs: 20_000,
  });
  return sanitizeTripPlan(response.plan);
}

/**
 * Resolves a trip plan from free text. Uses the LLM when the server reports one
 * is configured; otherwise (or on any failure) it falls back to the deterministic
 * rule parser. LLM values win, rule values fill the gaps.
 */
export async function resolveTripPlan(input: string, options: ExtractOptions = {}): Promise<PlanExtraction> {
  const today = options.today ?? new Date();
  const rule = extractTripPlan(input, { ...options, today });
  if (!input.trim()) return rule;

  let llmPlan: TripPlan | null = null;
  try {
    llmPlan = await requestLlmPlan(input, today);
  } catch {
    llmPlan = null;
  }

  if (!llmPlan || isPlanEmpty(llmPlan)) return rule;

  const merged = mergeTripPlan(llmPlan, rule.plan as Partial<TripPlan>);
  const captured = capturedFor(merged);
  const missing = missingEssential(merged);

  return {
    plan: merged,
    captured,
    missing,
    confidence: Math.min(1, Math.round((0.6 + captured.length * 0.025) * 100) / 100),
    source: "llm",
  };
}

export function isPlanEmpty(plan: TripPlan): boolean {
  return equalPlan(plan, createEmptyTripPlan());
}

function equalPlan(a: TripPlan, b: TripPlan): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function capturedFor(plan: TripPlan): PlanExtraction["captured"] {
  const map: Record<string, unknown> = plan as unknown as Record<string, unknown>;
  const keys: PlanExtraction["captured"] = [];
  for (const key of Object.keys(plan) as Array<keyof TripPlan>) {
    const value = map[key];
    if (Array.isArray(value)) {
      if (value.length) keys.push(key);
    } else if (value && typeof value === "object") {
      keys.push(key);
    } else if (value !== null && value !== "" && value !== undefined) {
      keys.push(key);
    }
  }
  return keys;
}

function missingEssential(plan: TripPlan): PlanExtraction["missing"] {
  const essentials: Array<keyof TripPlan> = ["origin", "destination", "departureDate", "passengers"];
  const map: Record<string, unknown> = plan as unknown as Record<string, unknown>;
  return essentials.filter((key) => {
    const value = map[key];
    return value === null || value === undefined || value === "";
  });
}
