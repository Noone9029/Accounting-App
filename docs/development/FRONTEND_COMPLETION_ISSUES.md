# Frontend Completion Issues

Goal ID: `FRONTEND-COMPLETION-01`

Branch: `codex/frontend-completion-01`

Baseline inspected: `d5020961`

This file tracks confirmed frontend product-completion findings only. It does not create beta launch, provisioning, roadmap, deployment, backend, schema, provider, storage, compliance, accounting, report, VAT, inventory valuation, banking logic, or hosted-environment work.

| Route | Issue | Severity | Type | Fix status | Test added | Remaining follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `/bank-accounts`, `/bank-transfers` sidebar category | Banking sidebar exposed `Bank transactions`, `Reconciliation`, and `Cheques` as separate child links even though each pointed to `/bank-accounts`, making the category look more directly routable than it is. | P1 | navigation / broken-link | Fixed by keeping only distinct Banking child destinations: `Bank accounts` and `Bank transfers`. | `apps/web/src/components/app-shell/sidebar.test.tsx` asserts the Banking child link list. | Add direct top-level routes later only if product scope creates real routable banking workflow indexes. |
| `/settings/compliance` sidebar children | Settings sidebar repeated `/settings/compliance` as both `Compliance settings` and `API / provider setup`, which looked like a separate provider setup workflow while no provider connection is live. | P1 | navigation / placeholder | Fixed by removing the duplicate child destination from Settings; `Compliance settings` remains reachable and conservative. | `apps/web/src/components/app-shell/sidebar.test.tsx` asserts Settings child hrefs are not duplicated. | Add a real provider setup route later only after provider scope is approved and implemented. |
| `/` | Public route metadata and route helpers treated `/` as the English marketing home, but the actual app route redirected `/` to `/login`, so the canonical public home did not render. | P1 | broken-link / route | Fixed by rendering the existing `MarketingHomePage` at `/` with matching marketing metadata. | `tests/visual/public-auth-marketing.visual.spec.ts` now checks `/` across desktop/tablet/mobile. | None for English home; Arabic public routes remain optional visual follow-up. |
| `/`, `/product`, `/pricing`, `/login`, `/register`, `/password-reset`, `/invite/accept` | Public/auth/marketing had Jest coverage and live login evidence, but no first-class desktop/tablet/mobile Playwright visual fixture family after the redesign. | P2 | visual | Fixed by adding `public-auth-marketing.visual.spec.ts` with public/auth route headings, key states, overflow checks, and forbidden-claim checks. | `tests/visual/public-auth-marketing.visual.spec.ts`; invite preview fixture added in `tests/visual/visual-fixtures.ts`. | Expand Arabic public routes in a later fixture pass if they require separate screenshot signoff. |
