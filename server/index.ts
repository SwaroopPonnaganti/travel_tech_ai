import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import {
  listDisruptions,
  listItineraries,
  listTrips,
  migrate,
  seedIfEmpty,
} from "./db";
import { getAgentStatus, LlmUnavailableError, requestLlmPlan } from "./llm";

function localISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const PORT = Number(process.env.PORT ?? 4000);

migrate();
seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "tbs-roamagent-api", time: new Date().toISOString() });
});

app.get("/api/itineraries", (req: Request, res: Response) => {
  const { from, to, maxPrice } = req.query;
  const max = maxPrice !== undefined ? Number(maxPrice) : undefined;
  if (maxPrice !== undefined && !Number.isFinite(max)) {
    res.status(400).json({ error: "maxPrice must be a number" });
    return;
  }
  const data = listItineraries({
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
    maxPrice: max,
  });
  res.json(data);
});

app.get("/api/trips", (_req: Request, res: Response) => {
  res.json(listTrips());
});

app.get("/api/disruptions", (_req: Request, res: Response) => {
  res.json(listDisruptions());
});

app.post("/api/chat", (req: Request, res: Response) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  res.json({
    reply: `RoamAgent received: "${message}". Live agentic planning endpoints arrive in the next phase.`,
  });
});

app.get("/api/agent/status", (_req: Request, res: Response) => {
  res.json(getAgentStatus());
});

app.post("/api/agent/plan", async (req: Request, res: Response) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (!message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const today =
    typeof req.body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.today)
      ? req.body.today
      : localISODate(new Date());

  if (!getAgentStatus().llmConfigured) {
    res.status(501).json({ error: "LLM is not configured on this server" });
    return;
  }

  try {
    const { raw, model } = await requestLlmPlan(message, today);
    res.json({ plan: raw, model, source: "llm" });
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      res.status(501).json({ error: err.message });
      return;
    }
    const detail = err instanceof Error ? err.message : "LLM request failed";
    res.status(502).json({ error: detail });
  }
});

app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[api-error]", message);
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`TBS RoamAgent API listening on http://localhost:${PORT}`);
});
