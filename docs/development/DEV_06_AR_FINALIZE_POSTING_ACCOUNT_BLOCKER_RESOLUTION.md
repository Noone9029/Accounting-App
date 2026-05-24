# DEV-06 AR Finalize Posting Account Blocker Resolution

## Purpose And Scope

Purpose: resolve the DEV-06 Part 5 local fixture blocker that prevented a later approved retry from finalizing `INVOICE-000001`.

Scope was limited to local disposable fixture account dependencies for marker `DEV03-AR-20260524T130000`. This run did not finalize the invoice, call `SalesInvoiceService.finalize(...)`, edit the invoice, create another invoice, void, allocate, refund, create a credit note, generate output, send email, run ZATCA XML/signing/submission, run cleanup deletion, run migrations, seed/reset/delete, deploy, or change environment/provider settings.

## Blocker Summary

DEV-06 Part 5 stopped before mutation because the fixture organization had four marker-coded fixture accounts only:

- `DEV03-AR-ACCT-AR-20260524T130000`.
- `DEV03-AR-ACCT-REV-20260524T130000`.
- `DEV03-AR-ACCT-VAT-20260524T130000`.
- `DEV03-AR-ACCT-CASH-20260524T130000`.

Those accounts used `D3AR-...` codes. The sales invoice finalization service resolves required posting dependencies by fixed default chart codes:

- `120` for accounts receivable.
- `220` for VAT payable.

## Code Paths Inspected

- `apps/api/src/sales-invoices/sales-invoice.service.ts`.
- `apps/api/src/sales-invoices/sales-invoice-accounting.ts`.
- `apps/api/src/accounting/foundation-data.ts`.
- `apps/api/prisma/schema.prisma`.
- `apps/api/prisma/seed.ts`.
- `apps/api/scripts/dev04-fixture-runner.ts`.
- `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- DEV-04/DEV-05 fixture runner docs and DEV-06 finalize evidence docs.

## Fixture And Account Findings

- `SalesInvoiceService.finalize(...)` calls `findPostingAccountByCode(organizationId, "120", tx)` and `findPostingAccountByCode(organizationId, "220", tx)`.
- `findPostingAccountByCode(...)` requires the account to be in the same organization, active, and posting-enabled.
- `DEFAULT_ACCOUNTS` defines code `120` as `Accounts Receivable` and code `220` as `VAT Payable`.
- The fixture runner created marker-coded AR/VAT dependency accounts, but it did not create service-compatible default posting account codes.
- The Prisma model enforces unique account codes per organization, so adding `120` and `220` only inside the DEV03 fixture organization is narrow and isolated.

## Decision

Decision: use fixture repair plus a fixture runner improvement.

Rationale:

- Adding active posting account codes `120` and `220` to the local fixture org is the smallest safe fix and does not alter production accounting behavior.
- Updating the fixture runner prevents future AR fixtures from repeating the same blocker.
- Changing `SalesInvoiceService.finalize(...)` would alter normal posting-account resolution across real organizations and is larger/riskier than this fixture-only blocker warrants.

## Local Target Safety Result

- Latest inspected commit before Part 5B work: `331d14f2 Record DEV-06 AR invoice finalize blocker`.
- Docker Postgres container: running and healthy.
- Docker Redis container: running and healthy.
- `localhost:5432` reachability: passed.
- Target accepted only as local Docker PostgreSQL on `localhost:5432`.
- No production, beta/user-testing, deployed, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, shared, or customer-data target was used.
- Database URL, credentials, tokens, cookies, auth headers, request/response bodies, customer/vendor bodies, signed XML, QR payloads, attachment bodies, PDF bodies, and generated-document bodies were not recorded.

## Repair Performed

A temporary guarded local script created or repaired exactly these accounts in the fixture organization:

- `120`, `DEV03-AR-ACCT-120-20260524T130000`, type `ASSET`, active, posting allowed.
- `220`, `DEV03-AR-ACCT-220-20260524T130000`, type `LIABILITY`, active, posting allowed.

The script guarded the exact marker, family, invoice number, invoice safe id prefix, local target, and `DRAFT` invoice state. It did not import or call the invoice finalize service.

The temporary script was removed after execution and is not present, staged, or tracked.

## Fixture Runner Improvement

`apps/api/scripts/dev04-fixture-runner.ts` now includes service-required posting account dependencies for future AR fixture creation:

- code `120`, marker-safe name `DEV03-AR-ACCT-120-<runId>`.
- code `220`, marker-safe name `DEV03-AR-ACCT-220-<runId>`.

`apps/api/scripts/dev04-fixture-runner.spec.ts` was updated so the AR dry-run plan includes the new posting-account dependency record.

## Before And After Account Summary

Before repair:

- Account count: `4`.
- Active posting code `120`: `0`.
- Active posting code `220`: `0`.

After repair:

- Account count: `6`.
- Active posting code `120`: `1`.
- Active posting code `220`: `1`.
- Original marker-coded fixture accounts remained active and posting-enabled.

## Proof Invoice Was Not Finalized

Post-repair read-only verification:

- Invoice: `INVOICE-000001`.
- Safe id prefix: `6ebb2d71`.
- Status: `DRAFT`.
- Total: `287.5000`.
- Balance due: `287.5000`.
- `finalizedAt`: absent.
- `journalEntryId`: absent.
- `reversalJournalEntryId`: absent.
- Finalized invoice count: `0`.

## Proof No Forbidden AR Side Effects Occurred

Post-repair read-only counts:

- Journal entries: `0`.
- Voided invoices: `0`.
- Generated documents: `0`.
- Customer payments: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Customer payment allocations: `0`.
- Customer payment unapplied allocations: `0`.
- Credit note allocations: `0`.
- ZATCA invoice metadata: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- SalesInvoice audit logs: `2`.
- `SALES_INVOICE_FINALIZED` audit logs: `0`.
- Fixture org login audit logs: `0`.
- Cleanup deletion: not run.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- Targeted README and `BUG_AUDIT.md` reads.
- Code and doc searches for finalize account resolution and fixture runner behavior.
- Docker container status check.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- Read-only local SQL preflight summaries.
- Guarded temporary local account repair script.
- Read-only local SQL post-repair summaries.
- Temporary script presence check.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev04-fixture-runner.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/sales-invoices/sales-invoice-rules.spec.ts src/customer-payments/customer-payment-rules.spec.ts src/customer-refunds/customer-refund-rules.spec.ts src/credit-notes/credit-note-rules.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api typecheck`.
- `corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000`.
- `corepack pnpm verify:diff`.
- `git diff --check`.
- `git diff --cached --check` after staging intended files.

## Commands Skipped And Why

Skipped because Part 5B was account-blocker resolution only:

- Invoice finalize and `SalesInvoiceService.finalize(...)`.
- Invoice create, edit, or void.
- Payment, refund, credit-note, or allocation mutation.
- PDF, generated-document, export, download, archive, email, ZATCA XML/signing/QR/submission/clearance/reporting.
- Cleanup deletion.
- Migrations, seed/reset/delete.
- E2E, smoke, full test suite, full build, `verify:repo`, and actual `verify:ci:local`.
- Deploys, provider setting changes, environment changes, production-hosting research, backup, and restore.

## Blockers Or Deviations

No blocker remains for the posting-account dependency. The only intentional deviation from DEV-06 Part 5 is that Part 5B did not finalize the invoice.

## Conclusion

The posting-account blocker is resolved locally and for future AR fixtures without changing production accounting behavior. `INVOICE-000001` remains `DRAFT`, and forbidden AR side effects remain zero.

## Recommended Next Step

Proceed with `DEV-06 Part 5C: approved local AR invoice finalize mutation retry`.

## Part 5C Retry Result

Part 5C used the resolved posting-account dependencies and finalized `INVOICE-000001` locally.

Retry evidence: [DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md).

Result:

- Account code `120` and account code `220` remained active and posting-enabled before finalization.
- `SalesInvoiceService.finalize(...)` was called exactly once by the successful guarded retry script.
- Invoice status became `FINALIZED`.
- One posted journal entry was created with the expected debit to account `120`, credit to fixture revenue, and credit to account `220`.
- One `SALES_INVOICE_FINALIZED` audit log was created.
- One local `ZatcaInvoiceMetadata` row was created.
- Forbidden side effects stayed `0` for generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email, ZATCA signed drafts/submission logs, ZATCA XML/signing/QR/submission, and cleanup deletion.

Next prompt title: `DEV-06 Part 6: verify AR invoice finalize evidence`.

## Part 6 Evidence Verification Result

Part 6 verified the finalized invoice evidence with read-only local checks and performed no mutation.

Verification evidence: [DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md).

Posting account dependencies remain resolved:

- Account code `120` exists in the fixture org, active and posting allowed.
- Account code `220` exists in the fixture org, active and posting allowed.

`INVOICE-000001` remains `FINALIZED`; the expected posted journal, SalesInvoice audit trail, and local `ZatcaInvoiceMetadata` evidence remain valid. Forbidden side effects remain `0` for generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email, ZATCA signed drafts/submission logs, ZATCA XML/signing/QR/submission, and cleanup deletion.

Next prompt title: `DEV-06 Part 7: plan local AR invoice void mutation`.
