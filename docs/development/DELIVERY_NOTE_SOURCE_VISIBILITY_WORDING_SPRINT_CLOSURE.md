# Delivery Note Source Visibility And Wording Sprint Closure

Date: 2026-06-04

## What Source Visibility Was Added

- Sales invoice detail now shows a `Related delivery notes` panel sourced from the existing tenant-scoped delivery-note list for the invoice customer and filtered to the current invoice.
- Sales quote detail now shows a `Related delivery notes` panel sourced from the existing tenant-scoped delivery-note list for the quote customer and filtered to the current quote.
- The related panels show delivery note number, status, issue date, delivery date, customer name, delivery address summary, and a link to the delivery-note detail route.
- Delivery-note detail now shows clearer source cards for source invoice, source quote, and linked stock issue where present.
- The existing delivery-note workflow browser spec now verifies reverse source panels from source invoice and accepted quote detail pages.

## What Wording Was Tightened

- Related delivery-note panels describe Delivery Notes as fulfillment documents and keep the wording non-posting.
- Invoice-linked wording says linked delivery notes do not post journals, create accounts receivable, file VAT, send email, call ZATCA, or move inventory by themselves.
- Quote-linked wording says linked delivery notes do not convert the quote, create an invoice, post revenue, file VAT, send email, call ZATCA, or move inventory by themselves.
- Delivery-note detail now prominently says the Delivery Note is a non-posting fulfillment document with no accounting journals, no accounts receivable, no VAT filing, no ZATCA, no payment, no email, and no automatic stock movement.
- Source cards now make source links traceability-only and avoid implying invoice, quote, stock, accounting, tax, email, payment, or inventory mutation.

## Stock Issue Reference-Only Wording

- Linked stock issue is labeled `Linked stock issue (reference only)`.
- Helper text says: `Linked stock issue is shown for reference. This Delivery Note does not create, approve, void, or reverse inventory movement.`
- Delivery-note line source labels now say `Stock issue line (reference only)` when a line points to a sales stock issue line.

## What Remains Reference-Only

- Sales stock issue linkage remains a reference-only relationship from the delivery-note UI.
- Inventory movement remains handled by the sales stock issue workflow, not by delivery notes.
- No stock issue picker UI was added.
- No stock issue creation, approval, void, reversal, COGS posting, or stock movement behavior was added.

## What Was Intentionally Skipped

- No automatic inventory movement from delivery notes.
- No stock issue picker UI.
- No delivery route logistics, shipment carrier integration, customer email sending, payment links, payment gateway capture, collections automation, online customer acceptance, live bank feeds, payroll, fixed assets, real ZATCA, PDF/A-3, official VAT filing, production hosting, object-storage migration execution, backup/restore execution, hosted/customer-data checks, or deployed production/customer-data E2E.
- No backend payload or lifecycle behavior was changed; reverse panels use existing delivery-note list data.
- No marketing files were modified.

## Marketing Typecheck Blocker

- `apps/web/src/app/marketing.test.tsx` remains an unrelated untracked file.
- Repo-wide web typecheck is still expected to fail on `HomePage` being typed as `() => void` at lines 35 and 65 until that unrelated marketing work is fixed.

## Validation Results

- `corepack pnpm --filter @ledgerbyte/web test -- related-delivery-notes-panel page.test.tsx delivery-note-form.test.tsx documents global-search permissions` passed: 28 suites, 100 tests.
- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/delivery-note-workflow.visual.spec.ts` passed: 4 browser tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` failed only on unrelated untracked `apps/web/src/app/marketing.test.tsx` errors at lines 35 and 65: `HomePage` cannot be used as a JSX component because its type is `() => void`.
- Repo-wide `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` were not run after the unrelated web typecheck blocker was confirmed.

## Remaining Delivery Note Gaps

- No stock-issue picker UI; any stock issue linkage remains reference-only.
- No delivery-note customer email/send workflow.
- No shipment/carrier/logistics workflow.
- No deployed E2E with safe seeded data.
- No hosted/customer-data proof, accountant sign-off, or production hardening evidence.

## Recommended Next Development Sprint

Run a bounded Delivery Note Stock Issue Reference UI Sprint only if the inventory policy is ready: keep stock issue selection reference-only, avoid automatic stock movement, and add accountant-reviewed wording around how delivery notes and sales stock issues differ.
