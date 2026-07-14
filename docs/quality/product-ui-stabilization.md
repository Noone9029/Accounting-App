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

The initial fresh-worktree API typecheck failure was classified as a setup prerequisite because Prisma client artifacts were absent; it was resolved by the approved local generation step and is not a product defect.

## Findings

| ID | Surface | Classification | Severity | Status | Evidence / regression |
| --- | --- | --- | --- | --- | --- |
| UI-001 | Shared `AttachmentPanel` delete action | Product defect: native browser confirmation was inaccessible and untestable in the app UI | P2 | Fixed in foundation batch | `apps/web/src/components/attachments/attachment-panel.test.tsx`; uses `LedgerActionDialog` with cancel, confirm, and busy behavior |
| UI-002 | Mobile workspace navigation drawer | Product defect: Escape did not close the open drawer, leaving keyboard users without a predictable dismissal path | P2 | Fixed in foundation batch | `apps/web/src/components/app-shell/sidebar.test.tsx`; Escape closes the drawer and the drawer exposes `aria-modal` |

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
