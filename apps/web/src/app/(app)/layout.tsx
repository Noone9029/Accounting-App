import { MobileWorkflowNav, Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { PermissionBoundary } from "@/components/permissions/permission-boundary";
import { PermissionProvider } from "@/components/permissions/permission-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionProvider>
      <TooltipProvider>
        <div className="flex min-h-screen bg-workspace">
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="min-w-0 flex-1">
            <Topbar />
            <MobileWorkflowNav />
            <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:py-6">
              <PermissionBoundary>{children}</PermissionBoundary>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </PermissionProvider>
  );
}
