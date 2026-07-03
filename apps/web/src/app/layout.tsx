import type { Metadata } from "next";
import { cookies } from "next/headers";
import { APP_LOCALE_COOKIE, getLocaleDirection, resolveAppLocale } from "@/lib/app-i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "LedgerByte",
  description: "LedgerByte accounting workspace",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  const dir = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
