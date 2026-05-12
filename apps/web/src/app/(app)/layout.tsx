import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { PermissionBoundary } from "@/components/permissions/permission-boundary";
import { PermissionProvider } from "@/components/permissions/permission-provider";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PermissionProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="px-6 py-6">
            <PermissionBoundary>{children}</PermissionBoundary>
          </main>
        </div>
      </div>
    </PermissionProvider>
  );
}
