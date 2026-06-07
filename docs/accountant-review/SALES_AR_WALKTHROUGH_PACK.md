# Sales/AR Accountant Walkthrough Pack

Prepared: 2026-06-04

This pack gives an accountant reviewer a guided, safe walkthrough of LedgerByte Sales/AR workflows. It prepares review evidence and findings intake. It does not approve LedgerByte for production use.

## 1. Review Purpose

Use this walkthrough to review whether Sales/AR workflows, document wording, posting boundaries, tax wording, customer balance behavior, and dashboard attention signals are understandable and accountant-appropriate for controlled beta/user-testing.

The walkthrough follows this intended flow:

customer -> quote -> quote PDF -> convert to draft invoice -> finalize invoice -> customer payment -> credit note/refund where applicable -> recurring invoice template -> generated draft invoice -> delivery note -> collection case -> customer ledger/activity -> AR Aging -> VAT Summary/Return -> dashboard attention items.

## 2. Product Posture And Limitations

LedgerByte is controlled beta/user-testing only.

The walkthrough must preserve these limitations:

- LedgerByte is not production-launched.
- LedgerByte does not claim production ZATCA compliance.
- VAT views are operational/draft and are not official filing workflows.
- Real email delivery is not enabled for this walkthrough.
- Payment links, payment gateways, customer portal flows, automatic reminders, production billing, and production ZATCA are not enabled.
- PDF/A-3, signed XML submission, ZATCA clearance/reporting, and tax authority filing are not part of this walkthrough.
- This walkthrough does not approve accounting policy, tax treatment, legal debt collection behavior, or production readiness.

## 3. Required Reviewer Profile

The primary reviewer should be a qualified accountant or accounting lead who can evaluate:

- Sales invoice wording, status labels, totals, tax modes, and balance presentation.
- Customer payment, credit note, refund, ledger, and statement wording.
- Non-posting document boundaries for quotes, recurring templates, delivery notes, and collection cases.
- AR Aging and VAT Summary/Return wording.
- Unsupported compliance, email, payment, scheduler, inventory, and ZATCA claims.

Engineering or product may join the walkthrough to operate the test environment and record findings, but they must not mark accountant approval.

## 4. Safe Data Policy

Use only synthetic local or mocked review data.

Allowed:

- Fake customer names.
- Fake invoice, quote, delivery note, recurring template, and collection case numbers.
- Fake item names.
- Fake route placeholders.
- Fake tax examples.
- Fake review screenshots or PDFs stored outside the repo when needed.

Not allowed:

- Real customer, supplier, bank, tax, or invoice data.
- Real tax registration numbers or real VAT identifiers.
- Production or hosted customer records.
- PDF bodies, base64, auth headers, cookies, tokens, signed XML, QR payloads, provider credentials, DB URLs, or secrets.
- Seed/reset/delete, smoke, E2E, hosted, email, payment, ZATCA, or VAT filing execution.

## 5. Pre-Review Setup Checklist

- [ ] Confirm the review environment is local, mocked, or otherwise approved for synthetic data only.
- [ ] Confirm `SALES_AR_LOCAL_WALKTHROUGH_EXECUTION_PREFLIGHT.md` passes before any local data creation.
- [ ] Confirm no production or hosted customer data is visible.
- [ ] Confirm the reviewer has access to `SALES_AR_SYNTHETIC_SAMPLE_DATA_PLAN.md`.
- [ ] Confirm the reviewer has access to `SALES_AR_EXPECTED_RESULTS_CHECKLIST.md`.
- [ ] Confirm the reviewer has access to `SALES_AR_ROUTE_REVIEW_CHECKLIST.md`.
- [ ] Confirm findings will be recorded in `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md` or the approved issue template.
- [ ] Confirm screenshots/PDFs, if captured, are stored outside the repo and contain only fake data.
- [ ] Confirm no real email, payment, ZATCA, VAT filing, hosted migration, seed/reset/delete, smoke, or E2E workflow will be run as part of this walkthrough.

Current execution note: the 2026-06-04 local execution preflight did not create sample data because the local database/API/web services were not running and mutation gates did not pass.

## 6. Sales/AR Workflow Route Map

| Workflow area | Route or output | Review use |
| --- | --- | --- |
| Dashboard | `/dashboard` | Confirm Sales/AR attention signals and safe read-only wording. |
| Customers | `/customers`, `/customers/[id]` | Review customer balance, ledger, statement, and activity grouping. |
| Sales invoices | `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]` | Review invoice lifecycle, tax modes, account coding, balances, and PDF labels. |
| Sales quotes | `/sales/quotes`, `/sales/quotes/new`, `/sales/quotes/[id]` | Review non-posting quote behavior and conversion to draft invoice. |
| Recurring invoice templates | `/sales/recurring-invoices`, `/sales/recurring-invoices/new`, `/sales/recurring-invoices/[id]` | Review schedule preview and manual draft invoice generation wording. |
| Delivery notes | `/sales/delivery-notes`, `/sales/delivery-notes/new`, `/sales/delivery-notes/[id]` | Review fulfillment wording, source traceability, and non-posting boundaries. |
| Collections | `/sales/collections`, `/sales/collections/new`, `/sales/collections/[id]` | Review collection follow-up wording, activity timeline, and non-payment behavior. |
| Reports | `/reports/aged-receivables`, `/reports/vat-summary`, `/reports/vat-return` | Review AR Aging and VAT wording. |
| Tax workspace | `/tax` | Review operational/draft tax posture and no official filing claim. |
| Documents | `/documents` | Review generated document labels and archive wording where exposed. |

## 7. Review Scenario Overview

Use the synthetic sample data plan to prepare these fake review records:

- Main customer: `LB-SAR-CUST-001 Sample Trading Co.`
- Service item: `LB-SAR-SVC-001 Advisory service`
- Optional product item: `LB-SAR-PROD-001 Demo product`, only if the current local workflow safely supports product-style invoice lines.
- Revenue account: `4010 Sample sales revenue`
- Tax rate: `TAX-SAR-15 15% VAT/tax example`
- Quote awaiting acceptance: `SQ-SAR-AWAIT-001`
- Accepted quote converted to draft invoice: `SQ-SAR-ACCEPT-001` -> `INV-SAR-DRAFT-QUOTE-001`
- Tax exclusive invoice: `INV-SAR-TEX-001`
- Tax inclusive invoice: `INV-SAR-TIN-001`
- No-tax invoice: `INV-SAR-NTX-001`
- Recurring template due for manual generation: `REC-SAR-001`
- Generated draft invoice from recurring template: `INV-SAR-REC-DRAFT-001`
- Delivery note sourced from invoice: `DN-SAR-INV-001`
- Delivery note sourced from accepted quote: `DN-SAR-QUOTE-001`
- Collection case linked to overdue invoice: `COL-SAR-OVERDUE-001`
- Promise-to-pay activity: `ACT-SAR-PTP-001`
- Disputed collection case: `COL-SAR-DISPUTE-001`
- Customer payment: `PAY-SAR-001`
- Credit note: `CN-SAR-001`
- Refund scenario: `REF-SAR-001`, only where refund behavior is already implemented safely.

## 8. Step-By-Step Walkthrough

1. Open `/dashboard`.
   - Check Sales/AR attention panels for overdue invoices, collection follow-ups, quote actions, recurring templates, delivery notes, and top AR customers.
   - Confirm the dashboard wording says read-only workflow signals and does not imply email, payment, scheduler, VAT filing, ZATCA, or inventory movement.

2. Open `/customers`.
   - Confirm the synthetic customer is listed.
   - Confirm customer labels use fake data only.

3. Open `/customers/[id]`.
   - Review customer summary, outstanding balance, ledger, statement, activity, delivery note activity, and collection case panel.
   - Confirm non-posting records are separate from the statement balance.

4. Open `/sales/quotes/new`.
   - Create or review the planned quote scenario only in an approved local/mock environment.
   - Confirm the quote is labeled `Sales Quote` and non-posting.

5. Open `/sales/quotes/[id]`.
   - Review `SQ-SAR-AWAIT-001` as awaiting acceptance.
   - Review `SQ-SAR-ACCEPT-001` as accepted.
   - Confirm any converted invoice link points to a draft sales invoice.

6. Review quote PDF/download labels.
   - Confirm the title says `Sales Quote`.
   - Confirm it does not say `Tax Invoice` and does not imply posting, AR, VAT filing, email delivery, payment collection, or ZATCA submission.

7. Open `/sales/invoices/new`.
   - Review tax exclusive, tax inclusive, and no-tax examples.
   - Confirm revenue/account coding wording is clear.

8. Open `/sales/invoices/[id]`.
   - Review draft state and finalized/posted state where available.
   - Confirm invoice number visibility, balance due, amount paid, and amount credited.
   - Confirm invoice PDF/download/archive labels are conservative and do not imply unsupported behavior.

9. Review customer payment flow.
   - Confirm payment records are distinct from invoices, credit notes, refunds, and collection notes.
   - Confirm receipt wording does not imply bank reconciliation or email delivery.

10. Review credit note and refund examples where implemented.
    - Confirm credit note wording describes customer balance reduction.
    - Confirm refund wording does not imply gateway refund or bank transfer execution unless a real integration exists.

11. Open `/sales/recurring-invoices`.
    - Review recurring invoice templates as non-posting templates.
    - Confirm due/manual generation wording does not imply an automatic scheduler.

12. Open `/sales/recurring-invoices/[id]`.
    - Confirm schedule preview, last run, next run, and generated draft invoice link.
    - Confirm generated invoices are drafts and require separate finalization.

13. Open `/sales/delivery-notes`.
    - Review draft and issued delivery notes.
    - Confirm labels say `Delivery Note` and fulfillment document.

14. Open `/sales/delivery-notes/[id]`.
    - Confirm source invoice/quote traceability.
    - Confirm stock issue, if present, is reference-only.
    - Confirm delivery notes do not create AR, journals, VAT filing, ZATCA submission, payment, email, or inventory movement by themselves.

15. Open `/sales/collections`.
    - Review overdue invoices, open cases, follow-ups, promise-to-pay, and disputed cases.
    - Confirm planned email/reminder wording does not imply sent email or scheduler behavior.

16. Open `/sales/collections/[id]`.
    - Review linked customer, linked invoice, outstanding balance, activity timeline, promise-to-pay, disputed/on-hold/closed state wording, and note-only activities.
    - Confirm collection records do not allocate payments, mark invoices paid, send emails, create payment links, file VAT, call ZATCA, or start legal automation.

17. Open `/reports/aged-receivables`.
    - Confirm AR Aging uses outstanding sales invoices only.
    - Confirm quotes, recurring templates, delivery notes, and collection cases are excluded from aged receivables.

18. Open `/tax`, `/reports/vat-summary`, and `/reports/vat-return`.
    - Confirm operational/draft VAT wording.
    - Confirm no official filing, tax authority submission, production compliance, or ZATCA claim.

19. Open `/documents`.
    - Confirm generated document type labels match the output type.
    - Confirm Sales Quote and Delivery Note archive labels do not say invoice or tax invoice.

20. Record findings.
    - Use `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`.
    - Do not mark any finding approved until it is reviewed and converted into a bounded implementation task.

## 9. Expected Accounting Checkpoints

- Finalized sales invoices post accounting only through the existing invoice finalization path.
- Draft invoices do not count as finalized/posted receivables.
- Customer payments affect balances only through existing customer payment logic.
- Credit notes reduce or adjust customer balance only through existing credit note logic.
- Refunds, where implemented, follow existing refund posting behavior and do not imply gateway execution.
- AR Aging is based on outstanding sales invoices.
- VAT Summary/Return views are operational/draft and based on existing posted document logic.
- Customer statement balance excludes non-posting quotes, recurring templates, delivery notes, and collection cases.

## 10. Expected Non-Posting Checkpoints

- Sales quotes do not post journals, create AR, file VAT, send email, collect payment, or call ZATCA.
- Recurring invoice templates do not post journals and do not run an automatic scheduler.
- Generated recurring invoices are draft invoices until separately finalized.
- Delivery notes are fulfillment documents and do not create AR, journals, VAT filing, ZATCA submission, payment, email, or inventory movement by themselves.
- Collection cases track follow-up work and do not post journals, allocate payments, send emails, create payment links, file VAT, call ZATCA, or start legal debt collection automation.
- Dashboard attention items are read-only workflow signals and do not mutate data.

## 11. Unsupported Claims Checklist

The reviewer should flag any wording that implies:

- Production ZATCA compliance.
- ZATCA clearance, reporting, signing, CSID execution, or real network submission.
- PDF/A-3 output.
- Official VAT filing or submitted return.
- Real email sent.
- Customer payment link created.
- Payment gateway capture.
- Automatic reminder sent.
- Automatic recurring scheduler execution.
- Delivery note stock movement.
- Legal debt collection automation.
- Hosted/customer-data proof.
- Production launch readiness.

## 12. Findings Recording Instructions

Record every concrete observation in `SALES_AR_WALKTHROUGH_FINDINGS_LOG.md` or the approved issue template.

Each finding should include:

- Finding ID.
- Date.
- Reviewer.
- Workflow area.
- Route or output.
- Severity.
- Finding type.
- Description.
- Expected behavior.
- Actual behavior.
- Screenshot/sample reference, if safe and stored outside the repo.
- Recommendation.
- Owner.
- Status.
- Decision needed.
- Implementation notes.

Do not invent findings. Do not mark findings approved without accountant/product review. Do not include real customer data, PDF bodies, base64, auth headers, cookies, tokens, signed XML, QR payloads, provider credentials, DB URLs, or secrets.

## 13. Go/No-Go Summary Template

Reviewer:

Review date:

Environment:

Scope completed:

Items ready for continued beta review:

Must-fix before broader beta:

Must-fix before production:

Decision items for accountant/tax/legal/ZATCA/product:

Unsupported claims found:

Evidence captured outside repo:

Overall recommendation:

Approval status: Not approved until separately signed off by the qualified reviewer and product owner.

## 14. Local Execution Status

Latest local services bring-up status: 2026-06-04.

The local target configuration was verified as local at the env-key level, but the local runtime remained unavailable:

- Docker Desktop Linux engine unavailable.
- Local Postgres not reachable.
- Local Redis not reachable.
- Local API not reachable.
- Local web app not reachable.
- Safe local login not verified.
- Fixture dry-run plan documented but not executed.
- No sample data created.

Use these development docs before attempting a walkthrough:

- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`
- `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`
- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`
