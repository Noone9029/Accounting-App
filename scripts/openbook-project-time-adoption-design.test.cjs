"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const DOC_PATH = path.join(
  process.cwd(),
  "docs",
  "development",
  "openbooks-adoption",
  "OPENBOOK_PROJECT_TIME_TRACKING_ADOPTION_DESIGN.md",
);

test("OpenBook project/time tracking design records source, scope, and guardrails", () => {
  const text = fs.readFileSync(DOC_PATH, "utf8");

  for (const required of [
    "OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`",
    "Design only",
    "No OpenBook source copied",
    "Project and time tracking are optional domains",
    "No Prisma schema, migration, API endpoint, UI route, billing automation, payroll behavior, revenue recognition, invoice mutation, hosted mutation, provider call, or compliance claim is added by this design.",
    "Future implementation must prove tenant isolation, permissions, audit logging, and fiscal-lock behavior before any time entry can affect billing or accounting.",
    "LedgerByte journal lines remain the accounting source of truth.",
  ]) {
    assert.match(text, new RegExp(escapeRegExp(required)), `missing required design text: ${required}`);
  }

  assert.doesNotMatch(text, /\bproduction ready\b/i);
  assert.doesNotMatch(text, /\bready for production\b/i);
  assert.doesNotMatch(text, /\bZATCA\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(text, /\bUAE\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(text, /\bPeppol\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
