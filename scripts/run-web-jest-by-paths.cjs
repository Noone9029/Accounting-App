"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const testPaths = process.argv.slice(2);

if (testPaths.length === 0) {
  console.error("Expected at least one web Jest path.");
  process.exit(1);
}

const invocation = resolveCorepackInvocation();
const args = [
  ...invocation.argsPrefix,
  "pnpm",
  "--filter",
  "@ledgerbyte/web",
  "exec",
  "jest",
  "--config",
  "jest.config.cjs",
  "--runTestsByPath",
  ...testPaths,
];

const result = spawnSync(invocation.bin, args, { stdio: "inherit" });
if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function resolveCorepackInvocation() {
  if (process.platform !== "win32") {
    return { bin: "corepack", argsPrefix: [] };
  }

  const execDir = path.dirname(process.execPath);
  const candidates = [
    path.join(execDir, "node_modules", "corepack", "dist", "corepack.js"),
    path.join(execDir, "..", "node_modules", "corepack", "dist", "corepack.js"),
    path.join(execDir, "..", "lib", "node_modules", "corepack", "dist", "corepack.js"),
  ];
  const corepackScript = candidates.find((candidate) => fs.existsSync(candidate));

  if (!corepackScript) {
    throw new Error("Unable to locate corepack.js for scoped web Jest runner.");
  }

  return { bin: process.execPath, argsPrefix: [corepackScript] };
}
