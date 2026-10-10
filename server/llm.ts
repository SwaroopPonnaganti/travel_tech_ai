import type { AgentStatus } from "../src/lib/types";

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Reads the LLM configuration from the environment. The API key never leaves
 * the server — the browser only ever talks to the /api/agent/* proxy routes.
 */
export function getLlmConfig(): LlmConfig | null {
  const apiKey = process.env.ROAMAGENT_LLM_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.ROAMAGENT_LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.ROAMAGENT_LLM_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

export function getAgentStatus(): AgentStatus {
  const config = getLlmConfig();
  if (!config) return { llmConfigured: false, model: null, provider: null };
  let provider = "custom";
  try {
    provider = new URL(config.baseUrl).host;
  } catch {
    /* keep custom */
  }
  return { llmConfigured: true, model: config.model, provider };
}

export class LlmUnavailableError extends Error {
  constructor(message = "LLM is not configured") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

const SYSTEM_PROMPT = `You are RoamAgent, a travel planning assistant for India (buses, trains, flights).
Extract the traveller's requirements from their message and reply with ONLY a JSON object using this exact shape:
{
  "origin": string|null,
  "destination": string|null,
  "departureDate": "YYYY-MM-DD"|null,
  "departureWindow": "early-morning"|"morning"|"afternoon"|"evening"|"night"|null,
  "departureTime": "HH:mm"|null,
  "arrivalDate": "YYYY-MM-DD"|null,
  "arrivalTime": "HH:mm"|null,
  "passengers": number|null,
  "maxBudget": number|null,
  "coachClass": "seater"|"sleeper"|null,
  "accessibility": string[],
  "luggage": { "cabin": number, "checked": number, "special": string|null }|null,
  "firstMile": string|null,
  "lastMile": string|null
}
Rules:
- Never invent a date or requirement the traveller did not state. Use null when unknown.
- Interpret Telugu and English input. Translate Telugu city names to English.
- "passengers" is the number of travellers; use null if unstated.
- "accessibility" may contain: wheelchair, senior, infant, pregnant, vision, hearing, service-animal.
- Reply with JSON only, no markdown fences or commentary.`;

export interface LlmPlanResult {
  raw: unknown;
  model: string;
}

/**
 * Calls an OpenAI-compatible chat completions endpoint and returns the parsed
 * JSON payload produced by the model.
 */
export async function requestLlmPlan(message: string, todayISO: string): Promise<LlmPlanResult> {
  const config = getLlmConfig();
  if (!config) throw new LlmUnavailableError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Today is ${todayISO}. Traveller says: ${message}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`LLM request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned an empty response");

    return { raw: parseJsonContent(content), model: config.model };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM did not return valid JSON");
  }
}
