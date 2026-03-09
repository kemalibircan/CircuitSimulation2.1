"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Activity, GitCompare, Archive, Settings, Cpu, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useProjectStore } from "@/store/useProjectStore";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams() as { id?: string };
  const project = useProjectStore((s) => s.getProject(params.id || ""));

  // Navigation is context-aware to the current project ID
  const navItems = params.id ? [
    { label: "Overview", href: `/workspace/${params.id}`, icon: LayoutDashboard, exact: true },
    { label: "Runs", href: "/runs", icon: Activity },
    { label: "Comparisons", href: "/comparisons", icon: GitCompare },
    { label: "History", href: "/history", icon: Archive },
    { label: "Settings", href: "/settings", icon: Settings },
  ] : [];

  return (
    <aside className="flex flex-col w-60 min-w-[240px] h-full bg-zinc-950 border-r border-zinc-800/80 z-20">
      
      {/* Back to Projects */}
      <div className="p-4 border-b border-zinc-800/80">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-cyan-400 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Projects
        </Link>
      </div>

      {/* Project Header */}
      {project && (
         <div className="flex items-start gap-3 px-5 py-5 border-b border-zinc-800/80">
           <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex-shrink-0 mt-0.5">
             <Cpu className="w-4 h-4 text-cyan-400" />
           </div>
           <div className="min-w-0">
             <h2 className="text-sm font-bold text-zinc-100 truncate" title={project.name}>
               {project.name}
             </h2>
             <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 leading-none mt-1 truncate">
               {project.category.replace("-", " ")}
             </p>
           </div>
         </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-cyan-400" : "text-zinc-600"
                )}
              />
              {label}
              {href === "/runs" && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
                  {project?.runData ? "1" : "0"}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Agent / Model selector at bottom */}
      <div className="px-3 py-4 border-t border-zinc-800/60 mt-auto">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-smooth" />
            <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
              CircuitAgent v2.1
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        </button>
      </div>
    </aside>
  );
}
