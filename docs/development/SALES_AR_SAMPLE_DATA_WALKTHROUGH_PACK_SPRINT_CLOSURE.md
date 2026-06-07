# Sales/AR Sample Data and Accountant Walkthrough Pack Sprint Closure

Date: 2026-06-04

Product: LedgerByte

Sprint: Sales/AR Sample Data and Accountant Walkthrough Pack Sprint

## Summary

Prepared a docs-only Sales/AR accountant walkthrough pack for controlled beta/user-testing review. The sprint created guided review scripts, synthetic sample-data planning, expected checkpoints, route checklist coverage, an empty findings log, and external sample-output naming guidance.

No app behavior, API behavior, database schema, seed data, PDF output, accounting calculation, posting behavior, payment behavior, email behavior, ZATCA behavior, VAT filing behavior, inventory behavior, production infrastructure, hosted data, or customer data was changed.

## Walkthrough Docs Created

- `docs/accountant-review/SALES_AR_WALKTHROUGH_PACK.md`
- `docs/accountant-review/SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`
- `docs/accountant-review/SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`
- `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`
- `docs/accountant-review/SALES_AR_ROUTE_REVIEW_CHECKLIST.md`
- `docs/accountant-review/SALES_AR_SAMPLE_OUTPUT_NAMING_GUIDE.md`

## Sample Data Planned

The synthetic sample plan covers:

- Fake main customer and secondary customer.
- Fake service and optional product-style line item.
- Fake revenue account and 15% VAT/tax example.
- Tax exclusive, tax inclusive, and no-tax invoices.
- Quote awaiting acceptance.
- Accepted quote converted to draft invoice.
- Recurring invoice template due for manual generation.
- Generated draft invoice from recurring template.
- Delivery notes sourced from invoice and accepted quote.
- Collection case linked to overdue invoice.
- Promise-to-pay and disputed collection scenarios.
- Customer payment, credit note, and optional refund scenario.
- AR Aging, VAT Summary, VAT Return, and dashboard attention examples.

The plan intentionally does not create or execute the sample data.

## Expected Results And Checkpoints

The expected-results checklist covers:

- Sales invoice draft/finalized behavior, account coding, tax modes, balances, and PDF labels.
- Quote non-posting behavior, accepted status, conversion to draft invoice, and Sales Quote PDF wording.
- Recurring invoice template non-posting behavior, schedule preview, manual generation, and generated draft invoice wording.
- Delivery note fulfillment wording, source visibility, PDF labels, and no AR/VAT/inventory movement by itself.
- Collections follow-up wording, activity timeline, promise-to-pay, planned email/reminder, and no payment/email/legal automation behavior.
- Customer ledger/activity boundaries.
- AR Aging, VAT Summary, VAT Return, Tax workspace, and dashboard read-only attention behavior.

## Findings Intake

`docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md` is intentionally empty and ready for reviewer use.

No accountant findings were invented, approved, or implemented in this sprint. Future findings must be recorded with reviewer context, route/output, severity, finding type, expected behavior, actual behavior, recommendation, owner, status, and decision needed before implementation.

## Packet Links

The accountant review packet and Sales/AR review docs now point reviewers to the walkthrough pack, synthetic sample-data plan, expected-results checklist, route checklist, findings log, and sample-output naming guide.

## Intentionally Not Executed

This sprint intentionally did not run:

- Seed scripts.
- Reset/delete operations.
- Fixture creation.
- Smoke tests.
- Browser E2E.
- PDF generation.
- Hosted/beta/customer-data workflows.
- Real email sends.
- Payment links or payment gateway behavior.
- VAT filing.
- ZATCA network calls.
- Backup/restore jobs.

## Marketing Typecheck Blocker

The unrelated untracked marketing work remains outside this sprint. `apps/web/src/app/marketing.test.tsx` remains the known repo-wide web typecheck blocker from prior sprints, reporting `HomePage` as `() => void` at lines 35 and 65. The marketing files were not modified.

## Validation

- `git diff --check`: passed. Git emitted existing CRLF conversion warnings for the dirty worktree, but no whitespace errors were reported.
- Markdown/doc lint: no dedicated markdown or docs lint script was found in the root `package.json`.

No app tests, API tests, browser tests, smoke tests, E2E tests, seed scripts, PDF generation, or typecheck commands were required or run for this docs-only sprint.

## Remaining Pending Work

- Run the Sales/AR accountant walkthrough using synthetic/local or mocked data.
- Record concrete findings in the findings log or approved issue template.
- Triage findings into bounded implementation tasks.
- Decide the Sales Invoice vs Tax Invoice title policy with accountant/tax/product review.
- Review customer payments, credit notes, refunds, customer statements, AR Aging, VAT Summary/Return, dashboard thresholds, and generated document archive outputs with an accountant.
- Keep hosted/customer-data proof, deployed E2E, full smoke, real email, payment links, automatic reminders, recurring scheduler, production ZATCA, PDF/A-3, official VAT filing, object-storage migration, backup/restore, and production infrastructure as separate workstreams.

## Recommended Next Sprint

Run a controlled local Sales/AR accountant walkthrough using the synthetic sample-data plan, collect findings in `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`, and convert only concrete approved findings into a bounded implementation sprint.
