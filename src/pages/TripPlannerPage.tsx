import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Sparkles, Send, Route, Wand2, ShieldCheck, Cpu } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { TripPlanForm } from "../components/planner/TripPlanForm";
import { useSettings } from "../state/SettingsContext";
import {
  createEmptyTripPlan,
  missingFields,
  capturedFields,
  plannerQuestion,
  summarizePlan,
  validateTripPlan,
} from "../lib/planner";
import { getAgentStatus, resolveTripPlan } from "../lib/llm";
import type { AgentStatus, PlanFieldKey, PlanSource, TripPlan } from "../lib/types";

interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const EXAMPLES = [
  "Weekend trip from Hyderabad to Bengaluru for 2 people under ₹6000 in a sleeper coach",
  "Need to reach Chennai airport by 6pm tomorrow from Bengaluru with 3 people and heavy luggage",
  "హైదరాబాద్ నుండి తిరుపతి రేపు ఉదయం 4 మంది, వీల్‌చైర్ కావాలి",
];

let turnId = 0;
const nextTurnId = () => turnId++;

function welcome(): Turn {
  return {
    id: nextTurnId(),
    role: "assistant",
    text:
      "Tell me about your trip in your own words — route, dates, travellers, budget, comfort needs. I'll extract the details into a plan you can review and edit.",
  };
}

export function TripPlannerPage() {
  const { settings, t, announce } = useSettings();
  const navigate = useNavigate();

  const [turns, setTurns] = useState<Turn[]>([welcome()]);
  const [draft, setDraft] = useState("");
  const [plan, setPlan] = useState<TripPlan>(() => createEmptyTripPlan());
  const [captured, setCaptured] = useState<PlanFieldKey[]>([]);
  const [source, setSource] = useState<PlanSource | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getAgentStatus().then((s) => {
      if (active) setStatus(s);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, loading]);

  const { essential, recommended } = useMemo(() => missingFields(plan), [plan]);
  const validation = useMemo(() => validateTripPlan(plan), [plan]);
  const followUp = essential.length > 0 ? plannerQuestion(essential[0]!, plan, settings.language) : null;

  const submit = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text) {
        setError("Please describe your trip before sending.");
        return;
      }
      setError(null);
      setTurns((prev) => [...prev, { id: nextTurnId(), role: "user", text }]);
      setDraft("");
      setLoading(true);

      try {
        const extracted = await resolveTripPlan(text, { language: settings.language });
        const merged: TripPlan = {
          origin: plan.origin ?? extracted.plan.origin,
          destination: plan.destination ?? extracted.plan.destination,
          departureDate: plan.departureDate ?? extracted.plan.departureDate,
          departureWindow: plan.departureWindow ?? extracted.plan.departureWindow,
          departureTime: plan.departureTime ?? extracted.plan.departureTime,
          arrivalDate: plan.arrivalDate ?? extracted.plan.arrivalDate,
          arrivalTime: plan.arrivalTime ?? extracted.plan.arrivalTime,
          passengers: plan.passengers ?? extracted.plan.passengers,
          maxBudget: plan.maxBudget ?? extracted.plan.maxBudget,
          coachClass: plan.coachClass ?? extracted.plan.coachClass,
          accessibility: plan.accessibility.length ? plan.accessibility : extracted.plan.accessibility,
          luggage: plan.luggage ?? extracted.plan.luggage,
          firstMile: plan.firstMile ?? extracted.plan.firstMile,
          lastMile: plan.lastMile ?? extracted.plan.lastMile,
        };

        setPlan(merged);
        setCaptured(capturedFields(merged));
        setSource(extracted.source);
        setConfidence(extracted.confidence);

        const remaining = missingFields(merged).essential;
        const reply =
          remaining.length > 0
            ? plannerQuestion(remaining[0]!, merged, settings.language)
            : `Got it — ${summarizePlan(merged) || "your trip is ready to search"}. Review the details and continue when ready.`;
        setTurns((prev) => [...prev, { id: nextTurnId(), role: "assistant", text: reply }]);
        announce(remaining.length > 0 ? "RoamAgent needs more details" : "Trip plan ready");
      } catch {
        setError("RoamAgent could not extract a plan. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [announce, plan, settings.language],
  );

  function handlePlanChange(next: TripPlan) {
    setPlan(next);
    setCaptured(capturedFields(next));
  }

  function reset() {
    setPlan(createEmptyTripPlan());
    setCaptured([]);
    setSource(null);
    setConfidence(null);
    setShowErrors(false);
    setTurns([welcome()]);
    announce("Trip plan cleared");
  }

  function continueToSearch() {
    setShowErrors(true);
    if (!validation.ok) {
      announce("Please complete the required fields");
      return;
    }
    navigate("/search", {
      state: {
        from: plan.origin,
        to: plan.destination,
        date: plan.departureDate,
        travellers: plan.passengers,
        budget: plan.maxBudget,
      },
    });
  }

  const statusBadge = status?.llmConfigured ? (
    <Badge tone="teal">
      <Sparkles className="h-3.5 w-3.5" /> {t("planner.status.llm.on")}
      {status.model ? ` · ${status.model}` : ""}
    </Badge>
  ) : (
    <Badge tone="amber">
      <Cpu className="h-3.5 w-3.5" /> {t("planner.status.llm.off")}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Route className="h-5 w-5" />}
        title={t("planner.title")}
        description={t("planner.description")}
        action={statusBadge}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            {turns.map((turn) => (
              <div key={turn.id} className={turn.role === "user" ? "text-right" : ""}>
                <div
                  className={
                    turn.role === "assistant"
                      ? "inline-flex max-w-[90%] gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200"
                      : "inline-block max-w-[90%] whitespace-pre-line rounded-2xl bg-teal-500 px-4 py-3 text-left text-sm text-navy-950"
                  }
                >
                  {turn.role === "assistant" && <Bot className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />}
                  <span className="whitespace-pre-line">{turn.text}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Bot className="h-4 w-4 text-teal-300" />
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300 [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-300" />
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3 sm:p-4">
            {error && (
              <p role="alert" className="mb-2 text-sm font-medium text-rose-300">
                {error}
              </p>
            )}
            <div className="mb-2 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => submit(example)}
                  disabled={loading}
                  className="chip text-left hover:border-teal-500/50 disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(draft);
                  }
                }}
                rows={2}
                aria-label={t("planner.ask.placeholder")}
                placeholder={t("planner.ask.placeholder")}
                className="input min-h-[52px] flex-1 resize-none"
              />
              <Button type="submit" loading={loading} icon={<Send className="h-4 w-4" />}>
                {t("planner.ask.button")}
              </Button>
            </form>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Wand2 className="h-4 w-4 text-teal-300" aria-hidden="true" />
              {t("planner.review.title")}
            </h2>
            <div className="flex items-center gap-2">
              {source && (
                <Badge tone={source === "llm" ? "teal" : "neutral"}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {source === "llm" ? t("planner.source.llm") : t("planner.source.rule")}
                </Badge>
              )}
              {confidence !== null && (
                <span className="text-xs text-slate-500">
                  {t("planner.confidence")} {Math.round(confidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {followUp && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {followUp}
            </p>
          )}

          <TripPlanForm
            plan={plan}
            errors={showErrors ? validation.errors : {}}
            captured={captured}
            onChange={handlePlanChange}
            onReset={reset}
            t={t}
          />

          {showErrors && !validation.ok && (
            <p role="alert" className="text-sm font-medium text-rose-300">
              {t("planner.missing.hint")}
            </p>
          )}
          {!showErrors && (recommended.length > 0 || essential.length === 0) && (
            <p className="text-xs text-slate-500">
              {essential.length > 0
                ? t("planner.missing.essentials").replace("{count}", String(essential.length))
                : t("planner.missing.done")}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={continueToSearch} icon={<Route className="h-4 w-4" />}>
              {t("planner.continue")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
