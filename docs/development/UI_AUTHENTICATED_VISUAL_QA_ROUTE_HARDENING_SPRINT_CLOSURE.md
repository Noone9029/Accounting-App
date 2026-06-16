# UI Authenticated Visual QA Route Hardening Sprint Closure

Date: 2026-06-16

## Summary

- PR `#54` (`Harden Stitch frontend foundation`) was merged into `main` before this branch began.
- Added an authenticated local visual QA matrix for high-priority frontend routes.
- Reused the existing visual session helper and expanded read-only visual API fixtures instead of changing production auth behavior.
- Generated local screenshot evidence under `artifacts/visual-qa/authenticated-route-hardening/`.

## Scope

- Branch: `feature/ui-authenticated-visual-qa-route-hardening`
- Base: `origin/main` after PR `#54` merge commit `0a6c5ddde244b5298933e88e4393516ff9996982`
- Primary test: `tests/visual/authenticated-route-hardening.visual.spec.ts`
- Fixture: `tests/visual/visual-fixtures.ts`

## Authenticated Fixture Approach

- `primeVisualSession(page)` sets the existing local `visual-token` and `org-visual` browser state.
- `installVisualApiMocks(page)` intercepts the visual API base URL and returns deterministic read-only fixtures.
- The fixture covers organization, user, permissions, dashboard, customers, suppliers, invoices, purchase bills, customer payments, supplier payments, credit notes, debit notes, compliance readiness, storage readiness, and backup planning.
- No real auth provider integration, hosted data, database mutation, external provider call, ASP connection, ZATCA call, seed, reset, or delete path is used.

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
- `/sales/customer-payments/new?customerId=customer-1`
- `/sales/customer-payments/payment-1`
- `/purchases/supplier-payments`
- `/purchases/supplier-payments/new?supplierId=supplier-1`
- `/purchases/supplier-payments/supplier-payment-1`
- `/sales/credit-notes`
- `/purchases/debit-notes`
- `/documents`
- `/reports`
- `/settings/compliance`
- `/settings/storage`
- `/bank-accounts`

## Visual Checks

- Authenticated app shell visible.
- Route heading and primary action/content visible.
- Sidebar/topbar visible for the viewport.
- No document-level horizontal overflow.
- No severe topbar/content overlap.
- Dashboard KPI cards and readiness copy visible.
- Dashboard `FinancialFlowScene` is present and uses the reduced-motion fallback during visual QA.
- Conservative visible wording is checked during the route matrix.

## Screenshot Policy

- Generated screenshots: `artifacts/visual-qa/authenticated-route-hardening/*.png`
- Generated report: `artifacts/visual-qa/authenticated-route-hardening/visual-results.json`
- Screenshot count from the full pass: `60`
- Screenshots are intentionally not committed.
- `.gitignore` now ignores `artifacts/` so local visual evidence does not pollute source commits.

## Issues Found And Fixed

- Visual route assertions were initially picking up hidden sidebar text on small viewports; checks are now scoped to `main` and `banner`.
- `/branches` was missing from the local visual fixture; it now returns an empty read-only list for forms that request branch options.
- Route expectations now match current UI labels for invoice creation, purchase bill creation, and payment receipt output.
- Dashboard mobile readiness verification now checks the visible controlled-beta readiness wording instead of a non-rendered heading.

## Boundaries Held

- No backend API changes.
- No Prisma schema changes.
- No migrations.
- No seed, reset, or delete commands.
- No hosted/customer-data mutation.
- No production auth provider behavior change.
- No UAE PINT-AE behavior change.
- No ZATCA behavior change.
- No real provider or ASP call.
- No Vercel or Supabase command.
- No production infrastructure command.
- No production compliance claim.

## Verification

- `corepack pnpm exec playwright test -c playwright.visual.config.ts tests/visual/authenticated-route-hardening.visual.spec.ts`
  - Result: `60 passed`

Additional required verification is tracked in the branch handoff and PR body.

## Remaining UI Migration Scope

- Role-filtered visual QA states.
- Refund and collection detail routes.
- Banking/reconciliation detail polish.
- Deeper report route review.
- Dense form ergonomics and accountant review of mobile table/card readability.
