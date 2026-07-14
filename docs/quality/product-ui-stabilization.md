# Product UI Stabilization Ledger

Status: foundation batch in progress
Branch: `codex/ui-stabilization-foundation`
Baseline ref: `origin/main` at `dad8adce`

## Coverage contract

The audit covers every shipped page module under `apps/web/src/app/**/page.tsx` and every entry in `apps/web/src/lib/app-routes.ts`. The current baseline contains 205 page modules and 96 canonical route definitions (92 active and 4 intentionally planned). Each audit row must record:

| Field | Required value |
| --- | --- |
| Surface | Route/workflow and source page or shared component |
| Role | Owner, Admin, Accountant, Sales, Purchases, or Viewer |
| Viewport | 1440x1000 desktop, 1024x768 tablet, or 390x844 mobile |
| Locale | English or Arabic/RTL |
| State | Normal, loading, empty, zero-value, large-data, long-text, validation, API failure, denied, success, or destructive |
| Finding | Exact reproduction, expected result, actual result, and evidence |
| Classification | Product defect, test/fixture defect, intentional capability gap, or external blocker |
| Resolution | Severity, root cause, regression test, batch, status, and verification command |

Planned route entries and provider/production/compliance proof boundaries remain explicit readiness states; they are not converted into new features during this stabilization program.

## Route/page inventory audit

The inventory is checked from the filesystem and the authoritative `APP_ROUTES` registry rather than maintained as a hand-counted list:

| Inventory | Result | Evidence |
| --- | --- | --- |
| Shipped page modules | 205 total; 188 signed-in `(app)` modules and 17 public/auth modules | `pnpm run verify:ui:inventory` |
| Canonical route definitions | 96 total; 92 active and 4 planned | `pnpm run verify:ui:inventory` |
| Active route-to-page mapping | 92 of 92 active routes resolve to a page module | `pnpm run verify:ui:inventory` |
| Planned capability gaps | `/inbox`, `/ai/proposals`, and `/integrations/health` intentionally have no page module; `/report-packs` remains an explicit planned placeholder | `pnpm run verify:ui:inventory` |
| Role coverage contract | Owner, Admin, Accountant, Sales, Purchases, Viewer fixtures are available to route and create-menu tests | `tests/visual/visual-fixtures.ts`, `tests/visual/role-filtered-route-polish.visual.spec.ts` |
| Viewport coverage contract | Desktop 1440x1000, tablet 1024x768, mobile 390x844 for the role-filtered route matrix | `tests/visual/role-filtered-route-polish.visual.spec.ts` |
| Locale coverage contract | English/LTR and Arabic/RTL route checks are maintained; the Arabic suite covers 59 authenticated routes at desktop, tablet, and mobile sizes | `tests/visual/arabic-locale.visual.spec.ts` |
| All-active-route structural matrix | 92 active routes are exercised per role/viewport cell; bounded local evidence currently passes Owner/desktop and Viewer/mobile cells (the full 18-cell matrix remains available for low-concurrency CI or operator-approved runs) | `tests/visual/all-active-routes.visual.spec.ts`; `UI_ROUTE_AUDIT_ROLE=Viewer UI_ROUTE_AUDIT_VIEWPORT=mobile pnpm exec playwright test -c playwright.visual.config.ts tests/visual/all-active-routes.visual.spec.ts --workers=1` |

Every future route/page finding must link back to this inventory and record the required role, viewport, locale, state, reproduction, classification, and verification fields from the coverage contract above. The inventory command is a merge gate so new page modules or route definitions cannot silently bypass the audit ledger.

The per-page disposition register is checked in at [`ui-route-page-dispositions.json`](./ui-route-page-dispositions.json). It contains one stable row for each of the 205 page modules, including the complete role/viewport/locale/state contract and the current baseline disposition. Run `pnpm run ui:route-dispositions` to refresh it after a route change and `pnpm run test:ui:route-dispositions` to fail on drift.

## Baseline verification

| Gate | Result |
| --- | --- |
| `pnpm run verify:diff` | Passed |
| `pnpm run verify:local:web` | Passed |
| `pnpm run db:generate` | Passed; generated client only |
| `pnpm run verify:local:api` | Passed after client generation |
| `pnpm run verify:local:guards` | Passed |
| `pnpm run verify:repo` | Passed: package typechecks, 2,531 API tests, package tests, and web/API builds |
| `pnpm run test:visual -- tests/visual/polished-workflows.visual.spec.ts` | Passed: 31 desktop/tablet/mobile route checks with no overflow or React key warnings |
| `node node_modules/jest/bin/jest.js --config jest.config.cjs --runInBand` (from `apps/web`) | Passed: 187 suites, 860 tests |
| `pnpm run verify:local:web` | Passed: diff check and web typecheck |
| `pnpm run test:visual -- tests/visual/role-filtered-route-polish.visual.spec.ts` | Passed: 171 role/viewport checks after adding the Admin fixture profile |

The initial fresh-worktree API typecheck failure was classified as a setup prerequisite because Prisma client artifacts were absent; it was resolved by the approved local generation step and is not a product defect.

## Stabilization batch verification

The final local gates were run sequentially with bounded workspace concurrency to preserve host capacity:

| Gate | Result |
| --- | --- |
| `node node_modules/jest/bin/jest.js --config jest.config.cjs --runInBand` (from `apps/web`) | Passed: 187 suites, 860 tests |
| `pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand` | Passed: 248 suites, 2,531 tests passed, 35 skipped |
| `pnpm --workspace-concurrency=1 typecheck` | Passed: all 8 checked workspace projects |
| `pnpm --workspace-concurrency=1 build` | Passed: packages, API build, and Next production build (142 static pages generated) |
| `pnpm run verify:local:web` | Passed |
| `pnpm run verify:local:api` | Passed with a single 4 GB Node heap cap |
| `pnpm run verify:local:guards` | Passed |
| `pnpm run db:generate` | Passed; generated Prisma client only |
| `pnpm run verify:ui:inventory` and `pnpm run test:verify:ui:inventory` | Passed |
| `pnpm exec playwright test -c playwright.visual.config.ts tests/visual/arabic-locale.visual.spec.ts --workers=1` | Passed: 177 RTL route/viewport checks across 59 authenticated routes |
| `pnpm exec playwright test -c playwright.visual.config.ts tests/visual/role-filtered-route-polish.visual.spec.ts --workers=1` | Passed: 171 role-filtered route and create-menu checks across Owner, Admin, Accountant, Sales, Purchases, and Viewer at desktop/tablet/mobile |
| `pnpm exec playwright test -c playwright.visual.config.ts tests/visual/polished-workflows.visual.spec.ts --workers=1` | Passed: 31 polished workflow checks at desktop/tablet/mobile |
| Bounded all-route visual cells | Owner/desktop and Viewer/mobile each passed all 92 active routes with one worker; the full 18-cell matrix remains available through the same harness and explicit role/viewport environment selectors |

The repository-wide gate was decomposed into these equivalent sequential commands because its default recursive runner starts multiple package processes at once; this preserves the requested 20–30% CPU and 4–5 GB memory reserve without reducing coverage.

## Findings

| ID | Surface | Classification | Severity | Status | Evidence / regression |
| --- | --- | --- | --- | --- | --- |
| UI-001 | Shared `AttachmentPanel` delete action | Product defect: native browser confirmation was inaccessible and untestable in the app UI | P2 | Fixed in foundation batch | `apps/web/src/components/attachments/attachment-panel.test.tsx`; uses `LedgerActionDialog` with cancel, confirm, and busy behavior |
| UI-002 | Mobile workspace navigation drawer | Product defect: Escape did not close the open drawer, leaving keyboard users without a predictable dismissal path | P2 | Fixed in foundation batch | `apps/web/src/components/app-shell/sidebar.test.tsx`; Escape closes the drawer and the drawer exposes `aria-modal` |
| UI-003 | Sales invoice void and draft-delete actions | Product defect: native browser confirmations bypassed the product dialog system and could not be asserted in route tests | P2 | Fixed in revenue batch | `apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx`; void and delete now use `LedgerActionDialog` with busy/error-preserving behavior |
| UI-004 | Customer payment and refund void actions (list and detail) | Product defect: native confirmations blocked keyboard/test workflows and duplicated destructive-action behavior across revenue surfaces | P2 | Fixed in revenue batch | Existing payment/refund route suites pass after migrating all four actions to `LedgerActionDialog` |
| UI-005 | Credit-note void/delete/allocation reversal actions | Product defect: native confirm/prompt flows prevented accessible reason collection and left destructive allocation reversal outside the shared dialog contract | P2 | Fixed in revenue batch | `apps/web/src/app/(app)/sales/credit-notes/[id]/page.test.tsx` passes; reversal reason is now an optional controlled textarea |
| UI-006 | Sales inventory-return cancel/void/stock-in actions | Product defect: destructive workflow and operational stock posting relied on blocking browser confirmation | P2 | Fixed in revenue batch | `apps/web/src/app/(app)/sales/inventory-returns/[id]/page.test.tsx` passes with explicit dialog confirmation |
| UI-007 | Purchase-bill void and draft-delete actions | Product defect: AP destructive actions bypassed the shared dialog and were inaccessible to route-level keyboard tests | P2 | Fixed in payables batch | `apps/web/src/app/(app)/purchases/bills/[id]/page.test.tsx` passes after both actions moved to `LedgerActionDialog` |
| UI-008 | Fiscal-period lock action | Product defect: irreversible period lock used a blocking browser confirmation and had no product-level focus/escape semantics | P2 | Fixed in accounting batch | `pnpm --filter @ledgerbyte/web exec tsc --noEmit --pretty false` passes; lock now uses `LedgerActionDialog` with busy protection |
| UI-009 | Role-filtered visual fixture coverage | Test/fixture defect: the required Admin role was absent from the shared visual role matrix | P2 | Fixed in foundation batch | Admin added to shared fixtures and route/create-menu matrix; 171 Playwright checks pass across desktop/tablet/mobile |
| UI-010 | Item delete action | Product defect: inventory master-data deletion used a blocking browser confirmation instead of the shared accessible dialog | P2 | Fixed in banking/inventory batch | `apps/web/src/app/(app)/items/page.test.tsx` passes; delete now preserves the item context while the request is busy |
| UI-011 | Inventory-adjustment draft deletion | Product defect: adjustment deletion used a blocking browser confirmation; the detail route had no pre-existing Jest suite | P2 | Fixed in banking/inventory batch | Web typecheck passes; the shared dialog now preserves the adjustment context and busy state (a route test remains an explicit follow-up) |
| UI-012 | Supplier refund void actions (list and detail) | Product defect: AP refund voids bypassed shared focus, Escape, and busy-state behavior | P2 | Fixed in payables batch | Existing supplier-refund list/detail suites pass after both actions moved to `LedgerActionDialog` |
| UI-013 | Purchase-order close/void/draft-delete actions | Product defect: supplier commitment lifecycle actions relied on native confirmations | P2 | Fixed in payables batch | `apps/web/src/app/(app)/purchases/purchase-orders/[id]/page.test.tsx` passes with explicit dialog-backed actions |
| UI-014 | Purchase debit-note void/delete/allocation reversal | Product defect: AP adjustment actions used native confirm/prompt flows instead of accessible reason collection | P2 | Fixed in payables batch | `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.test.tsx` passes; reversal reason is now an optional controlled textarea |
| UI-015 | Cash-expense void actions (list and detail) | Product defect: immediate expense reversal used native blocking confirmation | P2 | Fixed in payables batch | Existing cash-expense list/detail suites pass after migrating both actions to `LedgerActionDialog` |
| UI-016 | Purchase-receipt void/asset-post/reversal actions | Product defect: inventory accounting actions used native confirmations; the detail route has no pre-existing Jest suite | P2 | Fixed in banking/inventory batch | Web typecheck passes; all three actions now use the shared dialog (a focused route test remains an explicit follow-up) |
| UI-017 | Sales-stock-issue void/COGS-post/reversal actions | Product defect: inventory COGS actions used native confirmations; the detail route has no pre-existing Jest suite | P2 | Fixed in banking/inventory batch | Web typecheck passes; all three actions now use the shared dialog (a focused route test remains an explicit follow-up) |
| UI-018 | FX-revaluation post/reversal actions | Product defect: accounting lifecycle controls used native confirmations and could not be asserted through the product dialog contract | P2 | Fixed in accounting batch | `apps/web/src/app/(app)/fx-revaluations/page.test.tsx` passes with explicit post/reverse dialog confirmation |
| UI-019 | Supplier-payment void and unapplied-allocation reversal | Product defect: AP payment actions used native confirm/prompt flows instead of controlled reason collection | P2 | Fixed in payables batch | Existing supplier-payment list/detail suites pass; reversal reason is now an optional controlled textarea |
| UI-020 | Purchase-return cancel/void/stock-in actions | Product defect: supplier return lifecycle and operational stock posting used blocking browser confirmations | P2 | Fixed in payables batch | `apps/web/src/app/(app)/purchases/returns/[id]/page.test.tsx` passes with explicit dialog-backed actions |
| UI-021 | Inventory-variance proposal workflow | Product defect: submit/approve/post/reverse/void actions used native confirm/prompt flows; the detail route has no pre-existing Jest suite | P2 | Fixed in banking/inventory batch | Web typecheck passes; all workflow actions now use controlled dialog notes/reasons (focused route test remains an explicit follow-up) |
| UI-022 | Accounting-close cycle transitions and manual-task reopen | Product defect: cycle return/close/lock and task reopen used blocking browser prompt/confirm flows, preventing accessible reason capture and deterministic retry behavior | P2 | Fixed in accounting-close batch | `apps/web/src/app/(app)/accounting-close/[cycleId]/page.test.tsx` passes all 15 tests; cycle actions and reopen now use `LedgerActionDialog` |

## Foundation batch checklist

- [x] Isolated clean worktree from current `origin/main`.
- [x] Baseline repository verification recorded.
- [x] Shared `LedgerActionDialog` and `LedgerTextarea` primitives added with focused tests.
- [x] First high-risk destructive workflow migrated and regression-tested.
- [x] Existing polished-workflows visual matrix passed at desktop, tablet, and mobile.
- [x] Mobile navigation Escape dismissal and modal semantics covered.
- [ ] Shell, setup, dashboard, navigation, and fallback-state audit completed.
- [ ] Foundation visual matrix completed for all required roles, viewports, and locales.

## Verification evidence policy

Generated visual evidence belongs under the ignored path `artifacts/visual-qa/product-wide-stabilization/<batch>/`. Stable regression snapshots may be committed only when they represent a deliberate product contract. Every merged batch must update this ledger with exact commands and results; unresolved findings must retain their classification instead of being silently closed.

## Remaining native-dialog inventory

No native `window.confirm` or `window.prompt` call sites remain under `apps/web/src`. Future destructive or reasoned workflow actions must use `LedgerActionDialog` so keyboard, focus, busy, and validation behavior remain consistent.
