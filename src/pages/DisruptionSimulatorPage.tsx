import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Ban,
  Clock,
  Database,
  Info,
  MapPinOff,
  RotateCcw,
  ShieldAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Field, Select } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { PlannedItineraryCard } from "../components/planner/PlannedItineraryCard";
import { createEmptyTripPlan } from "../lib/planner";
import { planItineraries } from "../lib/itinerary";
import { defaultLegIndex, simulateDisruption } from "../lib/disruption";
import { DEMO_SERVICE_DATE } from "../lib/connections";
import { formatDate, formatDuration, formatMoney, formatTime } from "../lib/format";
import { cn } from "../lib/cn";
import { useSettings } from "../state/SettingsContext";
import type {
  DisruptionKind,
  DisruptionSimulation,
  PlannedItinerary,
  TripPlan,
} from "../lib/types";

const today = new Date().toISOString().slice(0, 10);

const KINDS: Array<{ value: DisruptionKind; icon: LucideIcon }> = [
  { value: "bus-delay", icon: Clock },
  { value: "bus-cancellation", icon: Ban },
  { value: "missed-connection", icon: AlertTriangle },
  { value: "last-mile-unavailable", icon: MapPinOff },
];

const DELAY_KINDS: DisruptionKind[] = ["bus-delay", "missed-connection"];
const DELAY_OPTIONS = [30, 60, 90, 120, 180, 240];

const severityTone = { info: "navy", warning: "amber", critical: "rose" } as const;

function demoPlan(): TripPlan {
  return {
    ...createEmptyTripPlan(),
    origin: "Visakhapatnam",
    destination: "Hyderabad",
    departureDate: DEMO_SERVICE_DATE,
    passengers: 1,
  };
}

export function DisruptionSimulatorPage() {
  const { settings, t, announce } = useSettings();
  const location = useLocation();
  const plan = ((location.state as { plan?: TripPlan } | null)?.plan ?? demoPlan()) as TripPlan;
  const hour12 = settings.timeFormat === "12h";

  const result = useMemo(() => planItineraries(plan, { date: plan.departureDate ?? today }), [plan]);
  const options = useMemo(
    () => (result.feasible.length > 0 ? result.feasible : result.alternatives),
    [result],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const base: PlannedItinerary | null = options.find((o) => o.id === selectedId) ?? options[0] ?? null;

  const [kind, setKind] = useState<DisruptionKind>("bus-delay");
  const [delayMin, setDelayMin] = useState(90);
  const [legIndex, setLegIndex] = useState(0);
  const [simulation, setSimulation] = useState<DisruptionSimulation | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (base) setLegIndex(defaultLegIndex(kind, base));
  }, [base, kind]);

  function simulate() {
    if (!base) return;
    const sim = simulateDisruption(base, plan, kind, { delayMin, legIndex });
    setSimulation(sim);
    setStatus(
      sim.noAlternative
        ? `${sim.event.label} simulated — no recovery option found.`
        : `${sim.event.label} simulated — ${sim.revised.length} recovery option(s) calculated.`,
    );
    announce(`${sim.event.label} simulated`);
  }

  function reset() {
    setSimulation(null);
    setStatus(null);
    if (base) setLegIndex(defaultLegIndex(kind, base));
  }

  const kindIcon = KINDS.find((k) => k.value === kind)!.icon;
  const KindIcon = kindIcon;
  const best = simulation?.feasible[0] ?? simulation?.revised[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldAlert className="h-5 w-5" />}
        title={t("sim.title")}
        description={t("sim.description")}
        action={
          <Badge tone="violet">
            <Database className="h-3.5 w-3.5" /> {t("plan.dataset.badge")}
          </Badge>
        }
      />

      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
        <p>{t("sim.simulated.banner")}</p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-display text-base font-semibold text-white">
            {plan.origin ?? "—"} <ArrowRight className="inline h-4 w-4 text-teal-300" /> {plan.destination ?? "—"}
          </span>
          <span className="text-slate-400">
            {plan.departureDate ? formatDate(plan.departureDate, settings.language) : t("plan.anyDate")}
          </span>
          <span className="text-slate-400">
            {plan.passengers ?? 1} {t("plan.pax")}
          </span>
          {plan.maxBudget != null && (
            <span className="text-slate-400">
              {t("plan.budget")} {formatMoney(plan.maxBudget, settings.currency)}
            </span>
          )}
          {plan.arrivalDate && (
            <Badge tone="amber">
              {t("plan.arriveBy")} {formatDate(plan.arrivalDate, settings.language)} {plan.arrivalTime ?? ""}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-300">{result.explanation}</p>
      </Card>

      {!base ? (
        <EmptyState
          icon={<Ban className="h-5 w-5" />}
          title={t("sim.empty.title")}
          description={`${result.explanation} ${t("plan.empty.available")}`}
        />
      ) : (
        <>
          <Card title={t("sim.controls.title")} subtitle={t("sim.controls.subtitle")}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t("sim.base.label")}>
                  {(id) => (
                    <Select id={id} value={base.id} onChange={(e) => setSelectedId(e.target.value)}>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.from} → {o.to} · {formatTime(o.depart, hour12)} · {formatMoney(o.totalFare, settings.currency)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={t("sim.delay.label")}>
                  {(id) => (
                    <Select
                      id={id}
                      value={delayMin}
                      disabled={!DELAY_KINDS.includes(kind)}
                      onChange={(e) => setDelayMin(Number(e.target.value))}
                    >
                      {DELAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={t("sim.leg.label")}>
                  {(id) => (
                    <Select id={id} value={legIndex} onChange={(e) => setLegIndex(Number(e.target.value))}>
                      {base.connections.map((c, i) => (
                        <option key={c.id} value={i}>
                          {`Leg ${i + 1}: ${c.operator} ${c.code} · ${c.from} → ${c.to}`}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <div>
                <p className="label">{t("sim.kind.label")}</p>
                <div role="radiogroup" aria-label={t("sim.kind.label")} className="flex flex-wrap gap-2">
                  {KINDS.map(({ value, icon: Icon }) => {
                    const active = kind === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setKind(value)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                          active
                            ? "border-teal-500/60 bg-teal-500/15 text-teal-200"
                            : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5",
                        )}
                      >
                        <Icon className="h-4 w-4" /> {t(`sim.kind.${value}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button icon={<Zap className="h-4 w-4" />} onClick={simulate}>
                  {t("sim.simulate")}
                </Button>
                <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
                  {t("sim.reset")}
                </Button>
              </div>
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-100">{t("sim.base.title")}</h2>
            <PlannedItineraryCard itinerary={base} />
          </section>

          {status && (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <p className="text-sm text-teal-100">{status}</p>
            </div>
          )}

          {!simulation ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title={t("sim.select.title")}
              description={t("sim.select.description")}
            />
          ) : (
            <>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4",
                  simulation.event.severity === "critical"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-amber-500/40 bg-amber-500/10",
                )}
              >
                <KindIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-100" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold text-white">{simulation.event.label}</p>
                    <Badge tone={severityTone[simulation.event.severity]}>{simulation.event.severity}</Badge>
                    <Badge tone="violet">
                      <Database className="h-3.5 w-3.5" /> {t("sim.simulated")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-200">{simulation.event.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{simulation.recalculation}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card title={t("sim.affected.title")} className="lg:col-span-1">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-sm font-medium text-slate-100">
                      {simulation.affected.connection.operator} · {simulation.affected.connection.code}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {simulation.affected.connection.fromStop} {formatTime(simulation.affected.connection.depart, hour12)}{" "}
                      <ArrowRight className="inline h-3 w-3" /> {simulation.affected.connection.toStop}{" "}
                      {formatTime(simulation.affected.connection.arrive, hour12)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("sim.affected.leg")} {simulation.affected.index + 1} / {simulation.original.legs}
                    </p>
                  </div>
                </Card>

                <Card title={t("sim.summary.title")} className="lg:col-span-2">
                  {best ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{t("sim.summary.extraCost")}</p>
                        <p className="font-display text-lg font-bold text-white">
                          {best.additionalCost > 0 ? `+${formatMoney(best.additionalCost, settings.currency)}` : best.additionalCost < 0 ? `−${formatMoney(Math.abs(best.additionalCost), settings.currency)}` : formatMoney(0, settings.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{t("sim.summary.delay")}</p>
                        <p className="font-display text-lg font-bold text-white">
                          {best.addedDelayMin > 0 ? `+${formatDuration(best.addedDelayMin)}` : best.addedDelayMin < 0 ? `−${formatDuration(Math.abs(best.addedDelayMin))}` : t("sim.summary.same")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">{t("sim.summary.deadline")}</p>
                        {best.meetsArrivalDeadline ? (
                          <Badge tone="teal">{t("sim.summary.met")}</Badge>
                        ) : (
                          <Badge tone="rose">{t("sim.summary.missed")}</Badge>
                        )}
                        {best.withinBudget === null ? null : best.withinBudget ? (
                          <Badge tone="teal">{t("sim.summary.within")}</Badge>
                        ) : (
                          <Badge tone="rose">{t("sim.summary.over")}</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">{simulation.explanation}</p>
                  )}
                </Card>
              </div>

              <Card title={t("sim.compare.title")} subtitle={t("sim.compare.subtitle")}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">{t("sim.compare.col.option")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.depart")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.arrive")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.duration")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.fare")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.extra")}</th>
                        <th className="py-2 pr-3">{t("sim.compare.col.transfers")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <td className="py-2 pr-3 font-medium text-slate-200">{t("sim.compare.original")}</td>
                        <td className="py-2 pr-3 text-slate-300">{formatTime(simulation.original.depart, hour12)}</td>
                        <td className="py-2 pr-3 text-slate-300">{formatTime(simulation.original.arrive, hour12)}</td>
                        <td className="py-2 pr-3 text-slate-300">{formatDuration(simulation.original.totalDurationMin)}</td>
                        <td className="py-2 pr-3 text-slate-300">{formatMoney(simulation.original.totalFare, settings.currency)}</td>
                        <td className="py-2 pr-3 text-slate-500">—</td>
                        <td className="py-2 pr-3 text-slate-300">{simulation.original.transfers.length}</td>
                      </tr>
                      {simulation.revised.map((r, i) => (
                        <tr key={r.itinerary.id} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-medium text-slate-200">
                            {t("sim.compare.revised")} {i + 1}
                            {r.feasible && <Badge tone="teal">{t("sim.feasible")}</Badge>}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{formatTime(r.itinerary.depart, hour12)}</td>
                          <td className="py-2 pr-3 text-slate-300">{formatTime(r.itinerary.arrive, hour12)}</td>
                          <td className="py-2 pr-3 text-slate-300">{formatDuration(r.itinerary.totalDurationMin)}</td>
                          <td className="py-2 pr-3 text-slate-300">{formatMoney(r.itinerary.totalFare, settings.currency)}</td>
                          <td className={cn("py-2 pr-3", r.additionalCost > 0 ? "text-rose-300" : r.additionalCost < 0 ? "text-teal-300" : "text-slate-400")}>
                            {r.additionalCost > 0 ? `+${formatMoney(r.additionalCost, settings.currency)}` : r.additionalCost < 0 ? `−${formatMoney(Math.abs(r.additionalCost), settings.currency)}` : formatMoney(0, settings.currency)}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{r.itinerary.transfers.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {simulation.noAlternative ? (
                <EmptyState
                  icon={<MapPinOff className="h-5 w-5" />}
                  title={t("sim.noAlternative.title")}
                  description={simulation.explanation}
                  action={
                    <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
                      {t("sim.reset")}
                    </Button>
                  }
                />
              ) : (
                <section className="space-y-4">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-teal-300">
                    <Zap className="h-4 w-4" /> {t("sim.revised.title")} · {simulation.revised.length}
                  </h2>
                  {simulation.revised.slice(0, 4).map((r, i) => (
                    <div key={r.itinerary.id} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-sm font-semibold text-slate-100">{r.strategy}</h3>
                        <Badge tone={r.feasible ? "teal" : "amber"}>
                          {r.feasible ? t("sim.feasible") : t("sim.alternative")}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {r.tradeoffs.map((tradeoff) => (
                          <li key={tradeoff} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-400" aria-hidden="true" />
                            {tradeoff}
                          </li>
                        ))}
                      </ul>
                      <PlannedItineraryCard itinerary={r.itinerary} rank={i + 1} />
                    </div>
                  ))}
                  {simulation.alternatives.length > 0 && simulation.feasible.length === 0 && (
                    <p className="flex items-center gap-2 text-xs text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5" /> {t("sim.alternatives.hint")}
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5" /> {result.dataset.note}
      </p>
    </div>
  );
}
