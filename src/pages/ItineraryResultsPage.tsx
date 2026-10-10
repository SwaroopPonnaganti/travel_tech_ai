import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Database,
  Info,
  Route as RouteIcon,
  SlidersHorizontal,
  ArrowRight,
  Ban,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Field, Input, Select } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { EmptyState } from "../components/ui/EmptyState";
import { PlannedItineraryCard } from "../components/planner/PlannedItineraryCard";
import { createEmptyTripPlan } from "../lib/planner";
import { filterItineraries, planItineraries, sortItineraries } from "../lib/itinerary";
import { DEMO_SERVICE_DATE, datasetCities } from "../lib/connections";
import { formatDate, formatMoney } from "../lib/format";
import { useSettings } from "../state/SettingsContext";
import { DEFAULT_ITINERARY_FILTERS } from "../lib/types";
import type { ItineraryFilters, ItinerarySort, TransportMode, TripPlan } from "../lib/types";

const SORTS: ItinerarySort[] = ["recommended", "price", "duration", "arrival", "departure", "transfers"];
const MODES: TransportMode[] = ["bus", "train", "flight", "cab"];

const today = new Date().toISOString().slice(0, 10);

function demoPlan(): TripPlan {
  return {
    ...createEmptyTripPlan(),
    origin: "Visakhapatnam",
    destination: "Hyderabad",
    departureDate: DEMO_SERVICE_DATE,
    passengers: 1,
  };
}

export function ItineraryResultsPage() {
  const { settings, t } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const plan = ((location.state as { plan?: TripPlan } | null)?.plan ?? demoPlan()) as TripPlan;

  const [sort, setSort] = useState<ItinerarySort>("recommended");
  const [filters, setFilters] = useState<ItineraryFilters>(DEFAULT_ITINERARY_FILTERS);
  const [showMore, setShowMore] = useState(false);

  const result = useMemo(() => planItineraries(plan, { date: plan.departureDate ?? today }), [plan]);

  const feasible = useMemo(
    () => sortItineraries(filterItineraries(result.feasible, filters), sort),
    [result, filters, sort],
  );
  const alternatives = useMemo(
    () => sortItineraries(filterItineraries(result.alternatives, filters), sort),
    [result, filters, sort],
  );
  const total = feasible.length + alternatives.length;

  function toggleMode(mode: TransportMode) {
    setFilters((prev) => ({
      ...prev,
      modes: prev.modes.includes(mode) ? prev.modes.filter((m) => m !== mode) : [...prev.modes, mode],
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<RouteIcon className="h-5 w-5" />}
        title={t("plan.title")}
        description={t("plan.description")}
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
        <p>{t("plan.simulated.banner")}</p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-display text-base font-semibold text-white">
            {plan.origin ?? "—"} <ArrowRight className="inline h-4 w-4 text-teal-300" /> {plan.destination ?? "—"}
          </span>
          <span className="text-slate-400">{plan.departureDate ? formatDate(plan.departureDate, settings.language) : t("plan.anyDate")}</span>
          <span className="text-slate-400">
            {plan.passengers ?? 1} {t("plan.pax")}
          </span>
          {plan.maxBudget != null && (
            <span className="text-slate-400">{t("plan.budget")} {formatMoney(plan.maxBudget, settings.currency)}</span>
          )}
          {plan.coachClass && <Badge tone="navy">{plan.coachClass}</Badge>}
          {plan.arrivalDate && (
            <Badge tone="amber">
              {t("plan.arriveBy")} {formatDate(plan.arrivalDate, settings.language)} {plan.arrivalTime ?? ""}
            </Badge>
          )}
          <Button variant="ghost" className="ml-auto" onClick={() => navigate("/plan")} icon={<Sparkles className="h-4 w-4" />}>
            {t("plan.refine")}
          </Button>
        </div>
        <p className="text-sm text-slate-300">{result.explanation}</p>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          name={t("plan.sort.label")}
          value={sort}
          onChange={setSort}
          options={SORTS.map((s) => ({ value: s, label: t(`plan.sort.${s}`) }))}
        />
        <Button
          variant="ghost"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          {t("plan.filters")}
        </Button>
        <span className="ml-auto text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{total}</span> {t("plan.results")}
        </span>
      </div>

      {showMore && (
        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("plan.filter.maxPrice")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                placeholder="e.g. 8000"
                value={filters.maxPrice ?? ""}
                onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value ? Number(e.target.value) : null }))}
              />
            )}
          </Field>
          <Field label={t("plan.filter.maxDuration")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                step={30}
                placeholder="minutes"
                value={filters.maxDurationMin ?? ""}
                onChange={(e) => setFilters((p) => ({ ...p, maxDurationMin: e.target.value ? Number(e.target.value) : null }))}
              />
            )}
          </Field>
          <Field label={t("plan.filter.coach")}>
            {(id) => (
              <Select
                id={id}
                value={filters.coachClass ?? ""}
                onChange={(e) => setFilters((p) => ({ ...p, coachClass: (e.target.value || null) as ItineraryFilters["coachClass"] }))}
              >
                <option value="">{t("planner.coach.any")}</option>
                <option value="seater">{t("planner.coach.seater")}</option>
                <option value="sleeper">{t("planner.coach.sleeper")}</option>
              </Select>
            )}
          </Field>
          <div className="flex flex-wrap gap-2 self-end">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={filters.modes.includes(m)}
                onClick={() => toggleMode(m)}
                className={`chip ${filters.modes.includes(m) ? "border-teal-500/60 text-teal-200" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <ToggleSwitch label={t("plan.filter.directOnly")} checked={filters.directOnly} onChange={(v) => setFilters((p) => ({ ...p, directOnly: v }))} />
          <ToggleSwitch label={t("plan.filter.deadlineOnly")} checked={filters.deadlineOnly} onChange={(v) => setFilters((p) => ({ ...p, deadlineOnly: v }))} />
          <ToggleSwitch
            label={t("plan.filter.availabilityOnly")}
            checked={filters.availabilityOnly}
            onChange={(v) => setFilters((p) => ({ ...p, availabilityOnly: v }))}
          />
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setFilters(DEFAULT_ITINERARY_FILTERS)}>
              {t("plan.filter.clear")}
            </Button>
          </div>
        </Card>
      )}

      {total === 0 && (
        <EmptyState
          icon={<Ban className="h-5 w-5" />}
          title={t("plan.empty.title")}
          description={`${result.explanation} ${t("plan.empty.available")} ${datasetCities().join(", ")}.`}
          action={
            <Button variant="secondary" onClick={() => setFilters(DEFAULT_ITINERARY_FILTERS)}>
              {t("plan.filter.clear")}
            </Button>
          }
        />
      )}

      {feasible.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-teal-300">
            <Sparkles className="h-4 w-4" /> {t("plan.matches")} · {feasible.length}
          </h2>
          {feasible.map((it, idx) => (
            <PlannedItineraryCard key={it.id} itinerary={it} rank={idx + 1} />
          ))}
        </section>
      )}

      {alternatives.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-amber-300">
              <AlertTriangle className="h-4 w-4" /> {t("plan.alternatives")} · {alternatives.length}
            </h2>
            <p className="text-sm text-slate-400">{t("plan.alternatives.hint")}</p>
          </div>
          {alternatives.map((it, idx) => (
            <PlannedItineraryCard key={it.id} itinerary={it} rank={idx + 1} />
          ))}
        </section>
      )}

      {result.rejections.length > 0 && (
        <Card title={t("plan.rejected.title")} subtitle={t("plan.rejected.subtitle")}>
          <ul className="space-y-2">
            {result.rejections.map((r) => (
              <li key={r.connectionIds.join(">") + r.reason} className="flex items-start gap-2 text-sm text-slate-300">
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                {r.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5" /> {result.dataset.note}
      </p>
    </div>
  );
}
