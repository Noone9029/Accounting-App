#!/usr/bin/env node
const { parseArgs, runValidationSet, usage, writeEvidence } = require("./zatca-sdk-validate-local-lib.cjs");

main();

function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      console.log(usage());
      return;
    }

    const evidence = runValidationSet({ parsed, cwd: process.cwd(), env: process.env });
    const writtenPath = writeEvidence(parsed.out, evidence, process.cwd());
    const payload = writtenPath ? { ...evidence, evidenceWrittenTo: writtenPath } : evidence;

    if (parsed.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(formatHuman(payload));
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeError(error) }, null, 2));
    process.exitCode = 1;
  }
}

function formatHuman(evidence) {
  const lines = [
    `ZATCA SDK local validation: ${evidence.summary.passedCount} passed, ${evidence.summary.failedCount} failed, ${evidence.summary.blockedCount} blocked`,
    `Run: ${evidence.validationRunId}`,
    `No network calls made: ${evidence.networkCallsMade === false ? "true" : "false"}`,
    `Production compliance enabled: ${evidence.productionComplianceEnabled === false ? "false" : "true"}`,
  ];
  for (const run of evidence.runs) {
    lines.push(`- ${run.fixtureId}: ${run.status}${run.blockers.length ? ` (${run.blockers.join("; ")})` : ""}`);
  }
  if (evidence.evidenceWrittenTo) {
    lines.push(`Evidence: ${evidence.evidenceWrittenTo}`);
  }
  return lines.join("\n");
}

function safeError(error) {
  return String(error?.message || error)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/(password|token|secret|apiKey|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}
