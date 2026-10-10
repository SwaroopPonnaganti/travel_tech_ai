import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-rose-100">{title}</p>
          <p className="text-sm text-rose-200/80">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="danger" icon={<RotateCcw className="h-4 w-4" />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
