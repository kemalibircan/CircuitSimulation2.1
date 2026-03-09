import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopNavbar } from "@/components/layout/TopNavbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Fixed left sidebar */}
      <AppSidebar />
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto bg-dot-grid relative">
          {children}
        </main>
      </div>
    </div>
  );
}
