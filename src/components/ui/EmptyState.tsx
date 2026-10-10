import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      {icon && <div className="grid h-12 w-12 place-items-center rounded-full bg-teal-500/10 text-teal-300">{icon}</div>}
      <div>
        <p className="font-display text-base font-semibold text-slate-100">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
