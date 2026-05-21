# LedgerByte Beta Testing Guide

This guide is for selected beta testers evaluating the LedgerByte user-testing environment. The environment is hosted on Vercel for controlled user testing only; it is not final production hosting and must not be treated as a production accounting system.

## Purpose

Beta testing should confirm that a new business user can understand and complete the polished LedgerByte workflows without confusion:

- Guided setup and dashboard checklist.
- First customer, first sales invoice, invoice finalization, and customer payment.
- Customer ledger, customer statement, and aged receivables review.
- Supplier, purchase bill, supplier payment, debit note, supplier ledger, supplier statement, and aged payables review.
- Manual bank statement import preview, reconciliation/matching review, and bank account navigation.
- Inventory item, warehouse, adjustment, transfer, stock movement, and inventory report review.
- Document PDF download, generated-document archive, settings, and number sequence guidance.
- Dashboard and report navigation.

## Beta Environment Boundaries

- Vercel is beta/user-testing only, not final production hosting.
- Use only beta/test organizations and safe sample records.
- Do not enter real customer-sensitive data unless an explicit beta data policy allows it.
- Do not use production invoices, real tax filings, real customer statements, or real supplier statements.
- Do not rely on beta output as legal, tax, audit, or compliance evidence.
- Do not send real customer emails unless a later approved email testing plan explicitly enables it.
- Do not test live bank feeds; LedgerByte currently supports manual statement file upload/paste preview only.

## ZATCA and Compliance Safety

LedgerByte beta does not provide production ZATCA compliance:

- No real ZATCA submission.
- No CSID execution.
- No clearance/reporting.
- No PDF/A-3 implementation.
- No production compliance certification.
- ZATCA wording in beta should remain local/readiness-only.

Report any screen, PDF, or message that sounds like production ZATCA submission or certification is already enabled.

## What Testers Should Test

- Can you understand what each page is asking you to do?
- Can you find the next action after completing a step?
- Can you tell whether a record is draft, posted/finalized, paid, partially paid, voided, matched, unmatched, locked, or archived?
- Are ledgers and reports readable enough to discuss with an accountant?
- Are PDF/download/archive actions clearly labeled?
- Are error, empty, and loading states understandable?
- Does mobile/tablet layout remain usable?
- Are terms like debit, credit, balance, allocation, payable, receivable, and reconciliation clear in context?

## What Testers Should Not Test

- Full production accounting close.
- Production tax filing or legal compliance.
- Real ZATCA integration.
- Real bank integrations or external bank aggregation.
- Real customer email sending.
- Security penetration testing without explicit scope.
- Data deletion, reset, destructive cleanup, backup execution, or restore execution.

## Test Data Safety Rules

- Use mock customer and supplier names.
- Use non-sensitive sample invoice numbers and references.
- Use dummy bank statement CSV/JSON data.
- Do not upload real bank statements, real IDs, real contracts, payroll data, or customer documents.
- Do not include passwords, tokens, cookies, API keys, database URLs, auth headers, signed XML, QR payloads, PDF contents, or document bodies in screenshots or reports.
- Redact company names, customer names, supplier names, email addresses, phone numbers, bank details, and document numbers if they look real.

## Known Limitations

- Full smoke remains pending.
- Full E2E remains pending.
- Accountant review packet exists, but accountant review is still pending and must not be treated as approval or certification.
- Supabase RLS/runtime-role hardening remains parked until a safe Vercel environment mutation path is available.
- Production ZATCA compliance is not enabled.
- Real email sending is not enabled by default.
- Manual bank statement import supports beta CSV/JSON/text preview and import metadata; live bank integration is not implemented.

## How To Report Issues

Use the beta feedback form or GitHub issue templates when available:

- Include the route/page and workflow step.
- Include browser/device and screen width if relevant.
- Describe expected behavior and actual behavior.
- Attach screenshots or videos only after redacting sensitive data.
- Mark whether the issue blocks beta usage.
- Flag accounting correctness, security/privacy, and ZATCA/compliance wording concerns clearly.

Use [BETA_FEEDBACK_FORM_TEMPLATE.md](BETA_FEEDBACK_FORM_TEMPLATE.md) for structured feedback and [BETA_TRIAGE_GUIDE.md](BETA_TRIAGE_GUIDE.md) for severity classification.
