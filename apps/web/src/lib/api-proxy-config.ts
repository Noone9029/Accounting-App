import type { NextConfig } from "next";

const BETA_API_ORIGIN = "https://ledgerbyte-api-test.vercel.app";

/** Build-time routing only: the destination never comes from a browser request. */
export function createApiProxyConfig(configuredUpstream: string | undefined): Pick<NextConfig, "env" | "rewrites"> {
  if (!configuredUpstream?.trim()) return {};

  const upstream = configuredUpstream.trim().replace(/\/$/, "");
  if (upstream !== BETA_API_ORIGIN) {
    throw new Error("LEDGERBYTE_API_UPSTREAM must be the approved HTTPS beta API origin.");
  }

  return {
    // Override an old direct-host public value when this deployment opts into the proxy.
    env: { NEXT_PUBLIC_API_URL: "/api" },
    async rewrites() {
      return {
        beforeFiles: [],
        afterFiles: [],
        fallback: [{
          // Keep Next's locale endpoint local for every method, including its 405 responses.
          source: "/api/:path((?!locale(?:/|$)).*)",
          destination: `${upstream}/:path`,
        }],
      };
    },
  };
}
