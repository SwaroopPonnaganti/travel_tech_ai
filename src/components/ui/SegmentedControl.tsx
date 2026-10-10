import { cn } from "../../lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-navy-850 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            value === opt.value ? "bg-teal-500 text-navy-950" : "text-slate-300 hover:bg-white/5",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
