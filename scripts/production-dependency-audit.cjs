"use strict";

const { spawnSync } = require("node:child_process");

const result = spawnSync("corepack", ["pnpm", "audit", "--prod", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: process.platform === "win32",
});

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("Production dependency audit did not return valid JSON.");
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities ?? {};
const high = Number(counts.high ?? 0);
const critical = Number(counts.critical ?? 0);

console.log(`Production dependency audit: critical=${critical}, high=${high}`);

if (high > 0 || critical > 0) {
  const findings = Object.values(report.advisories ?? {})
    .filter((advisory) => advisory.severity === "high" || advisory.severity === "critical")
    .map((advisory) => `${advisory.github_advisory_id ?? advisory.id}: ${advisory.module_name}`)
    .sort();
  console.error(`Blocking production dependency findings:\n${findings.join("\n")}`);
  process.exit(1);
}
