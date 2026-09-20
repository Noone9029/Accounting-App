/** @jest-environment node */
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { defaultConfig } from "next/dist/server/config-shared";
import { buildCustomRoute } from "next/dist/server/lib/router-utils/filesystem";
import { getResolveRoutes } from "next/dist/server/lib/router-utils/resolve-routes";
import { getRouteMatcher } from "next/dist/shared/lib/router/utils/route-matcher";
import { getRouteRegex } from "next/dist/shared/lib/router/utils/route-regex";
import { createApiProxyConfig } from "./api-proxy-config";

// The public config-testing helper flattens rewrite phases and cannot detect
// a catch-all page taking precedence. Exercise Next's actual request resolver.
async function resolveWithCatchAll(path: string, method = "GET", oldFallbackPhase = false) {
  const configured = await createApiProxyConfig("https://ledgerbyte-api-test.vercel.app").rewrites!();
  if (Array.isArray(configured)) throw new Error("Expected phased rewrites.");
  const rewrites = {
    beforeFiles: (configured.beforeFiles ?? []).map((rule) => buildCustomRoute("before_files_rewrite", rule)),
    afterFiles: (configured.afterFiles ?? []).map((rule) => buildCustomRoute("rewrite", rule)),
    fallback: (configured.fallback ?? []).map((rule) => buildCustomRoute("rewrite", rule)),
  };
  if (oldFallbackPhase) {
    rewrites.fallback = rewrites.afterFiles;
    rewrites.afterFiles = [];
  }
  const catchAll = "/[...placeholder]";
  const fsChecker = {
    headers: [], redirects: [], onMatchHeaders: [], rewrites, buildId: "synthetic-build",
    getMiddlewareMatchers: () => undefined,
    handleLocale: (pathname: string) => ({ pathname, locale: undefined }),
    getItem: async (pathname: string) => pathname === "/api/locale" || pathname === catchAll ? { type: "appFile", itemPath: pathname } : null,
    getDynamicRoutes: () => [{ page: catchAll, match: getRouteMatcher(getRouteRegex(catchAll)) }],
  } as unknown as Parameters<typeof getResolveRoutes>[0];
  const resolve = getResolveRoutes(
    fsChecker,
    { ...defaultConfig, useFileSystemPublicRoutes: true } as unknown as Parameters<typeof getResolveRoutes>[1],
    { dir: process.cwd(), dev: false, minimalMode: false, hostname: "localhost", port: 3000 } as Parameters<typeof getResolveRoutes>[2],
    {} as Parameters<typeof getResolveRoutes>[3],
    {} as Parameters<typeof getResolveRoutes>[4],
  );
  const socket = new Socket();
  const req = new IncomingMessage(socket);
  req.url = path;
  req.method = method;
  req.headers = { host: "ledgerbyte-web-test.vercel.app" };
  const res = new ServerResponse(req);
  try {
    return await resolve({ req, res, isUpgradeReq: false, signal: new AbortController().signal });
  } finally {
    req.destroy();
    res.destroy();
    socket.destroy();
  }
}

describe("API rewrite priority over the existing placeholder catch-all", () => {
  it("reproduces the old fallback phase serving the placeholder instead of the API", async () => {
    const result = await resolveWithCatchAll("/api/readiness", "GET", true);
    expect(result.matchedOutput?.itemPath).toBe("/[...placeholder]");
    expect(result.parsedUrl.hostname).toBeFalsy();
  });

  it.each([
    ["GET", "/api/readiness", "/readiness"],
    ["GET", "/api/contacts", "/contacts"],
    ["POST", "/api/contacts", "/contacts"],
    ["POST", "/api/auth/login", "/auth/login"],
  ])("routes %s %s to the API before the dynamic catch-all", async (method, path, expected) => {
    const result = await resolveWithCatchAll(path, method);
    expect(result.finished).toBe(true);
    expect(result.matchedOutput).toBeUndefined();
    expect(result.parsedUrl.hostname).toBe("ledgerbyte-api-test.vercel.app");
    expect(result.parsedUrl.pathname).toBe(expected);
  });

  it("keeps the exact local locale handler ahead of proxy and placeholder", async () => {
    const result = await resolveWithCatchAll("/api/locale", "POST");
    expect(result.matchedOutput?.itemPath).toBe("/api/locale");
    expect(result.parsedUrl.hostname).toBeFalsy();
  });

  it("preserves placeholder routing outside the API namespace", async () => {
    const result = await resolveWithCatchAll("/planned-module");
    expect(result.matchedOutput?.itemPath).toBe("/[...placeholder]");
  });
});
