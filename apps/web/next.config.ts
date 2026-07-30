import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: Number.parseInt(process.env.LEDGERBYTE_NEXT_BUILD_CPUS ?? "6", 10),
    externalDir: true,
  },
};

export default nextConfig;
