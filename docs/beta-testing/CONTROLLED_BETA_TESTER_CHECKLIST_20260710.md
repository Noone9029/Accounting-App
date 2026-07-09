# LedgerByte Controlled Beta Tester Checklist

Date: 2026-07-10

Status: approved workflow checklist for the hosted user-testing environment

Use this checklist only with an approved LedgerByte beta account and assigned test organization at `https://ledgerbyte-web-test.vercel.app`. This environment is not production. Use fictional or sanitized test data only.

## Before Testing

- [ ] Confirm you are using the assigned beta account and organization.
- [ ] Record browser, device, timestamp, and timezone for the session.
- [ ] Use mock customers, suppliers, documents, references, and financial values.
- [ ] Do not enter real customer, supplier, bank, tax, payroll, identity, contract, or document data.
- [ ] Do not share passwords, tokens, cookies, authorization headers, database URLs, or API keys.
- [ ] Review [CONTROLLED_BETA_KNOWN_LIMITATIONS_20260710.md](./CONTROLLED_BETA_KNOWN_LIMITATIONS_20260710.md).

## Login And Session

- [ ] Open `/login` and sign in through the normal browser form.
- [ ] Confirm the dashboard opens without returning to the login page.
- [ ] Confirm the organization shown is the assigned beta organization.
- [ ] Confirm refresh and normal page navigation keep the session active.
- [ ] Report repeated login prompts, organization mismatch, or access to another organization as Blocker severity.

## Onboarding And Dashboard

- [ ] Review onboarding/setup status and confirm completed and pending steps are understandable.
- [ ] Review dashboard totals, status labels, empty states, and links using only test data.
- [ ] Confirm links lead to the expected workspace and preserve the intended context.
- [ ] Report contradictory accounting states or totals as High or Blocker severity.

## Customers And Suppliers

- [ ] Find the customer and supplier lists and open a test record.
- [ ] Review contact, balance, ledger, statement, and activity surfaces where available.
- [ ] Create or edit only fictional test records when the assigned walkthrough requires it.
- [ ] Confirm customer and supplier records remain scoped to the assigned organization.

## Sales Invoices

- [ ] Review invoice list, filters, status labels, and a test invoice detail page.
- [ ] If assigned, create a draft invoice using fictional customer and line-item data.
- [ ] Check subtotal, tax, total, payment status, and document actions for clarity.
- [ ] Do not create a live payment link, send a real email, or treat the PDF as official tax/compliance evidence.

## Purchase Bills

- [ ] Review bill list, filters, status labels, and a test bill detail page.
- [ ] If assigned, create a draft bill using fictional supplier and line-item data.
- [ ] Check subtotal, tax, total, payment/allocation state, and accounting guidance.
- [ ] Do not initiate a real supplier payout, bank action, or provider workflow.

## Document Inbox

- [ ] Open `/document-inbox` and review queue, status, confidence, and review controls.
- [ ] Use only a sanitized synthetic receipt or bill if upload is part of the assigned walkthrough.
- [ ] Confirm the UI says review is required and does not imply provider extraction is live.
- [ ] Do not upload real documents or trigger external OCR/storage behavior.

## Reports And CSV Exports

- [ ] Review the reports index and assigned ledger, receivable, payable, VAT, or financial report.
- [ ] Check date/filter behavior, column labels, totals, empty states, and drill-down links.
- [ ] Export CSV only from test data and store it in an approved temporary location.
- [ ] Confirm exported values and headers match the visible report; do not treat the export as audit or filing evidence.

## Report Packs

- [ ] Open `/report-packs` and review readiness, manifest, status, and download wording.
- [ ] Use only existing test records unless generation is explicitly included in the assigned walkthrough.
- [ ] Do not claim production archive, immutable storage, retention, or recovery proof.

## Settings And Readiness

- [ ] Review payment, configuration, observability, bank integration, API docs, webhook, email, and storage readiness surfaces assigned to your role.
- [ ] Confirm disabled/unconfigured providers are described conservatively.
- [ ] Report any copy claiming live providers, production compliance, certification, or money movement as High severity.

## Import And Export Toolkit

- [ ] Open `/settings/import-export` and review templates, validation guidance, and job states.
- [ ] Use sanitized synthetic CSV data only.
- [ ] Preview or validate only; do not commit an import unless a separate approved test plan explicitly allows it.
- [ ] Confirm errors identify the affected row/field without exposing private payloads.

## Known Disabled Features

- [ ] Do not test live Wio or bank connections, real payment movement, real OCR, real email delivery, external webhook delivery, production object storage, ZATCA production execution, or UAE production compliance.
- [ ] Do not perform destructive cleanup, hosted backup/restore, migrations, or environment changes.

## Report Results

- [ ] Use [CONTROLLED_BETA_ISSUE_TRIAGE_TEMPLATE_20260710.md](./CONTROLLED_BETA_ISSUE_TRIAGE_TEMPLATE_20260710.md) or the GitHub Beta bug report template.
- [ ] Include the route, action, expected result, actual result, severity, timestamp, assigned organization identifier, and request ID when available.
- [ ] Attach only redacted screenshots or logs.
- [ ] Stop the affected workflow for cross-tenant exposure, secret exposure, wrong accounting totals, or misleading production/provider/compliance claims.
