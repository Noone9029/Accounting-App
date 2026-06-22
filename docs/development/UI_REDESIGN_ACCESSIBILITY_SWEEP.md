# UI Redesign Accessibility Sweep

Date: 2026-06-22

Automated axe tooling was not found in the existing test setup during this pass, so this sweep uses existing Testing Library/Playwright role assertions plus code review.

| Area | Finding | Status | Follow-up |
| --- | --- | --- | --- |
| Skip link | `apps/web/src/app/(app)/layout.tsx` includes `Skip to workspace` linking to `#workspace-main`. | Pass by code review. | Add browser a11y test later. |
| Main landmarks | App layout renders `<main id="workspace-main">`; visual specs wait on `main`. | Pass. | Keep in visual fixtures. |
| Sidebar navigation labels | Desktop sidebar uses `aria-label="Workspace navigation"`; mobile uses `aria-label="First workflow navigation"`. | Pass; asserted in visual specs. | None. |
| Topbar labels | Organization switcher, sign out, notifications/help/account icon buttons have accessible names. | Pass by code review. | None. |
| Keyboard focus | Shared inputs/buttons include focus styles through Ledger/Button primitives; skip link becomes visible on focus. | Pass by code review. | Add keyboard tab-order smoke later. |
| Icon-only buttons | App shell icon buttons have `aria-label`; global create/menu close buttons have labels. | Pass. | Continue lint/code review. |
| Form labels | Ledger form patterns wrap labels and inputs; auth pages are covered by `auth-pages.test.tsx`. | Pass by tests/code review. | Add axe coverage. |
| Error/loading/empty states | Shared `StatusMessage`, `LedgerLoadingState`, `LedgerErrorState`, and empty states are used across migrated routes. | Pass. | Add route-level snapshots only where value is high. |
| Table semantics | Shared `LedgerDataTable` renders real `<table>` and broad visual tests assert headers/readability. | Pass. | Keep dense table overflow checks. |
| Status badges | Status text is rendered as words, not color alone, across route families. | Pass by code/test review. | None. |
| Alerts/empty states | Route-load test verifies placeholder routes are non-actionable and empty states are explicit. | Pass. | None. |
| Dialogs/modals | Global create menu uses `role="dialog"`/label; modal-heavy routes are covered by existing focused tests. | Partial. | Add explicit modal focus-trap test later if dialog library does not already cover it. |
| Mobile navigation | Mobile workflow navigation has labels and post-PR #211 overflow fix; authenticated visual checks pass. | Pass. | None. |

Future ticket: add automated accessibility coverage with existing Playwright if dependency policy allows `axe-core`/`@axe-core/playwright`, scoped first to app shell, auth forms, dashboard, document archive, and dense report tables.
