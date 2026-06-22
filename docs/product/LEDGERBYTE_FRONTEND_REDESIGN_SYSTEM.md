# LedgerByte Frontend Redesign System

Date: 2026-06-22

This document defines the LedgerByte frontend redesign system used by the full-redesign continuation branch. It is a UI system contract only. It does not change backend behavior, permissions, generated-document storage, signed URL behavior, provider calls, hosted deployment behavior, banking execution, or compliance submission behavior.

## Product Principles

- LedgerByte is an accounting operations product, not a marketing site. Screens should prioritize scanning, comparison, review, and repeated action.
- The first viewport should show the real working surface: page title, status, primary context, filters/actions when present, and the first useful data or empty state.
- Copy must stay source-backed. Do not imply live banking, automatic reconciliation, production tax submission, object storage, signed URL delivery, or provider approval unless the repo implements and proves it.
- Admin, compliance, storage, ZATCA, UAE, Peppol, ASP, and backup surfaces must use explicit readiness wording and blocked-state language.

## Layout

- Use `LedgerPage` as the route wrapper and `LedgerPageHeader` for title, description, status badge, metadata, and actions.
- Use `LedgerPageBody` to keep the main route content vertically consistent.
- Use `LedgerToolbar` for filters and page-level controls. Filters should remain compact and wrap cleanly on mobile.
- Use `LedgerMetricGrid` and `LedgerStatCard` for high-level metrics. Keep metric labels short and values scannable.
- Use `LedgerPanel`, `LedgerSection`, `LedgerSidePanel`, and `LedgerReviewPanel` for grouped working content. Do not nest card-like panels inside other decorative cards.

## Data Surfaces

- Use `LedgerDataTable` for dense operational rows. Tables must sit inside horizontal scrollers so mobile and narrow desktop layouts do not cause document-level overflow.
- Keep table headers short. Put status, source, amount, date, owner, and action columns in predictable order.
- Use `LedgerMoney` and `LedgerDate` for recurring amount/date display where possible.
- Row actions must say what happens. Do not show disabled future actions as if they can execute.

## Forms

- Use `LedgerField`, `LedgerFieldLabel`, `LedgerFieldText`, `LedgerInput`, `LedgerSelect`, `LedgerTextarea`, and `LedgerFieldRow` for route forms.
- Use `LedgerFormSection` for grouped form areas where a semantic fieldset improves review.
- Settings forms must separate review-only evidence from real mutations. Dangerous or irreversible actions should not visually dominate routine review controls.

## States

- Use `LedgerStatusBadge` for route and row state. Tones should be semantic: `success`, `warning`, `danger`, `info`, `draft`, or `neutral`.
- Use `LedgerSummaryBand` and `LedgerAlert` for important route-level truth, blockers, and safety notices.
- Use `LedgerLoadingState`, `LedgerErrorState`, and `LedgerEmptyState` for common route states.
- Empty states should state the true absence and offer only existing routes/actions.

## Accessibility And Mobile

- Page titles remain real headings. Tables, groups, alerts, loading states, and status regions should expose semantic roles when the component can do that without noise.
- Buttons and links keep visible labels. Icon-only controls require accessible names.
- Mobile layouts should stack controls, preserve readable table access through scrollers, and avoid hidden critical status text.
- Text must wrap within its container; route cards and status badges must tolerate long business names, document numbers, and provider labels.

## Current Component Additions

- `LedgerPageBody`
- `LedgerMetricGrid`
- `LedgerLoadingState`
- `LedgerErrorState`
- `LedgerDataTable`
- `LedgerSidePanel`
- `LedgerFormSection`
- `LedgerFieldRow`
- `LedgerDate`
- `LedgerKbd`
- `LedgerReviewPanel`
- `LedgerWorkflowCard`
- `LedgerSummaryBand`
- `LedgerBreadcrumbs`

## Adoption Rule

New or migrated frontend routes should use the shared `ledger-system` primitives first. Route-specific markup remains acceptable for real domain behavior, but repeated layout, table, form, state, badge, and warning patterns should move through this system so later frontend slices can converge without changing product truth.

## Current Route Adoption

- Sales surfaces: `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]/edit`, `/sales/quotes`, `/sales/quotes/new`, `/sales/quotes/[id]`, and `/sales/quotes/[id]/edit`.
- Purchase list surfaces: `/purchases/bills` and `/purchases/debit-notes`.
- Banking list surfaces: `/bank-accounts` and `/bank-transfers`.
- Contacts surfaces: `/contacts`, `/customers/[id]`, `/suppliers/[id]`, `/customers/[id]/statement`, and `/suppliers/[id]/statement`.
- Inventory balance surface: `/inventory/balances`.
- Existing foundation surfaces: `/settings`, `/documents`, `/report-packs`, dashboard foundation, auth form, and representative roles/settings routes.
