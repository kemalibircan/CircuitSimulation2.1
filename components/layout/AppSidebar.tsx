"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Activity, GitCompare, Archive, Settings, Cpu, ChevronRight, ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams() as { id?: string };
  const project = useProjectStore((s) => s.getProject(params.id || ""));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Only apply collapsed state after client mount to prevent hydration mismatch
  const collapsed = mounted && isCollapsed;

  const navItems = params.id ? [
    { label: "Overview", href: `/workspace/${params.id}`, icon: LayoutDashboard, exact: true },
    { label: "Runs", href: `/workspace/${params.id}/runs`, icon: Activity },
    { label: "Comparisons", href: `/workspace/${params.id}/comparisons`, icon: GitCompare },
    { label: "History", href: `/workspace/${params.id}/history`, icon: Archive },
    { label: "Settings", href: `/workspace/${params.id}/settings`, icon: Settings },
  ] : [];

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 z-20 transition-all duration-300 ease-in-out relative",
        collapsed ? "w-[72px]" : "w-60 min-w-[240px]"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 w-7 h-7 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors z-30"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
      </button>

      {/* Back to Projects */}
      <div className="p-4 border-b border-zinc-800/80 flex justify-center">
        <Link
          href="/"
          className={cn(
            "flex items-center text-xs font-semibold text-zinc-500 hover:text-cyan-400 transition-colors group",
            collapsed ? "justify-center" : "gap-2 w-full"
          )}
          title={collapsed ? "Back to Projects" : undefined}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform flex-shrink-0" />
          {!collapsed && <span>Back to Projects</span>}
        </Link>
      </div>

      {/* Project Header */}
      {project && (
         <div className={cn(
           "flex items-center border-b border-zinc-800/80",
           collapsed ? "justify-center py-5" : "gap-3 px-5 py-5"
         )}>
           <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
             <Cpu className="w-4 h-4 text-cyan-400" />
           </div>
           {!collapsed && (
             <div className="min-w-0 transition-opacity duration-300">
               <h2 className="text-sm font-bold text-zinc-100 truncate" title={project.name}>
                 {project.name}
               </h2>
               <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 leading-none mt-1 truncate">
                 {project.category.replace("-", " ")}
               </p>
             </div>
           )}
         </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-cyan-400" : "text-zinc-500"
                )}
              />
              {!collapsed && (
                <>
                  <span>{label}</span>
                  {href === "/runs" && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono border border-zinc-700/50">
                      {project?.runData ? "1" : "0"}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Agent / Model selector at bottom */}
      <div className="px-3 py-4 border-t border-zinc-800/60 mt-auto">
        <button 
          title={collapsed ? "CircuitAgent v2.1" : undefined}
          className={cn(
            "flex items-center rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group",
            collapsed ? "justify-center p-2 w-full" : "justify-between px-3 py-2 w-full"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-smooth flex-shrink-0" />
            {!collapsed && (
               <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors truncate">
                 CircuitAgent v2.1
               </span>
            )}
          </div>
          {!collapsed && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
        </button>
      </div>
    </aside>
  );
}
