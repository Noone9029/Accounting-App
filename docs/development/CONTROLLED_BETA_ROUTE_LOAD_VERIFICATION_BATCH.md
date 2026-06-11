# Controlled Beta Route-Load Verification Batch

Date: 2026-06-12

Base merge commit after PR #24: `114dfb3f` (`Merge pull request #24 from codex/controlled-beta-final-product-readiness-triage`)

Branch: `codex/controlled-beta-route-load-verification-batch`

## Route Families Reviewed

- Setup and onboarding: `/setup`, `/organization/setup`, and setup-driven next-step links already covered by existing setup/dashboard helper tests.
- Dashboard and first-workflow prompts: `/dashboard` plus existing quick-action and onboarding-card checks.
- Contacts and workspaces: `/contacts`, `/contacts/[id]`, `/customers`, `/customers/[id]`, `/suppliers`, `/suppliers/[id]`.
- Sales journey: `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]`, `/sales/customer-payments`, `/sales/customer-payments/new`, `/sales/customer-payments/[id]`, `/sales/credit-notes`.
- Purchases journey: `/purchases/bills`, `/purchases/bills/new`, `/purchases/bills/[id]`, `/purchases/supplier-payments`, `/purchases/supplier-payments/new`, `/purchases/supplier-payments/[id]`, `/purchases/debit-notes`, `/purchases/matching`.
- Documents and reports: `/documents`, `/reports`, `/reports/aged-receivables`, `/reports/aged-payables`.
- Settings: `/settings`, `/settings/team`, `/settings/storage`, `/settings/zatca`.

## Routes Covered By Automated Tests

- New route-load batch coverage:
  - `/setup`
  - `/customers`
  - `/customers/[id]`
  - `/suppliers`
  - `/suppliers/[id]`
  - `/reports`
  - `/settings`
  - `/settings/storage`
  - `/sales/invoices`
  - `/sales/invoices/new`
  - `/sales/credit-notes`
  - `/purchases/bills`
  - `/purchases/bills/new`
  - `/purchases/debit-notes`
- Existing targeted route tests re-run on this batch:
  - `/dashboard`
  - `/contacts/[id]`
  - `/documents`
  - `/purchases/bills/[id]`
  - `/purchases/matching`
  - `/purchases/supplier-payments`
  - `/purchases/supplier-payments/[id]`
  - `/sales/customer-payments`
  - `/sales/customer-payments/[id]`
  - `/sales/invoices/[id]`
  - `/settings/team`
  - `/settings/zatca`

## Routes Inspected Manually Or Static-Only

- `/contacts`: existing direct page test already covers the route family, and this pass relied on that existing coverage plus the customer/supplier wrapper tests.
- `/sales/customer-payments/new` and `/purchases/supplier-payments/new`: existing route tests already cover return-path behavior; no code changes were needed here.
- `/reports/profit-and-loss`, `/reports/trial-balance`, `/reports/balance-sheet`, `/reports/vat-summary`, and `/reports/vat-return`: the route family is still driven through `ReportsIndexPage` and report helper tests; this pass did not add separate wrappers for each report page.
- `/settings/documents`, `/settings/number-sequences`, `/settings/email-outbox`, and `/settings/audit-logs`: left unchanged because they were outside the critical batch and no broken route evidence surfaced in this arc.

## Fixes Made

- Added the missing `/settings` root route and redirected it to `/settings/team`, which removes a route-load gap in the controlled-beta settings family.
- Added a focused `apps/web/src/app/(app)/route-load-verification.test.tsx` batch so under-tested controlled-beta route modules now have direct non-mutating render/import checks.

## Tests And Checks Run

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm test -- route-load-verification.test.tsx`
- `corepack pnpm test -- route-load-verification.test.tsx dashboard/page.test.tsx contacts/[id]/page.test.tsx documents/page.test.tsx purchases/bills/[id]/page.test.tsx purchases/matching/page.test.tsx purchases/supplier-payments/page.test.tsx purchases/supplier-payments/[id]/page.test.tsx sales/customer-payments/page.test.tsx sales/customer-payments/[id]/page.test.tsx sales/invoices/[id]/page.test.tsx settings/team/page.test.tsx settings/zatca/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:diff`
- `git diff --check`

## Commands Intentionally Skipped

- API typecheck was skipped because no API files changed.
- Whole-repo `corepack pnpm test` and `corepack pnpm build` were skipped because this arc stayed inside a targeted frontend route-load verification lane.
- Migrations, seed/reset/delete, smoke, E2E, local runtime startup, deployed smoke, real login, real email, ZATCA runtime, backup/restore, deploy, and production infrastructure commands remained explicitly out of scope.

## Remaining Route-Load Blockers

- Customer and supplier statements still live on the shared contact-detail surface instead of dedicated statement routes.
- Older non-critical settings children and secondary workflow routes were not expanded into this batch unless they already had direct tests.
- This batch proves local route/module safety for the covered surfaces only; it does not prove hosted auth/runtime behavior.

## Controlled-Beta Verification Verdict

Controlled-beta critical route families now have targeted local non-mutating route-load coverage on top of the PR #24 merged base. LedgerByte remains controlled beta/user-testing only. This batch does not prove production readiness, paid SaaS readiness, official VAT filing readiness, or ZATCA compliance.

## Next Recommended Arc

`Controlled beta statement workspace polish`
