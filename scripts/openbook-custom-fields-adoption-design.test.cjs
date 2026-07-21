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
  "OPENBOOK_CUSTOM_FIELDS_ADOPTION_DESIGN.md",
);

test("OpenBook custom fields design records source, boundaries, and guardrails", () => {
  const text = fs.readFileSync(DOC_PATH, "utf8");

  for (const required of [
    "OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`",
    "Design only",
    "No OpenBook source copied",
    "Custom fields are optional metadata extensions, not accounting truth.",
    "No Prisma schema, migration, API endpoint, UI route, generated-document mutation, accounting mutation, provider call, hosted mutation, storage behavior, or compliance claim is added by this design.",
    "Custom-field values must never store secrets, raw provider payloads, customer document bodies, compliance credentials, OTPs, private keys, or access tokens.",
    "LedgerByte journal lines, source documents, and approved settings remain the authoritative accounting and compliance sources.",
  ]) {
    assert.match(text, new RegExp(escapeRegExp(required)), `missing required design text: ${required}`);
  }

  assert.doesNotMatch(text, /\bproduction ready\b/i);
  assert.doesNotMatch(text, /\bready for production\b/i);
  assert.doesNotMatch(text, /\bZATCA\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(text, /\bUAE\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(text, /\bPeppol\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(text, /\bobject[- ]storage\b.{0,80}\b(implemented|proven|enabled)\b/i);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
