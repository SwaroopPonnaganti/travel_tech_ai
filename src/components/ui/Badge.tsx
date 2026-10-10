import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "teal" | "amber" | "rose" | "navy" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "border-white/15 bg-white/5 text-slate-300",
  teal: "border-teal-500/40 bg-teal-500/10 text-teal-300",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  navy: "border-navy-500/50 bg-navy-700/40 text-slate-200",
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
