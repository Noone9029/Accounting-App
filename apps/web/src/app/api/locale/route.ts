import { NextResponse } from "next/server";
import { APP_LOCALE_COOKIE, getLocaleDirection, resolveAppLocale } from "@/lib/app-i18n";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const requestedLocale = typeof body === "object" && body ? (body as { locale?: unknown }).locale : undefined;
  if (requestedLocale !== "en" && requestedLocale !== "ar") {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 });
  }

  const locale = resolveAppLocale(requestedLocale);
  const response = NextResponse.json({ locale, dir: getLocaleDirection(locale) });
  response.cookies.set(APP_LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
