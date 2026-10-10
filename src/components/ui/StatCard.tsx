import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "teal",
}: {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
  tone?: "teal" | "navy" | "amber" | "rose";
}) {
  const tones = {
    teal: "from-teal-500/20 to-teal-500/0 text-teal-300",
    navy: "from-navy-500/30 to-navy-500/0 text-slate-200",
    amber: "from-amber-400/20 to-amber-400/0 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-300",
  } as const;

  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", tones[tone])} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
          {delta && (
            <p className={cn("mt-1 text-xs font-medium", delta.positive ? "text-teal-300" : "text-rose-300")}>
              {delta.positive ? "▲" : "▼"} {delta.value}
            </p>
          )}
        </div>
        {icon && <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-white/5", tones[tone])}>{icon}</span>}
      </div>
    </div>
  );
}
