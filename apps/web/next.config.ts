import type { NextConfig } from "next";
import { createApiProxyConfig } from "./src/lib/api-proxy-config";

const nextConfig: NextConfig = {
  ...createApiProxyConfig(process.env.LEDGERBYTE_API_UPSTREAM),
  reactStrictMode: true,
  experimental: {
    cpus: Number.parseInt(process.env.LEDGERBYTE_NEXT_BUILD_CPUS ?? "6", 10),
    externalDir: true,
  },
};

export default nextConfig;
