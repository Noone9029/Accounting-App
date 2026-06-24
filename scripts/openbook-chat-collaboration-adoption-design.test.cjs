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
  "OPENBOOK_CHAT_COLLABORATION_ADOPTION_DESIGN.md",
);

test("OpenBook chat collaboration design records source, separation, and guardrails", () => {
  const text = fs.readFileSync(DOC_PATH, "utf8");

  for (const required of [
    "OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`",
    "Design only",
    "No OpenBook source copied",
    "Chat and collaboration are optional discussion surfaces, not audit logs or accounting evidence.",
    "No Prisma schema, migration, API endpoint, UI route, realtime service, notification send, accounting mutation, provider call, hosted mutation, storage behavior, or compliance claim is added by this design.",
    "Collaboration messages must never store secrets, raw provider payloads, customer document bodies, compliance credentials, OTPs, private keys, access tokens, or generated-document source bodies.",
    "LedgerByte audit logs, journal lines, source documents, and approved evidence packages remain the authoritative records.",
  ]) {
    assert.match(
      text,
      new RegExp(escapeRegExp(required)),
      `missing required design text: ${required}`,
    );
  }

  assert.doesNotMatch(text, /\bproduction ready\b/i);
  assert.doesNotMatch(text, /\bready for production\b/i);
  assert.doesNotMatch(
    text,
    /\brealtime service\b.{0,80}\b(implemented|enabled|proven)\b/i,
  );
  assert.doesNotMatch(
    text,
    /\bZATCA\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i,
  );
  assert.doesNotMatch(
    text,
    /\bUAE\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i,
  );
  assert.doesNotMatch(
    text,
    /\bPeppol\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i,
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
