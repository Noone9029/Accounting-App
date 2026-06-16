# UI Refund Collections Banking Detail Polish Sprint Closure

Date: 2026-06-16

Branch: `feature/ui-refund-collections-banking-detail-polish`

## Base And Merge Context

- PR `#57` (`Add detail-state accountant mobile visual QA`) was reverified and merged into `main` first.
- Latest `main` after PR `#57` merge: `c62a1a0f2232aca7fbffcf0400fed66f67d392b2`.
- This branch was created fresh from updated `origin/main`.
- The original ZATCA stash remained preserved and was not restored, dropped, overwritten, or mixed into this work.
- `codex/purchase-bill-seeded-uuid-validation` was left untouched.

## Scope

This was a frontend visual QA, fixture realism, and small route polish sprint only.

Changed scope:

- Local/test-only visual fixtures for refund, collections, banking, statement transaction, reconciliation, cheque, report, and document surfaces.
- New authenticated Playwright visual QA matrix.
- One debit-note detail mobile layout fix for destructive action sizing.
- Status, readiness, roadmap, audit, and closure documentation.

Unchanged scope:

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed/reset/delete.
- No production auth provider changes.
- No payment/accounting/business logic changes.
- No AR/AP state-machine changes.
- No UAE PINT-AE changes.
- No ZATCA changes.
- No provider integration changes.
- No hosted/customer-data mutation.
- No Vercel/Supabase commands.
- No production infrastructure commands.
- No production compliance claims.
- No fake automation, fake bank feed, fake AI, or fake provider connectivity.

## Fixture Approach

Refund and collections fixtures use existing app statuses and labels only.

Credit notes checked:

- Draft.
- Finalized.
- Applied.
- Unapplied.
- Partially applied.
- Voided.
- Long customer name.
- Long reason/note.
- Large amount.
- Zero-balance-after-application context.

Debit notes checked:

- Draft.
- Finalized.
- Applied.
- Unapplied.
- Partially applied.
- Voided.
- Long supplier name.
- Long reason/note.
- Large amount.
- Zero-balance-after-application context.

Customer collections checked:

- Overdue invoice list with multiple aging buckets.
- Partially paid invoice context.
- Unallocated payment context.
- Credit note available-to-apply context.
- Customer with long legal name and long address.
- Customer with no open balance.

Supplier payable context checked:

- Overdue bill/report context with aging buckets.
- Partially paid bill context.
- Unallocated supplier payment context.
- Debit note available-to-apply context.
- Supplier with long legal name and long address.
- Supplier with no open balance.

Banking and reconciliation fixtures use manual/local records only.

Bank accounts checked:

- Multiple accounts.
- Negative balance.
- Inactive account.
- Long bank account name.
- Currency display.
- Empty/list behavior.

Bank transactions checked:

- Manual/imported statement row wording already used by the app.
- Unmatched transaction.
- Matched transaction.
- Ignored/manual row context.
- Long description.
- Large amount.
- Debit/credit display.
- Empty/list behavior.

Reconciliation checked:

- Manual reconciliation summary route.
- Reconciliation list route.
- Reconciliation detail route.
- Unmatched transaction list/snapshot.
- Matched transaction list/snapshot.
- Empty/attention summary behavior.
- Review event visibility.

Cheques checked:

- Issued.
- Received.
- Cleared.
- Voided.
- Long payee/counterparty name.
- Large amount.
- Empty/list behavior.

## Routes Checked

Owner route matrix:

- `/sales/credit-notes`
- `/sales/credit-notes/new`
- `/sales/credit-notes/credit-note-partially-applied`
- `/sales/credit-notes/credit-note-voided`
- `/sales/credit-notes/credit-note-long-large`
- `/sales/customer-refunds`
- `/sales/customer-refunds/new?customerId=customer-long&sourceType=CREDIT_NOTE&sourceCreditNoteId=credit-note-unapplied`
- `/sales/customer-refunds/customer-refund-1`
- `/sales/collections`
- `/sales/collections/collection-case-visual`
- `/customers/customer-long`
- `/purchases/debit-notes`
- `/purchases/debit-notes/new`
- `/purchases/debit-notes/debit-note-partially-applied`
- `/purchases/debit-notes/debit-note-voided`
- `/purchases/debit-notes/debit-note-long-large`
- `/purchases/supplier-refunds`
- `/purchases/supplier-refunds/new?supplierId=supplier-long&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=debit-note-unapplied`
- `/purchases/supplier-refunds/supplier-refund-1`
- `/suppliers/supplier-long`
- `/bank-accounts`
- `/bank-accounts/bank-1`
- `/bank-accounts/bank-1/statement-transactions`
- `/bank-statement-transactions/statement-row-unmatched`
- `/bank-accounts/bank-1/reconciliation`
- `/bank-accounts/bank-1/reconciliations`
- `/bank-reconciliations/rec-1`
- `/bank-accounts/bank-1/cheques`
- `/reports/aged-receivables`
- `/reports/aged-payables`
- `/reports/general-ledger`
- `/documents`

Role route matrix:

- `/sales/credit-notes`
- `/sales/credit-notes/credit-note-partially-applied`
- `/sales/customer-refunds`
- `/sales/collections`
- `/purchases/debit-notes`
- `/purchases/supplier-refunds`
- `/bank-accounts`
- `/bank-accounts/bank-1/statement-transactions`
- `/bank-statement-transactions/statement-row-unmatched`
- `/bank-accounts/bank-1/reconciliation`
- `/bank-accounts/bank-1/reconciliations`
- `/bank-accounts/bank-1/cheques`

## Viewports Checked

- Desktop: `1440x1000`
- Tablet: `1024x768`
- Mobile: `390x844`

## Role Profiles Checked

- `Owner`
- `Accountant`
- `Viewer`

Owner checks confirmed allowed actions remain visible where expected.

Accountant checks focused on accounting-heavy readability and owner-only admin affordances staying absent.

Viewer checks confirmed mutation/create/finalize/refund/reconcile actions are hidden or blocked according to existing app behavior.

## Skipped Routes And States

Skipped routes because they do not exist:

- `/banking`
- `/reconciliation`
- `/cheques`
- `/customers/customer-collections`
- `/suppliers/supplier-payables`

Existing nested routes were covered instead for bank accounts, bank statement transactions, reconciliations, and cheques.

Skipped unsupported states:

- Cancelled credit/debit note state, because the current app exposes `VOIDED`, not `CANCELLED`.
- Stale cheque state, because the current app exposes `DRAFT`, `RECEIVED`, `ISSUED`, `DEPOSITED`, `CLEARED`, `BOUNCED`, and `VOIDED`.
- Split bank transaction display, because no split-transaction UI exists in the current bank statement routes.
- Supplier collections route, because the current app has payables detail/report surfaces, not a supplier collections route.

## Issues Found And Fixed

- Fixed debit note detail mobile action layout so the `Void` button no longer stretches full-width and visually dominates the action stack.
- Added supplier long-detail AP summary fixture handling so `/suppliers/supplier-long` resolves its AP panel.
- Calibrated banking visual assertions to current route labels such as `Link account` and `Statement transaction review`.
- Calibrated Viewer banking/reconciliation checks so expected access-denied states are accepted as restricted views.

## Artifact Policy

Generated artifacts:

- `artifacts/visual-qa/refund-collections-banking-detail-polish/`
- `artifacts/visual-qa/refund-collections-banking-detail-polish/visual-results.json`

The artifact directory contains screenshot PNGs and the visual report. `artifacts/` is ignored, and the screenshots/report are intentionally not committed.

## Verification

Focused visual QA command:

```powershell
corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/refund-collections-banking-detail-polish.visual.spec.ts --reporter=line
```

Result:

- `168 passed`

Additional verification is recorded in the PR body and final handoff after the full local gate completes.

## Claim Boundaries

- No backend/API/schema/auth/provider/UAE PINT-AE/ZATCA behavior changed.
- No production compliance claim was made.
- No fake bank feed or reconciliation automation claim was made.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.

## Remaining UI Scope

- Report drilldown visual QA.
- Dense entry-form ergonomics.
- Secondary operational route polish.
- Accountant review of final refund/banking wording and layout.
