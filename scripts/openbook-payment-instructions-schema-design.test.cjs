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
  "OPENBOOK_PAYMENT_INSTRUCTIONS_SCHEMA_DESIGN.md",
);

test("payment instructions schema design keeps LedgerByte boundaries explicit", () => {
  const text = fs.readFileSync(DOC_PATH, "utf8");

  for (const required of [
    "OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`",
    "Schema design only",
    "No OpenBook source copied",
    "No Prisma schema change, migration, generated Prisma client, API endpoint, UI route, payment provider call, bank transfer, hosted mutation, storage behavior, generated-document mutation, accounting mutation, or compliance claim is added by this design.",
    "`PaymentInstructionTemplate`",
    "`OrganizationDocumentDefault`",
    "`PaymentInstructionRenderSnapshot`",
    "Payment instructions remain display metadata and must not create, post, allocate, settle, transmit, reconcile, archive, or certify anything.",
    "Number sequences remain the only source for invoice, quote, receipt, statement, and payment numbering.",
    "Generated-document snapshots must be immutable after the explicit document generation action stores them.",
    "LedgerByte bank account profiles, journal entries, customer payment allocations, supplier payment allocations, audit logs, generated documents, and approved evidence packages remain the authoritative records.",
  ]) {
    assert.match(
      text,
      new RegExp(escapeRegExp(required)),
      `missing required schema design text: ${required}`,
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
