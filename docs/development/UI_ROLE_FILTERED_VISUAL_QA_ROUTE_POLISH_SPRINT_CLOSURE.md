# UI Role-Filtered Visual QA Route Polish Sprint Closure

Date: 2026-06-16

## Summary

- PR `#55` (`Add authenticated UI visual QA route hardening`) was merged into `main` before this branch began.
- Added role-filtered local visual QA for route access and create-menu behavior.
- Reused the existing local visual session and read-only API mock strategy.
- Generated local screenshot evidence under `artifacts/visual-qa/role-filtered-route-polish/`.

## Scope

- Branch: `feature/ui-role-filtered-visual-qa-route-polish`
- Base: `origin/main` after PR `#55` merge commit `311ef752bf692c16f17cafa361c8b1522cb686e8`
- Primary test: `tests/visual/role-filtered-route-polish.visual.spec.ts`
- Fixture: `tests/visual/visual-fixtures.ts`

## Role Fixture Approach

- `primeVisualSession(page, { roleProfile })` sets the local visual browser session.
- `installVisualApiMocks(page, { roleProfile })` returns role-specific `/auth/me` fixture data.
- Role profiles are test-only wrappers around the existing shared default role permission sets.
- No real auth provider integration, production auth behavior, hosted data, database mutation, external provider call, ASP connection, ZATCA call, seed, reset, or delete path is used.

## Roles Checked

- `Owner`
- `Accountant`
- `Sales`
- `Purchases`
- `Viewer`

Route access was checked for `Owner` and `Viewer`. Create-menu permission filtering was checked for all five role profiles.

## Routes And Viewports Checked

Viewports:

- Desktop: `1440x1000`
- Tablet: `1024x768`
- Mobile: `390x844`

Routes:

- `/dashboard`
- `/sales/invoices`
- `/sales/invoices/new`
- `/purchases/bills`
- `/purchases/bills/new`
- `/customers/customer-1`
- `/suppliers/supplier-1`
- `/sales/customer-payments`
- `/purchases/supplier-payments`
- `/sales/credit-notes`
- `/purchases/debit-notes`
- `/documents`
- `/reports`
- `/settings`
- `/settings/storage`
- `/settings/compliance`
- `/bank-accounts`

## Visual Checks

- Authenticated app shell visible when access is allowed or denied.
- Allowed routes show their expected heading and stable route content.
- Disallowed routes show the existing `Access denied` panel.
- Viewer does not see banking sidebar navigation, organization setup, or new-journal shortcuts.
- Create menu links appear only when the role has the required create permission.
- Unauthorized create actions remain disabled rather than clickable.
- Create menu links point to local application routes.
- No document-level horizontal overflow.
- No severe topbar/content overlap.
- Conservative visible wording is checked during the role matrix.

## Screenshot Policy

- Generated screenshots: `artifacts/visual-qa/role-filtered-route-polish/*.png`
- Generated report: `artifacts/visual-qa/role-filtered-route-polish/visual-results.json`
- Screenshot count from the full pass: `117`
- Screenshots are intentionally not committed.
- `artifacts/` remains ignored.

## Issues Found And Fixed

- Role-aware `/auth/me` fixture support was added for the shared default roles.
- Read-only `/roles` and `/organization-members` fixture responses were added so `/settings` can render locally.
- Visual assertions were tightened to exact labels where route names overlap, such as `Dashboard` and `AP dashboard`.
- Tablet shell assertions now match the actual `lg` breakpoint behavior.
- Allowed-route assertions use stable route content instead of assuming every role can see create actions.
- No app UI source defect required a frontend behavior change.

## Boundaries Held

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed, reset, or delete commands.
- No hosted/customer-data mutation.
- No production auth provider behavior change.
- No payment/accounting/business logic change.
- No UAE PINT-AE behavior change.
- No ZATCA behavior change.
- No real provider or ASP call.
- No real email.
- No Vercel or Supabase command.
- No production infrastructure command.
- No production compliance claim.

## Verification

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/role-filtered-route-polish.visual.spec.ts`
  - Result: `117 passed`
- `corepack pnpm --filter @ledgerbyte/web test -- sidebar`
  - Result: passed, with the existing React `act(...)` warning from `ScrollAreaRoot`.
- `corepack pnpm --filter @ledgerbyte/web test -- dashboard`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- invoices`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- bills`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- customer-payments`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- supplier-payments`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web test -- financial-flow-scene`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck`
  - Result: passed.
- `corepack pnpm --filter @ledgerbyte/web build`
  - Result: passed.
- `corepack pnpm verify:diff`
  - Result: passed.
- `corepack pnpm verify:ci:local`
  - Result: passed after one clean retry; the first attempt was blocked by transient DNS resolution while Prisma downloaded its local engine.
- `git diff --check`
  - Result: passed.
- `git diff --cached --check`
  - Result: passed after staging.
- Forbidden visible-claim scan over touched frontend visual files and generated `visual-results.json`
  - Result: clean.

## Remaining UI Migration Scope

- Deeper role-filtered detail states.
- Refund and collection detail routes.
- Banking/reconciliation detail polish.
- Deeper report route review.
- Accountant review of dense mobile table/card readability.
