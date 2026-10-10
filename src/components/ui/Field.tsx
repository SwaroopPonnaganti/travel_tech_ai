import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("w-full", className)}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-300">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn("input", invalid && "border-rose-500/60 focus:ring-rose-500/30", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function Select({ invalid, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn("input appearance-none", invalid && "border-rose-500/60", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn("input min-h-[96px] resize-y", invalid && "border-rose-500/60", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
