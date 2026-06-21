# LedgerByte Frontend Redesign

Date: 2026-06-22

This branch continues the full LedgerByte frontend redesign from the UI/UX rebuild foundation branch. It is intentionally stacked on `codex/ui-ux-rebuild-foundation` so the PR can stay reviewable instead of duplicating the foundation diff.

## Scope Implemented In This Slice

- Expanded `apps/web/src/components/ui/ledger-system.tsx` with page body, metric grid, table, loading/error, form, workflow, summary, review, and breadcrumb primitives.
- Migrated `/settings` from a redirect-only root into a grouped administration overview using shared LedgerByte primitives and conservative controlled-beta wording.
- Migrated `/documents` onto shared page/header/filter/table/empty-state primitives while preserving existing generated-document archive behavior, filters, download wording, and local AP email outbox boundaries.
- Migrated `/report-packs` onto shared page/header/metric/table/workflow/disabled-boundary primitives while preserving read-only preview behavior and all disabled execution boundaries.
- Migrated `/purchases/bills` and `/purchases/debit-notes` list surfaces onto shared LedgerByte page/table/state primitives while preserving explicit AP posting and debit-note adjustment boundaries.
- Migrated `/bank-accounts` and `/bank-transfers` list surfaces onto shared LedgerByte page/table/state primitives while preserving manual banking and explicit transfer boundaries.
- Migrated `/contacts` list/create surface onto shared LedgerByte page/panel/table/state primitives while preserving customer/supplier handoff links and conservative readiness wording.
- Updated focused component and route-load tests for the shared system and settings overview route.

## Loop Engineering Progress

### 2026-06-22 Sales Workspace List Loop

- Added `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md` as the full-route tracking artifact for the ongoing redesign loop.
- Migrated `/sales/quotes` list layout, filters, status badges, date/money cells, action buttons, and empty states to shared LedgerByte primitives.
- Tightened `/sales/invoices` list layout around shared page/body, summary, data table, date/money cells, and empty states while preserving explicit finalize behavior.
- Preserved quote truth: quotes remain non-posting and do not create journals, VAT filings, inventory movements, payments, email delivery, or compliance submissions from the list view.
- Preserved invoice truth: invoice finalization remains the only explicit posting action on the list and keeps existing permission gates.

### 2026-06-22 Purchase Workspace List Loop

- Migrated `/purchases/bills` list layout, status badges, date/money cells, action buttons, summary wording, and empty states to shared LedgerByte primitives.
- Migrated `/purchases/debit-notes` list layout, status badges, amount/date cells, action buttons, and empty states to the same shared system.
- Preserved AP truth: bill finalization remains an explicit posting action, debit notes remain explicit supplier adjustments, and these list views do not send payments, execute provider approvals, move storage, or alter supplier balance math outside existing actions.

### 2026-06-22 Banking Workspace List Loop

- Migrated `/bank-accounts` list layout, status badges, date/money cells, action buttons, summary wording, and empty states to shared LedgerByte primitives.
- Migrated `/bank-transfers` list layout, posted/voided status badges, amount/date cells, action button, summary wording, and empty states to the same shared system.
- Preserved manual-banking truth: these list views do not connect to live feeds, move provider money, auto-reconcile, import statements, or match/categorize statement rows.

### 2026-06-22 Contacts Workspace Loop

- Migrated `/contacts` page layout, create panel, readiness summary, table, active/inactive status badges, action buttons, and empty state to shared LedgerByte primitives.
- Preserved contact truth: readiness fields remain local profile data and do not send eInvoices, validate Peppol endpoints, submit ZATCA data, or contact external providers.
- Customer and supplier list routes continue through the shared party module; detail/statement flows remain deferred for a dedicated return-to and transaction-tabs pass.

## Product Boundaries Preserved

- No hosted migration, Supabase mutation, Vercel mutation, provider call, ZATCA/UAE/Peppol/ASP action, banking execution, reconciliation execution, object-storage operation, signed URL operation, generated-document storage mutation, seed/reset/delete command, or shutdown action was added.
- Report packs remain read-only manifest preview only. Generation, export, download, scheduling, email sending, archive writes, object storage, provider calls, and compliance submission remain disabled.
- Generated documents remain bounded by the existing archive and download API behavior. This branch does not claim object-storage or signed URL readiness.
- Settings surfaces remain admin/review/configuration entry points. They do not execute provider or compliance operations.

## Remaining Frontend Route Families

- Sales, Purchase, Banking, and Contacts detail/form/supporting flows plus inventory list/detail/edit flows need systematic conversion to `LedgerPage`, `LedgerToolbar`, `LedgerDataTable`, and shared form primitives.
- Banking detail, statement import/review, rule review, deposit, cheque, clearing, and reconciliation-support routes need a dedicated manual-banking redesign slice that preserves non-live wording.
- Reports and report drilldowns need a dense accounting-table redesign pass beyond the report-pack preview.
- Existing settings subroutes need gradual migration to shared panels/forms while preserving each route's permission and mutation behavior.
- Setup/onboarding and dashboard surfaces need final alignment with the ledger-system primitives after typed onboarding work settles.
- Auth and marketing-adjacent entry screens were not included in this operational app-shell slice.

## Recommended Next Goal

Migrate one high-traffic operational family, preferably sales invoices/quotes or banking statement transactions, using the shared ledger-system primitives and route-specific visual QA.
