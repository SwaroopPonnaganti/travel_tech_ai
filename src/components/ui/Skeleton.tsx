import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}
