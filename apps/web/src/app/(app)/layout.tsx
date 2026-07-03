import { MobileWorkflowNav, Sidebar } from "@/components/app-shell/sidebar";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { Topbar } from "@/components/app-shell/topbar";
import { PermissionBoundary } from "@/components/permissions/permission-boundary";
import { PermissionProvider } from "@/components/permissions/permission-provider";
import { cookies } from "next/headers";
import { APP_LOCALE_COOKIE, getLocaleDirection, resolveAppLocale, translate } from "@/lib/app-i18n";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  const dir = getLocaleDirection(locale);

  return (
    <AppLocaleProvider initialLocale={locale}>
      <PermissionProvider>
        <div lang={locale} dir={dir} className="flex min-h-screen bg-workspace ledger-app-surface">
          <a href="#workspace-main" className="ledger-focus sr-only fixed left-3 top-3 z-[60] rounded-md bg-white px-3 py-2 text-sm font-semibold text-ink shadow-panel focus:not-sr-only">
            {translate(locale, "nav.skipWorkspace")}
          </a>
          <div className="hidden lg:block">
            <Sidebar />
          </div>
          <div className="min-w-0 flex-1">
            <Topbar />
            <MobileWorkflowNav />
            <main id="workspace-main" className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:py-6">
              <PermissionBoundary>{children}</PermissionBoundary>
            </main>
          </div>
        </div>
      </PermissionProvider>
    </AppLocaleProvider>
  );
}
