/** @jest-environment node */
import { getRewrittenUrl, isRewrite, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { createApiProxyConfig } from "./api-proxy-config";
import { POST as setLocale } from "@/app/api/locale/route";
import { APP_LOCALE_COOKIE } from "./app-i18n";

const upstream = "https://ledgerbyte-api-test.vercel.app";
const web = "https://ledgerbyte-web-test.vercel.app";

describe("same-origin beta API routing", () => {
  it("opts in explicitly and pins the browser to the same-origin API prefix", async () => {
    expect(createApiProxyConfig(undefined)).toEqual({});
    const config = createApiProxyConfig(upstream + "/");
    expect(config.env?.NEXT_PUBLIC_API_URL).toBe("/api");
    const rewrites = await config.rewrites!();
    expect(rewrites).toMatchObject({ beforeFiles: [], afterFiles: [], fallback: [expect.any(Object)] });
  });

  it.each([
    "http://ledgerbyte-api-test.vercel.app", "https://unapproved.example.test",
    "https://ledgerbyte-api-test.vercel.app.evil.example", "https://user:password@ledgerbyte-api-test.vercel.app",
    "https://ledgerbyte-api-test.vercel.app/contacts", "https://ledgerbyte-api-test.vercel.app?target=elsewhere",
    "https://ledgerbyte-api-test.vercel.app#fragment", "http://127.0.0.1:4000", "/api",
  ])("rejects an unapproved upstream: %s", (value) => {
    expect(() => createApiProxyConfig(value)).toThrow("approved HTTPS beta API origin");
  });

  it.each(["/api/contacts", "/api/auth/login", "/api/auth/logout", "/api/sales-invoices/id/generate-pdf"])("strips only the API prefix for %s", async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: web + path, nextConfig: createApiProxyConfig(upstream) });
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(upstream + path.slice(4));
    expect(response.headers.get("location")).toBeNull();
  });

  it("retains query parameters while refusing to select an upstream from query or headers", async () => {
    const response = await unstable_getResponseFromNextConfig({
      url: web + "/api/contacts?type=CUSTOMER&target=https%3A%2F%2Fevil.example",
      headers: { "x-forwarded-host": "evil.example", "x-api-upstream": "https://evil.example" },
      nextConfig: createApiProxyConfig(upstream),
    });
    const rewritten = new URL(getRewrittenUrl(response)!);
    expect(rewritten.origin).toBe(upstream);
    expect(rewritten.pathname).toBe("/contacts");
    expect(rewritten.searchParams.get("type")).toBe("CUSTOMER");
    expect(rewritten.searchParams.get("target")).toBe("https://evil.example");
  });

  it.each(["/api/locale", "/api/locale/", "/api/locale/nested", "/contacts", "/login", "/apiary/contacts"])("does not proxy the local route %s", async (path) => {
    const response = await unstable_getResponseFromNextConfig({ url: web + path, nextConfig: createApiProxyConfig(upstream) });
    expect(isRewrite(response)).toBe(false);
  });

  it("retains the local locale POST handler and its cookie response", async () => {
    const response = await setLocale(new Request(web + "/api/locale", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: "ar" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: "ar", dir: "rtl" });
    expect(response.cookies.get(APP_LOCALE_COOKIE)?.value).toBe("ar");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    expect(response.cookies.get("ledgerbyte_auth")).toBeUndefined();
  });
});
