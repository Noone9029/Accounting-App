# Controlled Beta Final Product Readiness Triage

Date: 2026-06-12

Base merge commit after PR #23: `e9a4b819` (`Merge pull request #23 from Noone9029/codex/controlled-beta-payments-statements-workflow-hardening`)

Branch: `codex/controlled-beta-final-product-readiness-triage`

## Surfaces Reviewed

- Setup and onboarding: `apps/web/src/app/(app)/setup`, setup wizard references, first-workflow guidance, and empty-state messaging.
- Dashboard: `apps/web/src/app/(app)/dashboard`, quick actions, attention wording, first-workflow prompts, and report/control cards.
- Customers, suppliers, and contacts: `apps/web/src/app/(app)/customers`, `suppliers`, `contacts`, and `apps/web/src/components/parties/party-pages.tsx`.
- Sales workflow: `apps/web/src/app/(app)/sales/customer-payments` and payment-detail follow-on links into invoices and reports.
- Purchases workflow: `apps/web/src/app/(app)/purchases/supplier-payments` and payment-detail follow-on links into bills and reports.
- Documents: `apps/web/src/app/(app)/documents` for generated-output/archive wording and current CTA posture.
- Reports: `apps/web/src/components/reports/report-pages.tsx` plus aged receivables/payables return-path behavior.
- Settings: `apps/web/src/app/(app)/settings` safety wording review only; no setting behavior changes were needed in this arc.
- Docs and handoff: `CODEX_HANDOFF.md`, `BUG_AUDIT.md`, and this readiness artifact.

## Fixes Made

- Preserved workspace-filtered payment list context inside customer and supplier payment `View` links, so detail routes no longer drop users out of the filtered journey.
- Preserved the same context on customer and supplier payment-detail `Back` actions, so workspace > payment list > payment detail can round-trip without falling back to the generic payment ledgers.
- Preserved payment-detail context on customer `View invoice` / `AR report` next actions and supplier `View bill` / `AP report` next actions, so users can review adjacent workflow surfaces and return to the payment step they came from.
- Added targeted frontend regression coverage for the list/detail return-path chain on both customer and supplier payments.
- Follow-up route-load verification is now captured in `docs/development/CONTROLLED_BETA_ROUTE_LOAD_VERIFICATION_BATCH.md` on top of the merged PR `#24` base.
- Follow-on statement workspace polish on the merged PR `#25` base now adds direct customer/supplier statement entry cards, explicit shared-statement workspace handoff links, and preserved statement-context return paths through contact-ledger drill-downs plus invoice/bill follow-on actions.
- Dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes now reuse the existing statement endpoints safely, keep invoice/bill/payment/aging return paths anchored to the statement route, and leave the shared contact statement tabs as fallback only.

## Tests And Checks Run

- `corepack pnpm install --frozen-lockfile`
- `node node_modules/.pnpm/jest@30.3.0_@types+node@22._cc389d01ae9b92078ddae9af4dfd390d/node_modules/jest/bin/jest.js --config jest.config.cjs --runTestsByPath src/app/(app)/sales/customer-payments/page.test.tsx src/app/(app)/sales/customer-payments/[id]/page.test.tsx src/app/(app)/purchases/supplier-payments/page.test.tsx src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:diff`
- `git diff --check`

## Controlled-Beta Readiness Verdict

LedgerByte remains suitable for controlled beta/user-testing with selected testers and explicit non-production limits. The main product journey is coherent enough for continued controlled-beta use, but this triage does not prove production readiness, paid SaaS readiness, official VAT filing readiness, or ZATCA compliance.

## Blockers

### Must fix before controlled beta expansion

- Continue checking older detail surfaces for the same context-loss pattern if they are part of the tester script, especially where workflow pages link into documents, reports, or shared contact views.

### Should fix during early controlled beta

- Revisit shared contact-detail fallback UX if tester feedback shows the combined contact statement surface is still too generic beside the new dedicated customer/supplier statement routes.
- Keep tightening route continuity on older secondary pages that were not changed in this arc if tester feedback shows more “lost in the app” moments.

### Production-only blocker

- Final production hosting, backups/restore proof, monitoring, email/provider production behavior, billing/legal/support controls, production security hardening, and accountant-reviewed production operations remain outside controlled-beta scope.

### Parked ZATCA blocker

- Real ZATCA network execution, OTP/CSID custody, signing, clearance/reporting, PDF-A3, and production compliance remain blocked and should not block controlled beta while the current local/readiness-only posture stays explicit.

## Recommended Next Track

`Controlled beta pilot invite readiness packet`
