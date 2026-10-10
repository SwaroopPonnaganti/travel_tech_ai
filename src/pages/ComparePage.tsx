import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GitCompareArrows, Trophy, Check } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { EmptyState } from "../components/ui/EmptyState";
import { ModeIcon } from "../components/TransportIcon";
import { itineraries } from "../lib/mock";
import { scoreItineraries, preferenceLabel, totalDuration } from "../lib/compare";
import { formatMoney, formatDuration } from "../lib/format";
import type { TravelPref } from "../lib/types";
import { useSettings } from "../state/SettingsContext";
import { cn } from "../lib/cn";

const MAX_COMPARE = 3;

interface MetricRow {
  key: string;
  label: string;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

export function ComparePage() {
  const { settings, t } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const preset = (location.state as { ids?: string[] } | null)?.ids;

  const [selected, setSelected] = useState<string[]>(preset && preset.length ? preset : ["it-101", "it-103", "it-102"]);
  const [pref, setPref] = useState<TravelPref>("balanced");

  const chosen = useMemo(() => itineraries.filter((it) => selected.includes(it.id)), [selected]);
  const ranked = useMemo(() => scoreItineraries(chosen, pref), [chosen, pref]);
  const winner = ranked.find((r) => r.winner);

  const metrics: MetricRow[] = [
    { key: "price", label: "Fare", format: (v) => formatMoney(v, settings.currency), higherIsBetter: false },
    { key: "durationMin", label: "Total travel time", format: (v) => formatDuration(v), higherIsBetter: false },
    { key: "stops", label: "Stops", format: (v) => (v === 0 ? "Non-stop" : String(v)), higherIsBetter: false },
    { key: "safetyScore", label: "Safety score", format: (v) => `${v}/100`, higherIsBetter: true },
    { key: "reliabilityPct", label: "On-time record", format: (v) => `${v}%`, higherIsBetter: true },
  ];

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<GitCompareArrows className="h-5 w-5" />}
        title={t("nav.compare")}
        description="Compare up to three itineraries side by side. RoamAgent highlights the winner for your chosen priority."
        action={
          <SegmentedControl
            name="Comparison priority"
            value={pref}
            onChange={setPref}
            options={(["balanced", "cheapest", "fastest", "safest"] as TravelPref[]).map((p) => ({
              value: p,
              label: preferenceLabel(p),
            }))}
          />
        }
      />

      <Card title="Choose itineraries" subtitle={`Select up to ${MAX_COMPARE}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {itineraries.map((it) => {
            const isSelected = selected.includes(it.id);
            const disabled = !isSelected && selected.length >= MAX_COMPARE;
            return (
              <button
                key={it.id}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggle(it.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  isSelected
                    ? "border-teal-500/60 bg-teal-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-teal-500/40",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                    isSelected ? "border-teal-400 bg-teal-500 text-navy-950" : "border-white/25",
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                <ModeIcon mode={it.legs[0]!.mode} className="h-4 w-4 text-teal-300" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-100">{it.title}</span>
                  <span className="block text-xs text-slate-400">
                    {formatMoney(it.price, settings.currency)} · {formatDuration(totalDuration(it))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {ranked.length < 2 ? (
        <EmptyState
          icon={<GitCompareArrows className="h-5 w-5" />}
          title="Select at least two itineraries"
          description="Pick any two or three options above to see a side-by-side comparison."
        />
      ) : (
        <>
          {winner && (
            <Card className="border-teal-500/40 bg-teal-500/5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 text-navy-950">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-white">
                    RoamAgent pick: {winner.itinerary.title}
                  </p>
                  <p className="text-sm text-slate-300">
                    Best match for “{preferenceLabel(pref)}” · score {winner.score}/100
                  </p>
                </div>
                <Button className="ml-auto" onClick={() => navigate("/booking", { state: { itineraryId: winner.itinerary.id } })}>
                  Review booking
                </Button>
              </div>
              {winner.reasons.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {winner.reasons.map((r) => (
                    <li key={r}>
                      <Badge tone="teal">{r}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card padded={false} className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Itinerary comparison table</caption>
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="px-4 py-3 font-semibold">Attribute</th>
                  {ranked.map((row) => (
                    <th key={row.itinerary.id} scope="col" className="px-4 py-3 font-semibold">
                      <span className="flex items-center gap-2 text-slate-200">
                        {row.itinerary.title}
                        {row.winner && <Badge tone="teal">Best</Badge>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const values = ranked.map((r) => r.metrics[m.key as keyof typeof r.metrics] as number);
                  const best = m.higherIsBetter ? Math.max(...values) : Math.min(...values);
                  return (
                    <tr key={m.key} className="border-b border-white/5 last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium text-slate-400">
                        {m.label}
                      </th>
                      {ranked.map((row) => {
                        const value = row.metrics[m.key as keyof typeof row.metrics] as number;
                        const isBest = value === best && ranked.length > 1;
                        return (
                          <td
                            key={row.itinerary.id}
                            className={cn("px-4 py-3", isBest ? "font-semibold text-teal-300" : "text-slate-200")}
                          >
                            {m.format(value)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-slate-400">
                    Weighted score
                  </th>
                  {ranked.map((row) => (
                    <td key={row.itinerary.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{row.score}</span>
                        <span className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-navy-500 to-teal-400"
                            style={{ width: `${row.score}%` }}
                          />
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
