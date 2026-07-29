"use strict";

const { spawnSync } = require("node:child_process");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const testPaths = process.argv.slice(2);
if (testPaths.length === 0) throw new Error("Usage: node scripts/run-bounded-node-tests.cjs <test paths...>");

const workers = Math.max(1, Math.floor(os.cpus().length / 2));
const requiresTsx = testPaths.some((testPath) => /\.tsx?$/i.test(testPath));
const tsxArgs = requiresTsx ? ["--import", pathToFileURL(require.resolve("tsx", { paths: [process.cwd()] })).href] : [];
const result = spawnSync(process.execPath, [...tsxArgs, "--test", `--test-concurrency=${workers}`, ...testPaths], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=2048" },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
