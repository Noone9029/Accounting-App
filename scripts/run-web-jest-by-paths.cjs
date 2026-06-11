"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const testPaths = process.argv.slice(2);

if (testPaths.length === 0) {
  console.error("Expected at least one web Jest path.");
  process.exit(1);
}

const corepackScript = path.join(path.dirname(process.execPath), "node_modules", "corepack", "dist", "corepack.js");
const args = [corepackScript, "pnpm", "--filter", "@ledgerbyte/web", "exec", "jest", "--config", "jest.config.cjs", "--runTestsByPath", ...testPaths];

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
