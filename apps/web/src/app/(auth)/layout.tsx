import { cookies } from "next/headers";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { APP_LOCALE_COOKIE, resolveAppLocale } from "@/lib/app-i18n";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  return <AppLocaleProvider initialLocale={resolveAppLocale(store.get(APP_LOCALE_COOKIE)?.value)}>{children}</AppLocaleProvider>;
}
