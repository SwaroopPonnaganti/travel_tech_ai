import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Zap, PlaneTakeoff, CheckCircle2, AlertTriangle, CloudRain, Ban, ArrowRight, Clock, Activity } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState } from "../components/ui/EmptyState";
import { ItineraryCard } from "../components/ItineraryCard";
import { disruptions as seed, itineraries } from "../lib/mock";
import type { Disruption } from "../lib/types";
import { scoreItineraries } from "../lib/compare";
import { relativeTime } from "../lib/format";
import { useSettings } from "../state/SettingsContext";

const FILTERS = [
  { value: "active" as const, label: "Active" },
  { value: "all" as const, label: "All" },
  { value: "resolved" as const, label: "Resolved" },
];

const KIND_ICON = {
  delay: Clock,
  cancellation: Ban,
  weather: CloudRain,
  strike: AlertTriangle,
  health: ShieldAlert,
};

const severityTone = { info: "navy", warning: "amber", critical: "rose" } as const;

export function DisruptionsPage() {
  const { t, announce } = useSettings();
  const navigate = useNavigate();
  const [items, setItems] = useState<Disruption[]>(seed);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("active");
  const [handled, setHandled] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "resolved") return items.filter((d) => d.resolved);
    return items.filter((d) => !d.resolved);
  }, [items, filter]);

  const alternatives = useMemo(() => scoreItineraries(itineraries, "safest").slice(0, 2), []);

  function simulate(kind: "delay" | "cancellation") {
    const id = `dis-${Date.now()}`;
    const now = new Date().toISOString();
    const record: Disruption =
      kind === "delay"
        ? {
            id,
            tripId: "trip-1",
            title: "6E-2145 delayed by 90 minutes",
            detail: "Simulated disruption injected for the demo. RoamAgent is re-scoring alternatives.",
            severity: "warning",
            kind: "delay",
            createdAt: now,
            resolved: false,
          }
        : {
            id,
            tripId: "trip-1",
            title: "6E-2145 cancelled by operator",
            detail: "Simulated cancellation. Full refund or free rebooking on the next reliable option.",
            severity: "critical",
            kind: "cancellation",
            createdAt: now,
            resolved: false,
          };
    setItems((prev) => [record, ...prev]);
    setFilter("active");
    setStatus(`New ${kind} injected for TBS-4821. RoamAgent is preparing recovery options.`);
    announce(`New ${kind} detected`);
  }

  function recover(id: string) {
    setHandled((prev) => [...prev, id]);
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, resolved: true } : d)));
    setStatus("Recovery accepted. New itinerary confirmed and passengers notified by email + SMS.");
    announce("Recovery accepted");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldAlert className="h-5 w-5" />}
        title={t("nav.disruptions")}
        description="RoamAgent watches operator feeds, weather and safety advisories, then proposes recovery actions automatically."
        action={
          <SegmentedControl
            name="Disruption filter"
            value={filter}
            onChange={setFilter}
            options={FILTERS}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Zap className="h-4 w-4" />} onClick={() => simulate("delay")}>
          Simulate delay
        </Button>
        <Button variant="danger" icon={<PlaneTakeoff className="h-4 w-4" />} onClick={() => simulate("cancellation")}>
          Simulate cancellation
        </Button>
        <Button variant="ghost" icon={<Activity className="h-4 w-4" />} onClick={() => navigate("/simulator")}>
          {t("nav.simulator")}
        </Button>
      </div>

      {status && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
          <p className="text-sm text-teal-100">{status}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="All clear"
              description="No disruptions match this filter. RoamAgent keeps monitoring in the background."
            />
          ) : (
            filtered.map((d) => {
              const Icon = KIND_ICON[d.kind];
              const isHandled = handled.includes(d.id) || d.resolved;
              return (
                <article key={d.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        d.severity === "critical"
                          ? "bg-rose-500/15 text-rose-300"
                          : d.severity === "warning"
                            ? "bg-amber-400/15 text-amber-300"
                            : "bg-navy-500/25 text-slate-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-white">{d.title}</h3>
                        <Badge tone={severityTone[d.severity]}>{d.severity}</Badge>
                        {isHandled && <Badge tone="teal">resolved</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{d.detail}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.tripId ? `Trip ${d.tripId}` : "Network-wide"} · {relativeTime(d.createdAt)}
                      </p>
                      {!isHandled && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => recover(d.id)}>
                            Accept recovery
                          </Button>
                          <Button variant="ghost" onClick={() => setHandled((prev) => [...prev, d.id])}>
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <Card title="Suggested alternatives" subtitle="Ranked by safety for the affected trip" className="h-fit">
          <div className="space-y-3">
            {alternatives.map((row) => (
              <div key={row.itinerary.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-sm font-medium text-slate-100">{row.itinerary.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Safety {row.itinerary.safetyScore}/100 · {row.itinerary.reliabilityPct}% on time
                </p>
                {row.reasons[0] && (
                  <p className="mt-1 text-xs text-teal-300">{row.reasons[0]}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {alternatives[0] && <ItineraryCard itinerary={alternatives[0].itinerary} compact />}
          </div>
        </Card>
      </div>
    </div>
  );
}
