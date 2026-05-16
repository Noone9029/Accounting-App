#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const result = spawnSync(process.execPath, [path.join(__dirname, "validate-zatca-sdk-hash-mode.cjs")], {
  stdio: "inherit",
  env: {
    ...process.env,
    LEDGERBYTE_ZATCA_DEBUG_PIH_CHAIN: "true",
  },
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
