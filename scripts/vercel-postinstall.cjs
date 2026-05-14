const { execSync } = require("node:child_process");

if (process.env.VERCEL !== "1" || process.env.LEDGERBYTE_DEPLOY_TARGET !== "api") {
  process.exit(0);
}

execSync("corepack pnpm --filter @ledgerbyte/api db:generate", { stdio: "inherit" });
execSync("corepack pnpm --filter @ledgerbyte/api build", { stdio: "inherit" });
