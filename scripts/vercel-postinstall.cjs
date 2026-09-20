const { execSync } = require("node:child_process");
const { accessSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apiRuntimePackages = [
  "@ledgerbyte/accounting-core",
  "@ledgerbyte/pdf-core",
  "@ledgerbyte/shared",
  "@ledgerbyte/uae-peppol-pint-ae",
  "@ledgerbyte/zatca-core",
];

function verifyApiBuild() {
  accessSync(path.join(root, "apps/api/dist/apps/api/api/index.js"));
  for (const dependency of apiRuntimePackages) {
    require.resolve(dependency, { paths: [path.join(root, "apps/api")] });
  }
}

// The explicit Vercel build step checks postinstall output without rebuilding or
// allowing framework detection to run the monorepo's generic build command.
if (process.argv.includes("--verify-api-build")) {
  if (process.env.VERCEL !== "1" || process.env.LEDGERBYTE_DEPLOY_TARGET !== "api") {
    throw new Error("The root API Vercel project requires LEDGERBYTE_DEPLOY_TARGET=api.");
  }
  verifyApiBuild();
  process.exit(0);
}

if (process.env.VERCEL !== "1" || process.env.LEDGERBYTE_DEPLOY_TARGET !== "api") {
  process.exit(0);
}

// One workspace at a time. These child limits complement the host's aggregate
// 20-GiB/half-CPU ceiling; a heap limit alone is not an aggregate process limit.
const options = {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096", UV_THREADPOOL_SIZE: "1" },
};
execSync(
  `corepack pnpm --workspace-concurrency=1 ${apiRuntimePackages.map((dependency) => `--filter ${dependency}`).join(" ")} build`,
  options,
);
execSync("corepack pnpm --workspace-concurrency=1 --filter @ledgerbyte/api db:generate", options);
execSync("corepack pnpm --workspace-concurrency=1 --filter @ledgerbyte/api build", options);
verifyApiBuild();
