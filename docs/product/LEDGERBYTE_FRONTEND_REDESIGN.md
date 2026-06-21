# LedgerByte Frontend Redesign

Date: 2026-06-22

This branch continues the full LedgerByte frontend redesign from the UI/UX rebuild foundation branch. It is intentionally stacked on `codex/ui-ux-rebuild-foundation` so the PR can stay reviewable instead of duplicating the foundation diff.

## Scope Implemented In This Slice

- Expanded `apps/web/src/components/ui/ledger-system.tsx` with page body, metric grid, table, loading/error, form, workflow, summary, review, and breadcrumb primitives.
- Migrated `/settings` from a redirect-only root into a grouped administration overview using shared LedgerByte primitives and conservative controlled-beta wording.
- Migrated `/documents` onto shared page/header/filter/table/empty-state primitives while preserving existing generated-document archive behavior, filters, download wording, and local AP email outbox boundaries.
- Migrated `/report-packs` onto shared page/header/metric/table/workflow/disabled-boundary primitives while preserving read-only preview behavior and all disabled execution boundaries.
- Updated focused component and route-load tests for the shared system and settings overview route.

## Product Boundaries Preserved

- No hosted migration, Supabase mutation, Vercel mutation, provider call, ZATCA/UAE/Peppol/ASP action, banking execution, reconciliation execution, object-storage operation, signed URL operation, generated-document storage mutation, seed/reset/delete command, or shutdown action was added.
- Report packs remain read-only manifest preview only. Generation, export, download, scheduling, email sending, archive writes, object storage, provider calls, and compliance submission remain disabled.
- Generated documents remain bounded by the existing archive and download API behavior. This branch does not claim object-storage or signed URL readiness.
- Settings surfaces remain admin/review/configuration entry points. They do not execute provider or compliance operations.

## Remaining Frontend Route Families

- Sales, purchases, contacts, and inventory list/detail/edit flows need systematic conversion to `LedgerPage`, `LedgerToolbar`, `LedgerDataTable`, and shared form primitives.
- Banking import, rule review, deposit, cheque, clearing, and reconciliation-support routes need a dedicated manual-banking redesign slice that preserves non-live wording.
- Reports and report drilldowns need a dense accounting-table redesign pass beyond the report-pack preview.
- Existing settings subroutes need gradual migration to shared panels/forms while preserving each route's permission and mutation behavior.
- Setup/onboarding and dashboard surfaces need final alignment with the ledger-system primitives after typed onboarding work settles.
- Auth and marketing-adjacent entry screens were not included in this operational app-shell slice.

## Recommended Next Goal

Migrate one high-traffic operational family, preferably sales invoices/quotes or banking statement transactions, using the shared ledger-system primitives and route-specific visual QA.
