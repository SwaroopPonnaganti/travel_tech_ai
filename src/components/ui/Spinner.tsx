import { cn } from "../../lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-2 text-sm text-slate-400", className)}>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent"
        aria-hidden="true"
      />
      {label ?? "Loading…"}
    </span>
  );
}
