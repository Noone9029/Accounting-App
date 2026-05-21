# LedgerByte Beta Testing Script

Use this script with a beta/test organization only. Do not enter real customer-sensitive data, real production invoices, real bank statements, or real compliance material. Vercel is beta/user-testing only, not final production hosting.

## Session Setup

1. Open the beta web URL provided by the LedgerByte team.
2. Sign in with the assigned beta account.
3. Confirm you are in the expected test organization.
4. Confirm your visible role matches the assigned beta scope if the admin provided one.
5. Note your browser, device, and approximate screen width.
6. Keep the feedback form open while testing.

Expected result:
- You can sign in and reach the app shell without seeing production-compliance claims.
- You are using your own assigned beta account, not a shared credential.
- Your assigned role matches the testing workflow. General reviewers should usually have `Viewer`; `Owner` and `Admin` are internal-only.

Do not report passwords, tokens, cookies, auth headers, or screenshots containing sensitive data.

## Workflow 1: Setup Wizard

1. Open `/setup`.
2. Review the business profile step.
3. Review VAT/tax detail guidance.
4. Review checklist status, blockers, warnings, and next action links.
5. Use the provided navigation to return to the dashboard.

Check:
- Does each step explain what is required?
- Are incomplete steps clearly labeled?
- Does ZATCA wording say local/readiness-only rather than production-connected?
- Is the layout usable on your device?

## Workflow 2: Dashboard Checklist

1. Open `/dashboard`.
2. Review the onboarding checklist card.
3. Confirm the next incomplete step is clear.
4. Review dashboard KPI cards and report links.

Check:
- Do the dashboard cards tell you what changed and where to go next?
- Are report/dashboard labels understandable?
- Is there any claim that production ZATCA compliance is enabled?

## Workflow 3: First Customer

1. Open `/contacts`.
2. Use the first-customer guidance to create or review a test customer.
3. Use mock data only.
4. Return to the customer detail page.

Check:
- Is the empty state helpful?
- Are customer ledger and statement links easy to find?
- Does the page avoid exposing or requesting unnecessary sensitive data?

## Workflow 4: First Sales Invoice

1. Open `/sales/invoices/new`.
2. Create a draft invoice with test data only.
3. Open the invoice detail page.
4. Review draft status guidance.
5. Finalize/post the invoice if the beta testing scope permits it.
6. Review the finalized/posted guidance and next actions.

Check:
- Can you tell what draft means?
- Can you tell that finalized/posted invoices create accounting entries?
- Is the next action to record payment clear?
- Are PDF/download/document actions understandable?

## Workflow 5: Customer Payment

1. From the invoice detail page, choose the record-payment action.
2. Open `/sales/customer-payments/new` if needed.
3. Record a test payment against the test invoice.
4. Confirm you land on the payment detail page with success context.
5. Review allocation, unapplied amount, receipt, invoice link, ledger link, AR report link, and dashboard link.

Check:
- Can you tell whether the invoice is paid or partially paid?
- Are allocations easy to understand?
- Does the receipt/PDF language avoid real email sending claims?

## Workflow 6: Customer Ledger and AR Report

1. Open the customer detail page.
2. Review the ledger or statement area.
3. Open `/reports/aged-receivables`.
4. Follow customer/document drill-down links.

Check:
- Does the ledger explain invoice, payment, credit note, refund, debit, credit, and balance labels?
- Does the report explain aging buckets and next actions?
- Are tables readable on mobile/tablet?

## Workflow 7: Supplier and Purchase Bill

1. Create or review a test supplier from `/contacts`.
2. Open the supplier detail page.
3. Create or review a purchase bill.
4. Review draft/finalized/paid/partially paid/voided guidance.
5. Finalize/post the bill if the beta testing scope permits it.

Check:
- Is AP wording clear?
- Can you tell that purchase bills increase what the business owes suppliers?
- Are supplier ledger and AP report links easy to find?

## Workflow 8: Supplier Payment and Debit Note

1. Record a supplier payment against the test purchase bill.
2. Review the supplier payment detail page and success guidance.
3. Review purchase debit note pages if test records are available.
4. Open `/reports/aged-payables`.

Check:
- Can you tell how a supplier payment reduced the payable balance?
- Does debit-note copy explain that it reduces or adjusts supplier balances?
- Are allocation, receipt, bill, supplier ledger, and AP report links clear?

## Workflow 9: Manual Bank Statement Import Preview

1. Open a test bank account.
2. Open the statement import page.
3. Paste or upload a dummy CSV/JSON/OFX/CAMT/MT940 statement file.
4. Preview parsed rows.
5. Review validation warnings and duplicate-candidate counts.

Check:
- Is it clear this is manual import, not live bank sync?
- Are supported manual CSV/JSON/OFX/CAMT/MT940 shapes explained?
- Are invalid date, invalid amount, missing description, and duplicate warnings useful?
- Does the UI avoid showing raw file contents in logs or error messages?

## Workflow 10: Reconciliation and Matching Review

1. Review unmatched statement transactions.
2. Open reconciliation/matching pages for the test bank account.
3. Review matched/unmatched/categorized/ignored status labels.
4. Review locked-period or close-readiness guidance if visible.

Check:
- Is matched vs unmatched clear?
- Is it clear where accounting entries or bank ledger movements appear?
- Is any copy implying live bank integration when only manual import exists?

## Workflow 11: Inventory Review

1. Open `/items`.
2. Review item guidance and stock movement links.
3. Open warehouses and a warehouse detail page.
4. Review a test inventory adjustment.
5. Review a test warehouse transfer.
6. Open inventory reports such as balances, movement summary, stock valuation, or low stock.

Check:
- Does the UI explain which item/warehouse changed?
- Is quantity in/out/balance terminology understandable?
- Is valuation/COGS wording conservative and limited to supported behavior?

## Workflow 12: Documents, PDFs, and Archive

1. From invoice, payment, credit note, purchase bill, supplier payment, debit note, customer statement, and supplier statement pages, test available PDF download buttons using safe test records.
2. Open `/documents`.
3. Confirm archive entries are understandable.
4. Open `/settings/documents`.
5. Open `/settings/number-sequences`.

Check:
- Are PDF buttons specific and clear?
- Does archive guidance explain whether downloads are archived?
- Does wording say PDF/A-3 is not implemented?
- Does wording avoid production ZATCA claims?

## Workflow 13: Reports and Dashboard Review

1. Open `/reports`.
2. Open AR/AP aging, GL, trial balance, P&L, balance sheet, VAT summary, and inventory reports where available.
3. Return to `/dashboard`.

Check:
- Are report descriptions and filters clear?
- Are empty states helpful?
- Are CSV/PDF export labels understandable?
- Are report terms accountant-friendly enough for beta review?

## Final Feedback

Complete [BETA_FEEDBACK_FORM_TEMPLATE.md](BETA_FEEDBACK_FORM_TEMPLATE.md) for each issue. Use [BETA_TRIAGE_GUIDE.md](BETA_TRIAGE_GUIDE.md) for severity. Mark accounting correctness, security/privacy, ZATCA/compliance wording, and beta-blocking issues explicitly.
