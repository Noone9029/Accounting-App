"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SCHEMA_PATH = path.join(process.cwd(), "apps", "api", "prisma", "schema.prisma");
const MIGRATION_PATH = path.join(
  process.cwd(),
  "apps",
  "api",
  "prisma",
  "migrations",
  "20260621100000_add_payment_instruction_templates",
  "migration.sql",
);

test("payment instruction schema foundation is additive and display-only", () => {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const migration = fs.readFileSync(MIGRATION_PATH, "utf8");

  for (const required of [
    "enum PaymentInstructionTemplateType",
    "enum PaymentInstructionTemplateStatus",
    "enum PaymentInstructionDocumentScope",
    "model PaymentInstructionTemplate",
    "model OrganizationDocumentDefault",
    "model PaymentInstructionRenderSnapshot",
    "paymentInstructionTemplates",
    "organizationDocumentDefaults",
    "paymentInstructionRenderSnapshots",
    "@@unique([organizationId, normalizedLabel])",
    "@@unique([organizationId, documentScope])",
    "@@unique([generatedDocumentId])",
    "@@index([organizationId, status])",
    "@@index([organizationId, documentScope])",
    "@@index([organizationId, sourceType, sourceId])",
  ]) {
    assert.match(schema, new RegExp(escapeRegExp(required)), `schema missing ${required}`);
  }

  for (const required of [
    "Add payment instruction template, document default, and render snapshot schema only.",
    "CREATE TYPE \"PaymentInstructionTemplateType\" AS ENUM",
    "CREATE TYPE \"PaymentInstructionTemplateStatus\" AS ENUM",
    "CREATE TYPE \"PaymentInstructionDocumentScope\" AS ENUM",
    "CREATE TABLE \"PaymentInstructionTemplate\"",
    "CREATE TABLE \"OrganizationDocumentDefault\"",
    "CREATE TABLE \"PaymentInstructionRenderSnapshot\"",
    "CREATE UNIQUE INDEX \"PaymentInstructionTemplate_organizationId_normalizedLabel_key\"",
    "CREATE UNIQUE INDEX \"PaymentInstructionTemplate_one_active_default_per_org\"",
    "CREATE UNIQUE INDEX \"OrganizationDocumentDefault_organizationId_documentScope_key\"",
    "CREATE UNIQUE INDEX \"PaymentInstructionRenderSnapshot_generatedDocumentId_key\"",
    "ALTER TABLE \"PaymentInstructionTemplate\" ADD CONSTRAINT \"PaymentInstructionTemplate_bankAccountProfileId_fkey\"",
    "ALTER TABLE \"OrganizationDocumentDefault\" ADD CONSTRAINT \"OrganizationDocumentDefault_defaultPaymentInstructionTemplateId_fkey\"",
    "ALTER TABLE \"PaymentInstructionRenderSnapshot\" ADD CONSTRAINT \"PaymentInstructionRenderSnapshot_generatedDocumentId_fkey\"",
  ]) {
    assert.match(migration, new RegExp(escapeRegExp(required)), `migration missing ${required}`);
  }

  assert.doesNotMatch(migration, /^INSERT\b/im);
  assert.doesNotMatch(migration, /^UPDATE\b/im);
  assert.doesNotMatch(migration, /^DELETE\b/im);
  assert.doesNotMatch(migration, /ALTER TABLE "SalesInvoice"/);
  assert.doesNotMatch(migration, /ALTER TABLE "SalesQuote"/);
  assert.doesNotMatch(migration, /ALTER TABLE "RecurringInvoiceTemplate"/);
  assert.doesNotMatch(migration, /ALTER TABLE "GeneratedDocument" ADD COLUMN/);
  assert.doesNotMatch(migration, /\bpayment provider\b/i);
  assert.doesNotMatch(migration, /\bbank transfer\b.{0,80}\b(posted|executed|sent|settled)\b/i);
  assert.doesNotMatch(migration, /\bZATCA\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(migration, /\bUAE\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  assert.doesNotMatch(migration, /\bPeppol\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
