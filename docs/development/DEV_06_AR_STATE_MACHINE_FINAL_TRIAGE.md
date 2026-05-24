# DEV-06 AR State-Machine Final Triage

## Purpose And Scope

DEV-06 exercised one local-only Sales/AR invoice lifecycle slice against approved disposable fixture data.

Scope covered:

- draft invoice creation.
- draft invoice edit.
- draft evidence verification.
- finalization planning.
- finalization preflight blocker capture.
- posting-account fixture repair.
- finalization retry.
- finalization evidence verification.
- void planning.
- void mutation.
- void evidence verification.

The fixture boundary stayed local-only:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture invoice: `INVOICE-000001`.
- Safe invoice id prefix: `6ebb2d71`.
- No production, beta/user-testing, deployed, shared, or customer-data target was used.

This final triage is documentation/read-only only. It did not create, edit, finalize, void, repeat void, allocate, refund, credit-note, export, download, generate PDF, archive, email, run ZATCA XML/signing/submission, delete fixtures, migrate, seed/reset/delete, deploy, change persisted environment configuration, change provider settings, change schema, or run login/browser audit-writing flows.

## Timeline And Part-By-Part Summary

| Part | Commit | Action | Mutation | Result | Evidence | Blockers found or resolved |
| --- | --- | --- | --- | --- | --- | --- |
| Part 1 | `c4e23862 Plan DEV-06 AR state-machine QA` | Created the AR state-machine QA plan. | No. | Selected the first local mutation slice: draft invoice create/edit. | [DEV_06_AR_STATE_MACHINE_QA_PLAN.md](DEV_06_AR_STATE_MACHINE_QA_PLAN.md) | No blocker; future mutations required explicit approval. |
| Part 2 | `c4727abc Run DEV-06 AR draft invoice mutation` | Created and edited one draft invoice. | Yes, one approved local draft create/edit slice. | `INVOICE-000001` existed as `DRAFT`, total and balance due `287.5000`, no journal or output side effects. | [DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md](DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md) | None. |
| Part 3 | `ce20a315 Verify DEV-06 AR draft invoice evidence` | Verified draft invoice evidence read-only. | No. | Draft invoice evidence remained valid; side-effect counts remained safe. | [DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md](DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md) | None. |
| Part 4 | `60a39c56 Plan DEV-06 AR invoice finalize mutation` | Planned local finalization. | No. | Expected `DRAFT -> FINALIZED`, one posted journal, one `SALES_INVOICE_FINALIZED`, and local ZATCA metadata upsert. | [DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md) | Required explicit Part 5 approval before mutation. |
| Part 5 | `331d14f2 Record DEV-06 AR invoice finalize blocker` | Ran approved finalization preflight. | No; stopped before service mutation. | Invoice remained `DRAFT`. | [DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md) | Blocked by missing active posting account codes `120` and `220` in fixture organization. |
| Part 5B | `a8d4dc01 Resolve DEV-06 AR finalize account blocker` | Repaired fixture posting-account dependencies and fixture runner. | Yes, fixture account repair only; no invoice lifecycle mutation. | Accounts `120` and `220` existed as active posting fixture accounts; invoice remained `DRAFT`. | [DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md](DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md) | Posting-account blocker resolved without changing production finalization behavior. |
| Part 5C | `7b48e6a1 Retry DEV-06 AR invoice finalize mutation` | Retried finalization. | Yes, one approved local finalization. | Invoice became `FINALIZED`; journal `JOURNAL_ENTRY-000001` was posted; local `ZatcaInvoiceMetadata` was created. | [DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md](DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md) | Earlier local temp-script launch/DI attempts failed before mutation; successful run called finalization once. |
| Part 6 | `4f28f409 Verify DEV-06 AR invoice finalize evidence` | Verified finalization evidence read-only. | No. | Finalized invoice, posted journal, audit, and ZATCA metadata evidence remained valid. | [DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md) | None. |
| Part 7 | `3c9214c3 Plan DEV-06 AR invoice void mutation` | Planned local void mutation. | No. | Expected `FINALIZED -> VOIDED`, one posted reversal journal, original journal `REVERSED`, and one `SALES_INVOICE_VOIDED`. | [DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md](DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md) | Required explicit Part 8 approval before mutation. |
| Part 8 | `9a3b1a26 Run DEV-06 AR invoice void mutation` | Voided the finalized invoice. | Yes, one approved local void. | Invoice became `VOIDED`; original journal became `REVERSED`; reversal journal `JOURNAL_ENTRY-000002` was posted. | [DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md](DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md) | None. |
| Part 9 | `ed0ed558 Verify DEV-06 AR invoice void evidence` | Verified void evidence read-only. | No. | Void, reversal journal, audit, ZATCA metadata, and no-side-effect evidence remained valid. | [DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md](DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md) | None. |

## Final State Summary

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Invoice: `INVOICE-000001`.
- Safe invoice id prefix: `6ebb2d71`.
- Final invoice status: `VOIDED`.
- Invoice total: `287.5000`.
- Invoice balance due: `0.0000`.
- `finalizedAt`: present.
- `journalEntryId`: present and linked to original journal.
- `reversalJournalEntryId`: present and linked to reversal journal.
- Original journal: `JOURNAL_ENTRY-000001`, status `REVERSED`.
- Reversal journal: `JOURNAL_ENTRY-000002`, status `POSTED`, balanced at debit `287.5000` and credit `287.5000`.
- SalesInvoice audit actions: `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, `SALES_INVOICE_VOIDED`.
- Fixture login/auth audit logs: `0`.
- Local `ZatcaInvoiceMetadata`: `1`, type `STANDARD_TAX_INVOICE`.
- Generated documents, customer payments, customer refunds, credit notes, customer payment allocations, customer payment unapplied allocations, credit note allocations, email outbox records, email provider events, ZATCA signed artifact drafts, ZATCA submission logs, and cleanup deletion remained `0`.

## State-Machine Coverage Completed

DEV-06 proved these local fixture behaviors:

- Draft sales invoice creation.
- Draft sales invoice edit.
- Draft invoice evidence integrity after mutation.
- Finalize preflight blocking behavior when service-required posting account codes are missing.
- Fixture posting-account dependency repair for codes `120` and `220`.
- Finalize transition from `DRAFT` to `FINALIZED`.
- Finalization journal posting for AR, revenue, and VAT.
- Local `ZatcaInvoiceMetadata` upsert boundary during finalization.
- Finalized invoice evidence integrity.
- Void transition from `FINALIZED` to `VOIDED`.
- Reversal journal posting during finalized invoice void.
- Original journal status change from `POSTED` to `REVERSED`.
- SalesInvoice audit trail across create, update, finalize, and void.
- No automatic PDF, generated-document archive, email, ZATCA XML, signing, QR, submission, clearance, or reporting side effects during the invoice lifecycle slice.
- No payments, refunds, credit notes, or allocations were created during the invoice lifecycle slice.

## Accounting Evidence Summary

Invoice amounts:

- Revenue/taxable amount: `250.0000`.
- VAT: `37.5000`.
- Total: `287.5000`.

Finalization journal `JOURNAL_ENTRY-000001`:

- Debit account `120` AR: `287.5000`.
- Credit fixture revenue account: `250.0000`.
- Credit account `220` VAT: `37.5000`.
- Final status after void: `REVERSED`.

Void reversal journal `JOURNAL_ENTRY-000002`:

- Debit account `220` VAT: `37.5000`.
- Debit fixture revenue account: `250.0000`.
- Credit account `120` AR: `287.5000`.
- Final status: `POSTED`.

Final journal count for the fixture organization: `2`.

## Audit Evidence Summary

SalesInvoice audit action sequence:

1. `SALES_INVOICE_CREATED`.
2. `SALES_INVOICE_UPDATED`.
3. `SALES_INVOICE_FINALIZED`.
4. `SALES_INVOICE_VOIDED`.

Auth/login audit logs stayed `0`. No browser/login flows were used during DEV-06. Full audit payload bodies, session metadata, tokens, auth headers, IP headers, and user-agent bodies were not recorded in the evidence docs.

## ZATCA, Output, And Email Boundary Summary

- Local `ZatcaInvoiceMetadata` was created by finalization.
- The metadata remained present after void.
- `zatcaInvoiceType` remained `STANDARD_TAX_INVOICE`.
- No ZATCA XML generation, signing, QR generation, submission, clearance, or reporting was run.
- No ZATCA signed artifact draft or submission log was created.
- No invoice PDF, generated document, archive, export, download, or document-body inspection occurred.
- No email outbox or provider event records were created.

## Fixes And Code Changes From DEV-06

DEV-06 changed fixture support, not production accounting behavior:

- DEV-06 Part 5B added active posting account codes `120` and `220` to the local DEV03-AR fixture organization.
- DEV-06 Part 5B updated the DEV04/DEV05 fixture runner so future AR fixture plans include service-required posting account dependencies.
- DEV-06 Part 5B updated the fixture-runner targeted test for the AR posting-account dependency.
- `SalesInvoiceService.finalize(...)` production behavior was not changed.
- No schema change was made.
- No migration was created or run.

## Remaining AR Gaps

DEV-06 intentionally did not cover:

- Customer payment creation and allocation against a finalized invoice.
- Customer payment void and reversal behavior.
- Customer refund source and void behavior.
- Credit note create, edit, finalize, apply, reverse allocation, and void behavior.
- Invoice PDF, export, download, and generated-document archive gates.
- Email sending gates and customer communication flows.
- ZATCA XML generation, signing, QR generation, submission, clearance, and reporting lifecycle.
- Browser/authenticated UI QA.
- API/controller-level authenticated QA.
- Cleanup/deletion policy for local fixture data.
- Idempotency or repeated finalize/void behavior beyond guarded non-repeat paths.
- Allocation blockers on invoice void.
- Fiscal-period lock and closed-period behavior across invoice finalization and reversal.

## Risks, Blockers, And Deviations

- The posting-account blocker was real: the original fixture organization used marker-scoped account codes while `SalesInvoiceService.finalize(...)` required active posting codes `120` and `220`.
- The blocker was resolved with local fixture repair plus fixture-runner improvement, not by changing production invoice finalization logic.
- Part 5C recorded temporary script invocation/DI attempts that failed before mutation; read-only checks confirmed no state changed before the successful finalization retry.
- Unrelated dirty/untracked web marketing and graphify files remained outside DEV-06 and were not staged.
- DEV-06 fixture data remains in the local disposable database as evidence.
- Cleanup deletion was not approved and was not run.

## Recommended Next Workstream

Recommended next ticket:

```text
DEV-07 Part 1: AR payment allocation state-machine plan
```

Rationale:

- DEV-06 proved the invoice lifecycle without allocations.
- Payment allocation is the next highest Sales/AR accounting-risk path because it affects AR balances, cash/bank postings, unapplied amounts, void blockers, and later refund behavior.
- DEV-07 should start with a plan before mutation, using the same local-only fixture, read-only preflight, explicit approval phrases, and safe-evidence pattern used by DEV-06.

Later workstreams can cover:

- AR credit notes.
- AR refunds.
- AP state-machine QA.
- Banking and reconciliation QA.
- PDF/output lifecycle QA.
- ZATCA lifecycle QA.
