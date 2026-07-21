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
  "OPENBOOK_PAYMENT_INSTRUCTIONS_ADOPTION_DESIGN.md",
);

test("OpenBook payment instructions design records LedgerByte boundaries", () => {
  const text = fs.readFileSync(DOC_PATH, "utf8");

  for (const required of [
    "OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`",
    "Design only",
    "No OpenBook source copied",
    "Payment instructions are document-display metadata, not payment execution, bank-transfer posting, payment-gateway integration, provider onboarding, or settlement proof.",
    "No Prisma schema, migration, API endpoint, UI route, payment provider call, bank transfer, email send, hosted mutation, storage behavior, generated-document mutation, accounting mutation, or compliance claim is added by this design.",
    "Payment instruction records must never store secrets, full card numbers, online banking credentials, access tokens, private keys, OTPs, provider webhook secrets, raw provider payloads, customer document bodies, or generated-document source bodies.",
    "LedgerByte bank account profiles, journal entries, payment allocations, audit logs, generated documents, and approved evidence packages remain the authoritative records.",
  ]) {
    assert.match(
      text,
      new RegExp(escapeRegExp(required)),
      `missing required design text: ${required}`,
    );
  }

  assert.doesNotMatch(text, /\bproduction ready\b/i);
  assert.doesNotMatch(text, /\bready for production\b/i);
  assert.doesNotMatch(text, /\bpayment provider\b.{0,80}\b(implemented|enabled|proven|connected)\b/i);
  assert.doesNotMatch(text, /\bbank transfer\b.{0,80}\b(posted|executed|sent|settled)\b/i);
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
