# Delivery Notes Sprint Closure

Date: 2026-06-04

## What Was Implemented

- Added tenant-scoped Delivery Notes as a non-posting Sales/AR fulfillment workflow.
- Added `DeliveryNote` and `DeliveryNoteLine` models, `DN-` document numbering, lifecycle statuses, source links, PDF/archive support, audit events, API endpoints, web routes, customer activity visibility, navigation, global create, and local global-search exposure.
- Delivery notes can be created directly for a customer or from a sales invoice or accepted sales quote where customer and tenant references match.
- Backend support also allows linking to an existing sales stock issue, but the first UI pass keeps stock-issue selection out of scope to avoid duplicating inventory movement behavior.

## Delivery Note Lifecycle Behavior

- `DRAFT` delivery notes can be edited.
- `DRAFT` can be issued.
- `ISSUED` can be marked delivered, cancelled, or voided.
- `DELIVERED`, `CANCELLED`, and `VOIDED` block normal editing and further delivery actions.
- Cancelling or voiding a delivery note does not create or reverse accounting entries.

## Source Invoice / Quote / Stock Issue Behavior

- Related sales invoices, accepted sales quotes, and sales stock issues are tenant-scoped and must belong to the same customer.
- Source invoice and quote lines can be copied into delivery note lines.
- Accepted quotes are not converted, closed, or financially mutated by delivery-note creation.
- Linked invoices are not finalized, posted, voided, or financially mutated by delivery-note creation.
- Stock-issue links are reference-only in this sprint; delivery notes do not create stock movements by themselves.

## PDF / Archive Behavior

- Delivery note PDFs are titled `Delivery Note`.
- PDFs include organization/customer details, delivery note number, status, issue/delivery dates, delivery address, source document references, line items, notes, and instructions.
- PDFs include this safe wording: `This delivery note is an operational fulfillment document. It does not create accounting journals, accounts receivable, VAT filing, ZATCA submission, payment, or inventory movement by itself.`
- `DocumentType.DELIVERY_NOTE` was added for generated-document archive rows.
- PDF download/generation archives delivery note PDFs through the existing GeneratedDocument service and does not log PDF bodies or base64.

## Non-Posting Boundaries

- Delivery notes do not create `JournalEntry` or `JournalLine` records.
- Delivery notes do not affect AR, revenue, VAT Summary, VAT Return, customer balances, report totals, dashboard financial totals, payments, email delivery, ZATCA metadata, or inventory quantity by themselves.
- Delivery notes do not trigger PDF/A-3, ZATCA signing, CSID, clearance, reporting, or any external tax authority network behavior.

## Permission Behavior

- View/list/detail/PDF-data use `salesInvoices.view`.
- Create and number preview use `salesInvoices.create`.
- Update, issue, mark delivered, cancel, and void use `salesInvoices.update`.
- PDF download/generation also requires existing generated-document download permission.
- Frontend navigation, global create, detail actions, and PDF actions use the same permission gates.

## Audit Behavior

- Added audit events for delivery note create, update, issue, mark delivered, cancel, void, and PDF generation.
- Audit metadata includes delivery note ID/number/status, customer ID, source document IDs, generated document ID where applicable, filename, and content type.
- Audit metadata does not include PDF bodies, base64, auth headers, tokens, secrets, customer-sensitive payload bodies, DB URLs, ZATCA XML, or QR payloads.

## Customer Activity Behavior

- Customer transaction history now includes delivery notes as `Delivery note (non-posting fulfillment)`.
- Delivery note customer activity uses zero monetary amounts and does not increase outstanding AR or customer statement balances.
- Customer pages include a separate Delivery Notes activity card and create action.

## Validation Results

- `corepack pnpm db:generate` passed.
- `corepack pnpm --filter @ledgerbyte/api test -- delivery-note number-sequence contact search` passed: 8 suites, 52 tests.
- `corepack pnpm --filter @ledgerbyte/web test -- delivery-note global-search global-create-menu party-new-transaction-menu pdf-download documents parties` passed: 12 suites, 53 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` remains blocked by unrelated untracked marketing work: `apps/web/src/app/marketing.test.tsx` reports `HomePage` as `() => void`.

## Marketing Typecheck Blocker

- `apps/web/src/app/marketing.test.tsx` is still untracked and unrelated to delivery notes.
- The marketing files were not modified, deleted, staged, or mixed into this sprint.

## What Was Intentionally Skipped

- Automatic inventory movement from delivery notes.
- Delivery route logistics, carrier integration, customer email sending, payment links, payment gateway capture, collections automation, online customer acceptance, delivery-note browser E2E, broad route QA, production infrastructure, hosted/customer-data checks, object-storage migration, backup/restore, real ZATCA, PDF/A-3, and official VAT filing.

## Remaining Gaps

- Focused delivery-note browser workflow coverage is now closed by `docs/development/DELIVERY_NOTE_BROWSER_WORKFLOW_SPRINT_CLOSURE.md`.
- Source invoice/quote reverse visibility and reference-only stock issue wording are now closed by `docs/development/DELIVERY_NOTE_SOURCE_VISIBILITY_WORDING_SPRINT_CLOSURE.md`.
- No stock-issue picker in the delivery-note UI; stock issue linkage is backend-supported as a safe reference.
- No delivery-note email/send workflow.
- No delivery note to shipment/carrier/logistics workflow.
- No hosted/customer-data proof, deployed E2E with safe seeded data, accountant sign-off, or production hardening.

## Recommended Next Sprint

Run a bounded Delivery Note Stock Issue Reference UI Sprint only after inventory policy review, keeping any stock issue selection reference-only unless an explicit accounting/inventory policy changes.
