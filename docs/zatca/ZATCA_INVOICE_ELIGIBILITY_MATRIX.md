# ZATCA Invoice Eligibility Matrix

Date: 2026-06-06

Product posture: LedgerByte is controlled beta/user-testing only. ZATCA production compliance is not enabled.

This matrix maps current LedgerByte document types to ZATCA relevance. It is a preparation artifact and does not enable signing, clearance, reporting, PDF/A-3, or production submission.

## Matrix

| Document | ZATCA relevant? | Standard or simplified candidate | Posting/finalization dependency | Local XML generation | Real signing allowed? | Clearance/reporting allowed? | PDF/A-3 required now? | Current status | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sales Invoice | Yes | Standard or simplified candidate depending buyer and invoice policy | Finalized invoice only; drafts must not be submitted | Yes for finalized invoice readiness/local XML where implemented | No | No | No | Local XML/QR/hash readiness exists for invoices | Key custody, CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, accountant/tax/ZATCA review |
| Credit Note | Yes | Standard or simplified credit note candidate | Finalized/posted credit note only; draft/review state must not be submitted | Not enabled as a production flow in this sprint | No | No | No | Credit note accounting workflow exists; ZATCA mapping still needs review | Eligibility policy, XML mapping, UUID/hash, key custody, CSID, signing, clearance/reporting |
| Debit Note | Yes if LedgerByte issues a sales tax debit note | Standard or simplified debit note candidate | Finalized/posted debit note only | No | No | No | No | Dedicated sales debit-note workflow is not confirmed as implemented | Document model, accountant policy, XML mapping, key custody, CSID, signing, clearance/reporting |
| Customer Refund | No by itself | Not an e-invoice candidate by default | Cash/bank transaction; may relate to credit note | No | No | No | No | Refund workflow exists separately from invoice submission | Future tax policy if any refund receipt treatment changes |
| Sales Quote | No | Not a tax invoice | Quote acceptance may lead to draft invoice, but quote itself is non-posting | No | No | No | No | Quote/proforma workflow and PDF/archive exist with non-posting wording | None for ZATCA; must keep quote wording non-invoice |
| Recurring Invoice Template | No | Not an invoice | Template can generate draft invoice only | No | No | No | No | Template workflow exists and is non-posting | Scheduler/finalization policy remains separate |
| Generated Draft Invoice From Recurring Template | Not until finalized | Standard or simplified only after it becomes a finalized invoice | Draft invoices must not be submitted | No while draft | No | No | No | Manual draft generation exists | Finalization, invoice eligibility, key custody, CSID, signing, clearance/reporting |
| Delivery Note | No | Not a tax invoice | Fulfillment document only | No | No | No | No | Delivery note workflow and PDF/archive exist as non-posting | Must not be presented as ZATCA invoice evidence |
| Collection Case | No | Not a tax invoice | AR follow-up workflow only | No | No | No | No | Collection workflow exists as non-posting | Must not trigger invoice submission, payment, VAT, or ZATCA |
| Sales Inventory Return | No by itself | Not a tax invoice by itself | Operational stock return; may inform a separate credit note policy | No | No | No | No | Dedicated operational return workflow exists | Credit note linkage and COGS reversal policy remain separate |
| Customer Payment Receipt | No unless future policy says otherwise | Not an e-invoice candidate by default | Payment allocation/cash evidence only | No | No | No | No | Customer payment and receipt workflows exist | Future tax/legal review if receipt treatment changes |

## Rules

- Quotes are not tax invoices.
- Recurring templates are not invoices.
- Draft invoices are not submitted.
- Delivery notes are not invoices.
- Collection cases are not invoices.
- Payment receipts are not e-invoices unless a future reviewed policy explicitly changes this.
- Finalized sales invoices and finalized credit notes are the primary current ZATCA candidates.
- Sales inventory returns are operational documents; any ZATCA relevance should come through a separately approved credit note or tax document policy.

## Local XML Boundary

Local XML may be generated only for eligible finalized invoice documents where local XML generation is already implemented and clearly labeled as local readiness. Local XML generation does not imply:

- Production signing.
- CSID onboarding.
- Clearance.
- Reporting.
- PDF/A-3.
- Official VAT filing.
- Production ZATCA compliance.

## Future Work Before Submission

- Accountant and tax review of document eligibility.
- ZATCA specialist review of standard vs simplified classification.
- Credit note and debit note XML mapping.
- Finalization/submission policy.
- Key custody implementation.
- Sandbox CSID onboarding.
- Signing, clearance, reporting, error/retry, and PDF/A-3 design.
