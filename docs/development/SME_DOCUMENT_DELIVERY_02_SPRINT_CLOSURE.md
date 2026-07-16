# SME-DOCUMENT-DELIVERY-02 Sprint Closure

Date: 2026-07-16

Branch: `codex/sme-document-delivery-02`

Dependency base: `92abd403efbad760260b03713335eea229e9c8f5` (`origin/main` after PR #376)
Implementation checkpoint: `cb2ed0e0`
Draft PR: [#377](https://github.com/Noone9029/Accounting-App/pull/377)  
Remote branch SHA at draft creation: `407f9e16ea610c5b1715949c9648b8e08a12243a`

## Outcome

Customer-facing PDF email delivery now reuses the PR #376 queue, outbox, worker, attachment-integrity, suppression, retry, and provider-acceptance path for:

- sales quotes and proformas;
- finalized credit notes;
- posted customer-payment receipts; and
- customer statement snapshots for `CUSTOMER` and `BOTH` contacts.

Queueing creates one immutable generated-document reference and one safe outbox record. It does not call an email provider. The worker verifies tenant/source ownership, PDF MIME, filename, size, byte length, and content hash before sending. Same-key replay returns the existing safe history record; a changed payload or statement period conflicts before another PDF is generated.

## API and permission surface

| Source | Queue endpoint | History endpoint | Eligibility | Permission |
| --- | --- | --- | --- | --- |
| Sales quote / proforma | `POST /sales-quotes/:id/email-deliveries` | `GET /sales-quotes/:id/email-deliveries` | `SENT` or `ACCEPTED` | `salesInvoices.send` / `salesInvoices.view` |
| Credit note | `POST /credit-notes/:id/email-deliveries` | `GET /credit-notes/:id/email-deliveries` | `FINALIZED` | `creditNotes.send` / `creditNotes.view` |
| Customer payment receipt | `POST /customer-payments/:id/email-deliveries` | `GET /customer-payments/:id/email-deliveries` | `POSTED` | `customerPayments.send` / `customerPayments.view` |
| Customer statement | `POST /contacts/:id/email-deliveries` | `GET /contacts/:id/email-deliveries` | `CUSTOMER` or `BOTH`; `asOf` required | `contacts.sendCustomerStatements` / `contacts.view` |

The additive migration is `apps/api/prisma/migrations/20260716143000_add_customer_document_email_delivery/migration.sql`. It adds source-neutral outbox metadata, quote document kind, and the new template/document enum values. No hosted migration was run.

## Statement snapshot identity

Statement dates are normalized to exact `YYYY-MM-DD` values. An omitted `to` becomes `asOf`; `from` cannot exceed `asOf`. The PDF is generated from the authoritative `ContactLedgerService` snapshot data and is archived as `CustomerStatement` with a tenant-owned source identity derived from the contact and normalized period. The bounded period is retained as safe context metadata only; statement body content and PDF bytes are not stored in `EmailOutbox`.

## Worker and concurrency evidence

- Mock-only lifecycle proof: 2 tests pass; queue made zero provider calls, explicit worker execution sent once with a verified PDF attachment, and replay did not create another outbox row.
- Worker service suite: 11 tests pass.
- Broader document regression: 8 suites and 42 tests pass.
- The local PostgreSQL two-worker race fixture compiles and remains skipped because the installed PostgreSQL 17 Windows service is stopped and cannot be opened from this session. No hosted database, URL, credential, or real customer data was used.

## Verification evidence

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate`: passed.
- Prisma validate with disposable local PostgreSQL connection settings: passed; no migration was applied.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: API 272 suites passed, 1 local DB suite skipped; 2,616 API tests passed with 36 skipped. Web 191 suites and 871 tests passed.
- `corepack pnpm build`: passed for all workspace packages, API, and web.
- `corepack pnpm verify:diff`: passed.
- `corepack pnpm verify:ci:local`: passed, including the same full local test/build path and credential/cleanup checks.
- `git diff --check`: passed.

## Independent review

Review searched the changed surface for credentials, SMTP passwords, tokens, provider payloads, real addresses, PDF/base64 persistence, raw idempotency keys, misleading delivery claims, and unrelated accounting/compliance changes.

- Critical findings: none.
- Important findings: one generic service/worker error family retained invoice-only wording after generalization; corrected to source-neutral “document email” wording and rechecked type/lint/CI gates.
- Minor findings: generated `apps/web/next-env.d.ts` route-reference churn from the Next build was reverted and is not part of the implementation.

## Explicit boundaries and remaining production gates

This arc did not send real email, configure SMTP credentials, call a provider, deploy, mutate hosted state, apply a hosted migration, use production/customer data, change accounting postings or reports, or change ZATCA, UAE FTA, or Peppol behavior. The mock provider and local worker tests prove queue/worker behavior only. Production SMTP/provider readiness, hosted migration approval, deployment, monitoring, and real recipient testing remain separate release gates.

PR #377 is open as a draft and is not merged. The protected root checkout modification `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` remains untouched.
