import { ArrowRight, Leaf, ShieldCheck, Star, Clock } from "lucide-react";
import type { Itinerary } from "../lib/types";
import { Badge } from "./ui/Badge";
import { ModeIcon } from "./TransportIcon";
import { formatMoney, formatTime } from "../lib/format";
import { totalDuration } from "../lib/compare";
import { useSettings } from "../state/SettingsContext";
import { cn } from "../lib/cn";

export function ItineraryCard({
  itinerary,
  rank,
  selected,
  onToggleSelect,
  onSelect,
  compact = false,
}: {
  itinerary: Itinerary;
  rank?: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onSelect?: (itinerary: Itinerary) => void;
  compact?: boolean;
}) {
  const { settings } = useSettings();
  const hour12 = settings.timeFormat === "12h";
  const duration = totalDuration(itinerary);

  return (
    <article
      className={cn(
        "card card-hover p-4",
        selected && "border-teal-500/60 shadow-glow",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {rank !== undefined && (
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold",
                rank === 1 ? "bg-teal-500 text-navy-950" : "bg-white/10 text-slate-300",
              )}
            >
              {rank}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <ModeIcon mode={itinerary.legs[0]!.mode} className="h-4 w-4 text-teal-300" />
              <h3 className="font-display text-base font-semibold text-white">{itinerary.title}</h3>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              {itinerary.legs[0]!.operator} · {itinerary.legs[0]!.code}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold text-white">{formatMoney(itinerary.price, settings.currency)}</p>
          <p className="text-xs text-slate-400">per traveller</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-slate-500" />
          {Math.floor(duration / 60)}h {duration % 60}m
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          {formatTime(itinerary.legs[0]!.depart, hour12, settings.language)}
          <ArrowRight className="h-3.5 w-3.5" />
          {formatTime(itinerary.legs[itinerary.legs.length - 1]!.arrive, hour12, settings.language)}
        </span>
        <span className="flex items-center gap-1.5 text-teal-300">
          <ShieldCheck className="h-4 w-4" /> {itinerary.safetyScore}
        </span>
        <span className="flex items-center gap-1.5 text-amber-300">
          <Star className="h-4 w-4" /> {itinerary.rating}
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Leaf className="h-4 w-4" /> {itinerary.co2Kg} kg CO₂
        </span>
        <span className="text-slate-400">{itinerary.stops === 0 ? "Non-stop" : `${itinerary.stops} stop`}</span>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {itinerary.tags.map((tag) => (
            <Badge key={tag} tone={tag.toLowerCase().includes("refund") ? "teal" : "navy"}>
              {tag}
            </Badge>
          ))}
          {itinerary.reliabilityPct >= 90 && <Badge tone="teal">{itinerary.reliabilityPct}% on time</Badge>}
        </div>
      )}

      {(onSelect || onToggleSelect) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onSelect && (
            <button type="button" className="btn-primary" onClick={() => onSelect(itinerary)}>
              Review booking
            </button>
          )}
          {onToggleSelect && (
            <button
              type="button"
              className="btn-secondary"
              aria-pressed={selected}
              onClick={() => onToggleSelect(itinerary.id)}
            >
              {selected ? "Remove from comparison" : "Add to comparison"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
