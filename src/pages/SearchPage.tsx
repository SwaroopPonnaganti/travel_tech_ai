import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search as SearchIcon, SlidersHorizontal, Info, ArrowRight } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCard } from "../components/ui/Skeleton";
import { ItineraryCard } from "../components/ItineraryCard";
import { Badge } from "../components/ui/Badge";
import { CITIES, itineraries } from "../lib/mock";
import type { TravelPref } from "../lib/types";
import { scoreItineraries, preferenceLabel } from "../lib/compare";
import { formatMoney } from "../lib/format";
import { withFallback } from "../lib/api";
import { useSettings } from "../state/SettingsContext";

interface SearchState {
  from?: string | null;
  to?: string | null;
  date?: string | null;
  travellers?: number;
  budget?: number | null;
  pref?: TravelPref;
}

interface FormErrors {
  from?: string;
  to?: string;
  date?: string;
  travellers?: string;
  budget?: string;
}

const today = new Date().toISOString().slice(0, 10);

export function SearchPage() {
  const { settings, t, announce } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state ?? {}) as SearchState;

  const [from, setFrom] = useState(prefill.from ?? CITIES[0]);
  const [to, setTo] = useState(prefill.to ?? CITIES[1]);
  const [date, setDate] = useState(prefill.date ?? today);
  const [travellers, setTravellers] = useState(prefill.travellers ?? 1);
  const [budget, setBudget] = useState<string>(prefill.budget ? String(prefill.budget) : "");
  const [pref, setPref] = useState<TravelPref>(prefill.pref ?? "balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "demo" | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<typeof itineraries>([]);

  const availableTo = useMemo(() => CITIES.filter((c) => c !== from), [from]);

  useEffect(() => {
    if (to === from) setTo(availableTo[0] ?? "");
  }, [from, to, availableTo]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!from) next.from = "Origin is required.";
    if (!to) next.to = "Destination is required.";
    if (from && to && from === to) next.to = "Origin and destination must differ.";
    if (!date) next.date = "Pick a travel date.";
    else if (date < today) next.date = "Travel date cannot be in the past.";
    if (travellers < 1 || travellers > 9) next.travellers = "Enter between 1 and 9 travellers.";
    if (budget && Number(budget) < 500) next.budget = "Budget must be at least 500.";
    return next;
  }

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      announce("Please fix the highlighted fields");
      return;
    }
    setLoading(true);
    setApiError(null);
    const budgetValue = budget ? Number(budget) : null;

    const { data, source: src, error } = await withFallback("/api/itineraries", () => itineraries);
    setSource(src);
    const pool = data ?? itineraries;
    const filtered = pool.filter(
      (it) =>
        it.from === from &&
        it.to === to &&
        (budgetValue === null || it.price <= budgetValue),
    );
    setResults(filtered);
    setApiError(error && src === "live" ? error : null);
    setHasSearched(true);
    setLoading(false);
    announce(`${filtered.length} ${t("common.results")}`);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]).slice(0, 3));
  }

  const ranked = useMemo(() => scoreItineraries(results, pref), [results, pref]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SearchIcon className="h-5 w-5" />}
        title={t("nav.search")}
        description="Search inventory, apply your budget and let RoamAgent rank by price, speed and safety."
      />

      <Card>
        <form className="space-y-4" onSubmit={runSearch} noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="From" error={errors.from}>
              {(id) => (
                <Select id={id} value={from} invalid={!!errors.from} onChange={(e) => setFrom(e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="To" error={errors.to}>
              {(id) => (
                <Select id={id} value={to} invalid={!!errors.to} onChange={(e) => setTo(e.target.value)}>
                  {availableTo.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Departure date" error={errors.date}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  min={today}
                  value={date}
                  invalid={!!errors.date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </Field>
            <Field label="Priority">
              {(id) => (
                <Select id={id} value={pref} onChange={(e) => setPref(e.target.value as TravelPref)}>
                  {(["balanced", "cheapest", "fastest", "safest"] as TravelPref[]).map((p) => (
                    <option key={p} value={p}>
                      {preferenceLabel(p)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {showAdvanced && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Travellers" error={errors.travellers} hint="1–9 travellers">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={9}
                    value={travellers}
                    invalid={!!errors.travellers}
                    onChange={(e) => setTravellers(Number(e.target.value))}
                  />
                )}
              </Field>
              <Field label="Budget (total)" error={errors.budget} hint="Optional">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={0}
                    value={budget}
                    invalid={!!errors.budget}
                    placeholder="e.g. 8000"
                    onChange={(e) => setBudget(e.target.value)}
                  />
                )}
              </Field>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={loading} icon={<SearchIcon className="h-4 w-4" />}>
              {t("common.search")}
            </Button>
            <Button type="button" variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Hide" : "More filters"}
            </Button>
            {source && (
              <Badge tone={source === "live" ? "teal" : "amber"} className="ml-auto">
                <Info className="h-3.5 w-3.5" /> {source === "live" ? "Live API" : "Demo inventory"}
              </Badge>
            )}
          </div>
        </form>
      </Card>

      {apiError && <ErrorState message={apiError} onRetry={() => runSearch()} />}

      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && hasSearched && ranked.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-slate-200">{ranked.length}</span> {t("common.results")} · ranked by{" "}
              {preferenceLabel(pref)}
            </p>
            <Button
              variant="secondary"
              disabled={selected.length < 2}
              onClick={() => navigate("/compare", { state: { ids: selected } })}
            >
              Compare {selected.length}/3 selected
            </Button>
          </div>
          {ranked.map((row, idx) => (
            <ItineraryCard
              key={row.itinerary.id}
              itinerary={row.itinerary}
              rank={idx + 1}
              selected={selected.includes(row.itinerary.id)}
              onToggleSelect={toggleSelected}
              onSelect={(it) => navigate("/booking", { state: { itineraryId: it.id, travellers } })}
            />
          ))}
        </div>
      )}

      {!loading && hasSearched && ranked.length === 0 && (
        <EmptyState
          icon={<SearchIcon className="h-5 w-5" />}
          title="No matching itineraries"
          description={`RoamAgent found no ${source === "live" ? "live" : "demo"} options for ${from} → ${to}${
            budget ? ` under ${formatMoney(Number(budget), settings.currency)}` : ""
          }. Try raising the budget or changing the route.`}
          action={
            <Button variant="secondary" onClick={() => setBudget("")}>
              Clear budget filter
            </Button>
          }
        />
      )}

      {!hasSearched && (
        <EmptyState
          icon={<ArrowRight className="h-5 w-5" />}
          title="Ready to search"
          description="Set your route and press Search. RoamAgent will score every option against your priority."
        />
      )}
    </div>
  );
}
