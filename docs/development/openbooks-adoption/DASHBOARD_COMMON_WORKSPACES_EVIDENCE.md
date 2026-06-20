# Dashboard Common Workspaces Evidence

## PR Title

`Add dashboard common workspace shortcuts`

## Branch

`codex/openbook-dashboard-quick-actions`

## Commit

`pending before final commit`

## Scope

- `apps/web/src/lib/dashboard.ts`
- `apps/web/src/lib/dashboard.test.ts`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.test.tsx`

## Adopted Behavior

- Behavior inspiration: make common accounting workspaces easier to reach from the dashboard.
- LedgerByte-native specification: use the existing `apps/web/src/lib/app-routes.ts` route registry and LedgerByte permissions.
- OpenBooks source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBooks code copied.
- [x] No OpenBooks schema copied.
- [x] No OpenBooks comments copied.
- [x] No OpenBooks UI text copied.
- [x] No OpenBooks file names, function names, or implementation structure copied.
- [x] No OpenBooks dependency added.
- [x] No OpenBooks source fetched, vendored, imported, translated, ported, or reused.
- [x] Production source does not reference OpenBooks.
- [x] Implementation is LedgerByte-native and follows existing route and permission helpers.

## Files Changed

| File | Purpose |
| --- | --- |
| `apps/web/src/lib/dashboard.ts` | Adds permission-filtered dashboard workspace shortcuts sourced from the app route registry. |
| `apps/web/src/lib/dashboard.test.ts` | Covers route-registry-backed shortcut order, hrefs, descriptions, and permission filtering. |
| `apps/web/src/app/(app)/dashboard/page.tsx` | Renders a read-only `Common workspaces` section in the dashboard side column. |
| `apps/web/src/app/(app)/dashboard/page.test.tsx` | Covers rendered shortcut links and verifies unavailable workspaces are hidden without permission. |
| `docs/development/openbooks-adoption/DASHBOARD_COMMON_WORKSPACES_EVIDENCE.md` | Records adoption-slice evidence and guardrails. |

## Runtime Behavior Changed

`yes`

The dashboard now shows permission-filtered links to common LedgerByte workspaces such as invoices, quotes, products and services, P&L, and team settings when the signed-in user has the relevant existing permissions. The links are read-only navigation affordances and do not mutate records.

## Tests Run

- `corepack pnpm install --frozen-lockfile`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard.test.ts`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard/page`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this route-registry/dashboard-navigation slice unless focused validation fails.
- Browser/E2E run: not run because the change is covered by focused React/Jest rendering and helper tests.

## Screenshots/Evidence Captured

- Not applicable; focused rendering tests cover the dashboard section and links.

## Feature Status

`WORKING`

The bounded dashboard workspace shortcut behavior is implemented, permission-filtered, and covered by focused tests.

## Why Feature Is Not WORKING Yet

- Not applicable for this bounded slice.

## Compliance Claim Scan

- UAE production readiness claimed: `No`
- ZATCA production readiness claimed: `No`
- Peppol production readiness claimed: `No`
- ASP production readiness claimed: `No`
- Notes: no compliance behavior or country-specific readiness posture changed.

## Provider/Network Mutation Scan

- Hosted service touched: `No`
- Provider network call made: `No`
- Customer data mutated: `No`
- Notes: links are local app navigation only.

## Object-Storage/Signed-URL Claim Scan

- Real object storage implemented/proven: `No`
- Signed URLs implemented/proven: `No`
- Generated-document object storage approval status changed: `No`
- Notes: no storage behavior changed.

## Remaining Blockers

- Global search and catalog filter PRs should merge before adding a prefilled `/items` search handoff.
- Further OpenBooks-inspired dashboard changes should remain separate from accounting calculations and provider/compliance claims.

## Next Recommended PR

`Add route-registry-backed dashboard report shortcuts or merge the open search/catalog PRs before adding prefilled item-search handoff.`
