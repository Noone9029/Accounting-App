# Delivery Note Browser Workflow Sprint Closure

Date: 2026-06-04

## What Browser Workflow Was Covered

- Added focused mocked Playwright coverage in `tests/visual/delivery-note-workflow.visual.spec.ts`.
- Covered delivery-note list, new, detail, and edit routes: `/sales/delivery-notes`, `/sales/delivery-notes/new`, `/sales/delivery-notes/[id]`, and `/sales/delivery-notes/[id]/edit`.
- Covered related UI surfaces that expose delivery notes: customer detail, source sales invoice detail, source sales quote detail, generated-document archive, global create, and global search.
- The positive path covers creating a draft delivery note, selecting a customer, adding a delivery line, setting delivery address, issue date, and delivery date, saving draft, editing draft, issuing, marking delivered, downloading the PDF, viewing archive metadata, downloading the archived PDF, and verifying customer non-posting activity.
- Source paths cover creating from a finalized sales invoice and from an accepted sales quote, line copy behavior, source links on the delivery-note detail page, and source invoice/quote detail navigation.
- Permission and negative paths cover restricted view-only behavior, hidden create/edit/lifecycle/PDF actions, terminal-status action visibility, and empty-draft issue rejection.

## Delivery Note Defects Found And Fixed

- The delivery-note form showed voided source invoices as selectable source documents even though the backend rejects invalid source invoices. The form now hides voided invoices.
- The generated-document archive page could already label `DELIVERY_NOTE` rows, but the document-type filter did not expose Delivery Note. The filter now includes Delivery Note.
- A permissions/navigation unit test had a stale Sales nav expectation after Delivery Notes were added. The expectation now includes `Delivery notes`.

## What Was Verified

- Delivery note list/new/detail/edit workflow works through focused browser coverage.
- Issue and mark-delivered actions update the visible status and remove unsafe draft/issue controls after delivery.
- PDF download returns `application/pdf`, a delivery-note filename, and a nonzero byte length without printing the PDF body or base64.
- Generated-document archive metadata appears in the delivery-note detail UI and the archive page when the UI exposes the rows.
- Archived PDF download uses the generated-document download path and does not create a duplicate archive row in the mocked intended policy.
- Customer detail shows the delivery note as `Delivery note (non-posting fulfillment)` with zero financial amount.
- Delivery-note UI labels say Delivery Note and do not call the document an invoice or tax invoice.
- Delivery-note UI wording does not imply journal posting, AR creation, VAT filing, ZATCA clearance/reporting, payment, email delivery, or automatic inventory movement.

## Source Invoice And Quote Behavior Verified

- Creating from a finalized sales invoice copies safe delivery-line data and keeps the source invoice finalized.
- Creating from an accepted sales quote copies safe delivery-line data and keeps the quote accepted.
- Source invoice and source quote links appear on the delivery-note detail page and navigate to the existing source detail routes.
- Invalid source options are hidden in the browser workflow: voided invoices and non-accepted quotes are not offered.
- The focused browser test asserts no source invoice or source quote mutation requests are made by delivery-note creation.

## Permission Behavior Verified

- Users with sales invoice view permission can view delivery-note list/detail surfaces.
- Restricted users without create permission do not see the delivery-note create link or enabled global create action.
- Restricted users without update permission do not see edit, issue, mark delivered, cancel, or void actions.
- Restricted users without generated-document download permission do not see delivery-note PDF or archived PDF download buttons.
- Permission-aware Sales navigation includes Delivery notes for users who can view sales invoices.

## Accounting, Inventory, Tax, Email, And Payment Non-Effects

- The browser coverage verifies customer delivery-note activity stays zero-value and non-posting.
- Delivery notes are kept out of invoice/tax-invoice wording.
- The workflow does not assert or add any journal, AR, VAT filing, ZATCA, payment, email, or automatic inventory movement behavior.
- Source invoice and accepted quote creation paths do not finalize, post, void, convert, accept, reject, cancel, or otherwise mutate the source documents.

## What Was Intentionally Skipped

- No automatic inventory movement from delivery notes.
- No stock-issue picker UI; backend stock-issue linkage remains reference-only.
- No delivery route logistics, carrier integration, customer email sending, payment links, payment gateway capture, online customer acceptance, collections automation, payroll, fixed assets, real ZATCA, PDF/A-3, official VAT filing, production hosting, object-storage migration execution, backup/restore execution, live bank feeds, or hosted/customer-data checks.
- No broad route QA, broad UI polish, navigation redesign, marketing work, production commands, deployed E2E, hosted/shared migrations, real email sends, or real ZATCA network calls.
- Source sales invoice and source sales quote detail pages are verified as navigation targets, but reverse related-delivery-note panels on those pages remain a possible future UX improvement if users need them.

## Marketing Typecheck Blocker

- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked file and still blocks repo-wide web typecheck with `HomePage` typed as `() => void`.
- The marketing files were not deleted, modified, staged, or mixed into this sprint.

## Validation Results

- `corepack pnpm --filter @ledgerbyte/web test -- delivery-note-form.test.tsx` passed: 1 suite, 5 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/delivery-note-workflow.visual.spec.ts` passed: 4 browser tests.
- `corepack pnpm --filter @ledgerbyte/web test -- delivery-note global-create-menu global-search parties documents permissions` passed: 12 suites, 58 tests.
- `corepack pnpm --filter @ledgerbyte/api test -- delivery-note number-sequence contact search` passed: 8 suites, 52 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` failed only on unrelated untracked `apps/web/src/app/marketing.test.tsx` errors at lines 35 and 65: `HomePage` cannot be used as a JSX component because its type is `() => void`.
- Repo-wide `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` were not run after the web typecheck blocker was confirmed.

## Remaining Delivery Note Gaps

- No stock-issue picker UI; any sales stock issue linkage should remain reference-only until inventory policy is reviewed.
- Source invoice/quote reverse visibility and reference-only stock issue wording are now closed by `docs/development/DELIVERY_NOTE_SOURCE_VISIBILITY_WORDING_SPRINT_CLOSURE.md`.
- No delivery-note customer email/send workflow.
- No shipment/carrier/logistics workflow.
- No deployed E2E with safe seeded data.
- No hosted/customer-data proof, accountant sign-off, or production hardening evidence.

## Recommended Next Development Sprint

Run a bounded Delivery Note Stock Issue Reference UI Sprint only after inventory policy review: keep stock issue selection reference-only, avoid automatic stock movement, and preserve accountant-safe Delivery Note wording before any email, logistics, or inventory automation work.
