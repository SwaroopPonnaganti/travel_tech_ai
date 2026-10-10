import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock,
  Database,
  Filter,
  Leaf,
  Route as RouteIcon,
  ShieldAlert,
} from "lucide-react";
import type { PlannedItinerary, TransferRisk } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ModeIcon } from "../TransportIcon";
import { formatDuration, formatMoney, formatTime, relativeTime } from "../../lib/format";
import { useSettings } from "../../state/SettingsContext";
import { cn } from "../../lib/cn";

const RISK_TONE: Record<TransferRisk, "teal" | "amber" | "rose" | "neutral"> = {
  none: "teal",
  low: "teal",
  medium: "amber",
  high: "rose",
};

function riskTone(risk: TransferRisk) {
  return RISK_TONE[risk];
}

export function PlannedItineraryCard({
  itinerary,
  rank,
  onSelect,
}: {
  itinerary: PlannedItinerary;
  rank?: number;
  onSelect?: (itinerary: PlannedItinerary) => void;
}) {
  const { settings, t } = useSettings();
  const hour12 = settings.timeFormat === "12h";
  const [open, setOpen] = useState(false);
  const isAlternative = itinerary.relaxations.length > 0;
  const riskToneValue = riskTone(itinerary.transferRisk);

  return (
    <article className={cn("card card-hover p-4", isAlternative && "border-amber-500/30")}>
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
            <div className="flex flex-wrap items-center gap-2">
              <ModeIcon mode={itinerary.modes[0]!} className="h-4 w-4 text-teal-300" />
              <h3 className="font-display text-base font-semibold text-white">
                {itinerary.from} <ArrowRight className="inline h-3.5 w-3.5 text-slate-500" /> {itinerary.to}
              </h3>
              <Badge tone="violet">
                <Database className="h-3.5 w-3.5" /> {t("plan.card.simulated")}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              {itinerary.comfort} · {itinerary.legs === 1 ? t("plan.card.direct") : `${itinerary.transfers.length} ${t("plan.card.transfers")}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold text-white">{formatMoney(itinerary.totalFare, settings.currency)}</p>
          <p className="text-xs text-slate-400">
            {itinerary.passengers > 1
              ? `${formatMoney(itinerary.fare, settings.currency)} × ${itinerary.passengers}`
              : t("plan.card.perPerson")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-slate-500" />
          {formatDuration(itinerary.totalDurationMin)}
        </span>
        <span className="flex items-center gap-1 text-slate-300">
          {formatTime(itinerary.depart, hour12, settings.language)}
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
          {formatTime(itinerary.arrive, hour12, settings.language)}
        </span>
        <span className="text-slate-400">{formatDuration(itinerary.travelDurationMin)} {t("plan.card.onBoard")}</span>
        {itinerary.transferRisk !== "none" && (
          <Badge tone={riskToneValue}>
            {itinerary.transferRisk === "high" ? <ShieldAlert className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
            {t(`plan.card.risk.${itinerary.transferRisk}`)} {t("plan.card.transfer")}
          </Badge>
        )}
        {itinerary.meetsArrivalDeadline ? (
          <Badge tone="teal">
            <BadgeCheck className="h-3.5 w-3.5" /> {t("plan.card.onTime")}
          </Badge>
        ) : (
          <Badge tone="rose">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t("plan.card.lateBy").replace("{min}", String(Math.abs(itinerary.arrivalSlackMin ?? 0)))}
          </Badge>
        )}
      </div>

      {isAlternative && (
        <ul className="mt-3 space-y-1">
          {itinerary.relaxations.map((r) => (
            <li key={r} className="flex items-start gap-1.5 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {itinerary.tags.map((tag) => (
          <Badge key={tag} tone={tag === "Simulated" ? "violet" : tag === "Meets deadline" ? "teal" : "navy"}>
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Database className="h-3.5 w-3.5" />
        <span className="truncate">{itinerary.source}</span>
        <span aria-hidden="true">·</span>
        <span>{t("plan.card.updated")} {relativeTime(itinerary.updatedAt)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" icon={<ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? t("plan.card.hideDetails") : t("plan.card.details")}
        </Button>
        {onSelect && (
          <Button type="button" onClick={() => onSelect(itinerary)} icon={<RouteIcon className="h-4 w-4" />}>
            {t("plan.card.review")}
          </Button>
        )}
      </div>

      {open && (
        <ol className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {itinerary.connections.map((c, i) => {
            const transfer = itinerary.transfers[i - 1];
            return (
              <li key={`${c.id}-${i}`}>
                {transfer && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-slate-300">
                      {i}
                    </span>
                    <span>
                      {t("plan.card.changeAt")} <span className="text-slate-200">{transfer.location}</span> · {t("plan.card.wait")}{" "}
                      {formatDuration(transfer.waitMin)}
                    </span>
                    <Badge tone={riskTone(transfer.risk)}>{t(`plan.card.risk.${transfer.risk}`)}</Badge>
                    {transfer.stationChange && <Badge tone="amber">{t("plan.card.stationChange")}</Badge>}
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ModeIcon mode={c.mode} className="h-4 w-4 text-teal-300" />
                      {c.operator} · {c.code}
                    </span>
                    <span className="text-sm font-semibold text-white">{formatMoney(c.fare, settings.currency)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>
                      {c.fromStop} {formatTime(c.depart, hour12, settings.language)} <ArrowRight className="inline h-3 w-3" />{" "}
                      {c.toStop} {formatTime(c.arrive, hour12, settings.language)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Leaf className="h-3 w-3" /> {c.comfort}
                    </span>
                    <Badge tone={c.availability === "available" ? "teal" : c.availability === "limited" ? "amber" : "rose"}>
                      {t(`plan.card.availability.${c.availability}`)}
                      {c.seatsLeft !== null ? ` · ${c.seatsLeft} ${t("plan.card.seats")}` : ""}
                    </Badge>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
