import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  accent?: "cyan" | "emerald" | "violet" | "amber";
}

const accentBar = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
};

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
  accent = "cyan",
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-4", className)}>
      <div className="flex items-start gap-3">
        <div
          className={cn("w-0.5 h-5 rounded-full mt-0.5 flex-shrink-0", accentBar[accent])}
        />
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
