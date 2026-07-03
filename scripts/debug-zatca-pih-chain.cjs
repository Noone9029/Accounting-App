#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { assertLocalOnlyApiTarget } = require("./safe-script-guards.cjs");

const apiUrl = (process.env.LEDGERBYTE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

assertLocalOnlyApiTarget({ scriptName: "debug-zatca-pih-chain", apiUrl, env: process.env, argv: process.argv });

const result = spawnSync(process.execPath, [path.join(__dirname, "validate-zatca-sdk-hash-mode.cjs")], {
  stdio: "inherit",
  env: {
    ...process.env,
    LEDGERBYTE_ZATCA_DEBUG_PIH_CHAIN: "true",
    LEDGERBYTE_ALLOW_LOCAL_ZATCA_SCRIPT: "true",
  },
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
