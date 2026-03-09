import { cn } from "@/lib/utils";

interface LoadingStateProps {
  rows?: number;
  className?: string;
  message?: string;
}

function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={cn(
        "h-3 rounded-full bg-zinc-800 shimmer",
        wide ? "w-3/4" : "w-1/2"
      )}
    />
  );
}

export function LoadingState({ rows = 3, className, message }: LoadingStateProps) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {message && (
        <p className="text-xs text-zinc-500 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-smooth" />
          {message}
        </p>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonRow wide={i % 2 === 0} />
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 animate-fade-in",
        className
      )}
    >
      <div className="h-3 w-1/3 rounded-full bg-zinc-800 shimmer" />
      <div className="h-8 w-2/3 rounded-lg bg-zinc-800 shimmer" />
      <div className="h-3 w-full rounded-full bg-zinc-800 shimmer" />
      <div className="h-3 w-4/5 rounded-full bg-zinc-800 shimmer" />
    </div>
  );
}
