# Accounting Concurrency Idempotency Regression Sprint Closure

Date: 2026-06-18

Branch: `feature/accounting-concurrency-idempotency-regression`

Base: clean `origin/main` at `5d6a084635cca7080977920fa236173055804e3f` after PR #73.

## Scope

This was a local-only accounting concurrency and idempotency regression pass. The goal was to inspect duplicate and parallel mutation risk in the shared LedgerByte accounting core, add API-level regression coverage where local architecture supports it, and fix only real defects exposed by tests.

## Safety Boundaries

- No hosted command was run.
- No hosted/customer data was mutated.
- No Supabase command was run.
- No Vercel deploy command was run.
- No production database command was run.
- No seed, reset, delete, schema change, Prisma migration, SQL template application, RLS rollout, runtime role application, object-storage mutation, signed URL generation, provider call, Peppol call, ZATCA call, real bank feed, payment processor integration, or real email was performed.
- No ZATCA production work or UAE Peppol/PINT-AE/ASP production work was added.
- No production compliance, provider, certification, or security-certification claim was added.

## Mutation Path Inventory

Covered local accounting mutation surfaces include:

- Sales invoice creation, update, finalization, voiding, deletion, PDF generation, and ZATCA readiness metadata creation during local finalization.
- Customer payment creation, direct allocation, unapplied allocation, unapplied reversal, voiding, deletion, and receipt generation.
- Credit note creation, finalization, application, allocation reversal, voiding, deletion, and PDF generation.
- Purchase bill creation, update, finalization, voiding, deletion, PDF generation, purchase-bill accounting preview, debit-note listing, and payment/debit-note allocation listing.
- Supplier payment creation, direct allocation, unapplied allocation, unapplied reversal, voiding, deletion, and receipt generation.
- Purchase debit note creation, finalization, application, allocation reversal, voiding, deletion, and PDF generation.
- Journal entry creation, update, posting, reversal, and deletion.
- Bank statement import, match candidate lookup, manual matching, categorization, ignore, import voiding, transaction listing, and reconciliation summary.
- Bank reconciliation create, workflow transitions, close/reopen/void, report output, and review events.
- Audit log append behavior around these service mutations.
- Controller-level permission metadata from the accounting tenant-isolation regression.

## Regression Coverage Added

Added `apps/api/src/accounting-concurrency-idempotency-regression.spec.ts`.

New local regression coverage:

- Duplicate sales invoice finalization attempts result in one journal post and one ZATCA metadata upsert while both callers observe the finalized document.
- Duplicate customer payment allocation attempts against the same invoice result in one committed payment/allocation/journal and one rejected stale allocation attempt, leaving invoice balance at zero instead of negative.
- Stale bank statement manual match attempts now reject before a second write can overwrite an already matched statement transaction.

Existing local coverage relevant to this pass already covered:

- Sales invoice duplicate/stale finalization, finalized invoice update rejection, finalization rollback when journal creation fails, and void idempotency behavior.
- Customer payment stale allocation guards, duplicate invoice allocation rejection, rollback of invoice/payment/allocation/journal/sequence state after creation failure, unapplied allocation guards, reversal guards, and void restoration guards.
- Credit note stale credit/invoice allocation guards, reversal guards, finalization guards, and allocation overrun checks.
- Purchase bill finalization guards, stale finalization claim behavior, void blocking with active payment/debit-note allocations, and journal rollback paths.
- Supplier payment direct allocation, unapplied allocation, reversal, and void restoration guards.
- Purchase debit note application and reversal guards.
- Bank statement categorization conditional claim behavior.
- Accounting tenant/RBAC metadata over accounting and accounting-adjacent controllers.

## Bug Found And Fixed

Manual bank statement matching used a read-then-unconditional-update sequence:

- The service loaded an `UNMATCHED` statement transaction.
- It validated a compatible journal line.
- It then updated by `id` only.

That left a stale parallel match request able to overwrite a transaction that had already been matched after the first read. The fix changes manual matching to use a conditional `updateMany` claim with `id`, `organizationId`, and `status: UNMATCHED`. A stale claim miss now raises `Only unmatched bank statement transactions can be matched.` and does not audit a match.

Files changed for the fix:

- `apps/api/src/bank-statements/bank-statement.service.ts`
- `apps/api/src/bank-statements/bank-statement.service.spec.ts`
- `apps/api/src/accounting-concurrency-idempotency-regression.spec.ts`

## Blocked Or Not Fully Proved Locally

These remain future blockers or design gaps:

- API idempotency keys for client retries are not implemented for accounting mutations.
- No new unique constraint, optimistic version column, explicit row-lock helper, or serializable transaction strategy was added in this pass because that would require schema or migration approval.
- Hosted/customer-data behavior was not exercised.
- Multi-process database concurrency was not exercised against staging or hosted data.
- Bank reconciliation workflow double-action behavior still needs deeper transaction-level stress coverage beyond existing unit/service tests.
- Journal entry posting/reversal would benefit from a dedicated duplicate-post/reverse regression file before production use.
- Generated document creation and attachment workflows were inventoried but not expanded in this pass because no accounting mutation defect was found there.
- Background jobs or async accounting actions were not found as a separate implemented mutation layer to test.

## Edition Safety

This branch touched API service/test code and docs only. It did not change frontend edition gating or country-specific surfaces.

- Generic remains neutral by default.
- KSA remains limited to ZATCA/Fatoora-gated surfaces where already implemented.
- UAE remains limited to UAE eInvoicing / Peppol / PINT-AE / ASP readiness surfaces where already implemented.
- No Generic output gained KSA/UAE active compliance wording.
- No KSA output gained UAE/Peppol/PINT-AE active wording.
- No UAE output gained ZATCA/Fatoora active wording.

## Verification So Far

Initial red signal:

- `corepack pnpm --filter @ledgerbyte/api test -- accounting-concurrency` failed before the service fix because the stale bank-match test resolved instead of rejecting.

Post-fix targeted verification:

- `corepack pnpm --filter @ledgerbyte/api test -- accounting-concurrency` passed after the bank-match conditional claim fix.

Full verification is recorded in the final PR/report for this branch.

## Remaining Production Blockers

- Approved staging/proof credentials and synthetic tenant IDs.
- Staging tenant isolation proof execution.
- Least-privilege API runtime database role application in staging.
- RLS staging proof or an explicitly accepted compensating control.
- Storage/signed URL proof.
- Backup/restore proof.
- Hosted multi-process accounting race evidence.
- Observability evidence.
- Security/accounting/legal owner sign-off.
- UAE ASP/Peppol provider evidence.
- ZATCA production credentials.

## Recommended Next Prompt

`Design accounting idempotency key and locking strategy`
