import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy-600 to-teal-600 text-white shadow-card">
            {icon}
          </span>
        )}
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
