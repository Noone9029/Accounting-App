# UI Redesign Full Stack Merge Plan

Date: 2026-06-22

Goal ID: `UI-REBUILD-MERGE-FULL-01`

## Scope

Merge the completed LedgerByte frontend redesign PR stack into `main`, stabilize dependent PR bases as needed, and verify the final `origin/main` in a fresh clean worktree.

This plan is intentionally merge/stabilization only. It does not add redesign scope, backend behavior, Prisma schema changes, migrations, Supabase/Vercel/provider/storage work, compliance submissions, banking execution, reconciliation behavior, accounting behavior, inventory valuation behavior, seed/reset/delete commands, emails, or shutdown actions.

## Protected Checkout

`E:\Accounting App` is preserved as a no-touch checkout for this goal. It was inspected only for GitHub/repository context and remains on `codex/ui-ux-rebuild-foundation-stale-20260622` with pre-existing local changes. All merge planning and documentation work for this goal uses clean worktrees under `E:\Worktrees\Accounting-App`.

## Repository State Before Merge

- Repository: `Noone9029/Accounting-App`
- Default branch: `main`
- Initial `origin/main` SHA: `12ace1d71aa3f9a60a6b5654a105a116a9e95e0b`
- Merge methods allowed: merge commit, squash, rebase
- Planned merge method: normal merge commit, preserving PR boundaries and stack history
- Branch deletion on merge: disabled; this plan does not delete PR branches

## Discovered Stack Order

The stack was discovered from live GitHub PR base/head relationships, not from PR number alone. The dependency chain is:

| Order | PR | Title | Base branch | Head branch | Head SHA before merge |
| --- | ---: | --- | --- | --- | --- |
| 1 | #146 | Complete LedgerByte frontend redesign route-family migration | `main` | `codex/ui-rebuild-loop-full-frontend` | `4b6e81bbcb8a89be66c550e78cee72db0d2a57e4` |
| 2 | #147 | Continue frontend redesign for contact statements | `codex/ui-rebuild-loop-full-frontend` | `codex/ui-redesign-contacts-statements` | `71bc37fbbfd8a1b53a6b1a739726e69e982cb387` |
| 3 | #148 | Continue frontend redesign for sales documents | `codex/ui-redesign-contacts-statements` | `codex/ui-redesign-sales-documents` | `544efa8e8fb2f6542bf5e82fc67c93a9c6649aab` |
| 4 | #149 | Continue frontend redesign for invoice detail | `codex/ui-redesign-sales-documents` | `codex/ui-redesign-invoice-detail` | `d8695721ce36b430f2b2f628ef5ea1de2539b230` |
| 5 | #150 | Redesign sales credit note workflows | `codex/ui-redesign-invoice-detail` | `codex/ui-redesign-credit-notes` | `0e32b9a7757bce161f5bb47e12621f4743827357` |
| 6 | #151 | Redesign sales customer payments and refunds | `codex/ui-redesign-credit-notes` | `codex/ui-redesign-customer-payments` | `9d62f39e74db635e3e8b1e6ba16f525cb0617d3a` |
| 7 | #152 | Redesign customer payment detail | `codex/ui-redesign-customer-payments` | `codex/ui-redesign-customer-payment-detail` | `0de73ef67cda555dba901d70431d73d1380627dd` |
| 8 | #153 | Migrate delivery note workflows to Ledger UI | `codex/ui-redesign-customer-payment-detail` | `codex/ui-redesign-delivery-notes` | `16f5b73bdc8c90666ccb25fb68416cfec2aed768` |
| 9 | #154 | Migrate recurring invoice workflows to Ledger UI | `codex/ui-redesign-delivery-notes` | `codex/ui-redesign-recurring-invoices` | `c634b2c5e3a96f4774ccbd2d953581752b8cad6b` |
| 10 | #155 | Migrate sales collections to Ledger UI | `codex/ui-redesign-recurring-invoices` | `codex/ui-redesign-collections` | `10ab0a6f9af75ceb8517df9a52349333c08b0add` |
| 11 | #156 | Migrate sales inventory returns to Ledger UI | `codex/ui-redesign-collections` | `codex/ui-redesign-inventory-returns` | `ab53f969edcdbd0dfee7073e178fcf1bf3e43add` |
| 12 | #157 | Migrate purchase document forms to Ledger UI | `codex/ui-redesign-inventory-returns` | `codex/ui-redesign-purchase-documents` | `a69cc3b03e25bedb596c79d6a6834a7110109b4a` |
| 13 | #158 | Migrate purchase document detail pages to Ledger UI | `codex/ui-redesign-purchase-documents` | `codex/ui-redesign-purchase-detail` | `8c1a77f3ec3094b76529ddc601a15c5b6ba9d52d` |
| 14 | #159 | Migrate supplier settlement workflows to Ledger UI | `codex/ui-redesign-purchase-detail` | `codex/ui-redesign-supplier-settlement` | `181a2b007f217409c290e82d0934337ed2b5a91d` |
| 15 | #160 | Migrate purchase order workflows to Ledger UI | `codex/ui-redesign-supplier-settlement` | `codex/ui-redesign-purchase-operations` | `8d05ebe5b348b550e6105a216441cfc35179b36d` |
| 16 | #161 | Migrate cash expense workflows to Ledger UI | `codex/ui-redesign-purchase-operations` | `codex/ui-redesign-purchase-cash-expenses` | `6c2cab984d442f62bc63e63b27f18b51b75c44ea` |
| 17 | #162 | Migrate purchase matching to Ledger UI | `codex/ui-redesign-purchase-cash-expenses` | `codex/ui-redesign-purchase-matching` | `61892e888054a429bef3f24a507292f3c8756f5a` |
| 18 | #163 | Migrate AP dashboard to Ledger UI | `codex/ui-redesign-purchase-matching` | `codex/ui-redesign-purchase-ap-dashboard` | `587e50fcf7297fb1ff4973145a9f2c12a422413d` |
| 19 | #164 | Migrate purchase returns to Ledger UI | `codex/ui-redesign-purchase-ap-dashboard` | `codex/ui-redesign-purchase-returns` | `c7f0926146b5318d5ecbd3a7e99c17432322348f` |
| 20 | #165 | Migrate bank account profile detail to Ledger UI | `codex/ui-redesign-purchase-returns` | `codex/ui-redesign-bank-account-detail` | `aa1acebd56b13a20428bbe56c32472c12ea636ec` |
| 21 | #166 | Migrate bank statement review routes to Ledger UI | `codex/ui-redesign-bank-account-detail` | `codex/ui-redesign-bank-statement-review` | `f41c423ee329edb09c239cff6421dd8f2a57974c` |
| 22 | #167 | Migrate bank payment instruments to Ledger UI | `codex/ui-redesign-bank-statement-review` | `codex/ui-redesign-bank-payment-instruments` | `355b6a0b8c510ab4ca22dcca0081bf1eee4be6d7` |
| 23 | #168 | Migrate bank reconciliation entry routes to Ledger UI | `codex/ui-redesign-bank-payment-instruments` | `codex/ui-redesign-bank-reconciliation-detail` | `55fa21e9ded500c0be73f6258e88b4408897ba1b` |
| 24 | #169 | Migrate banking detail close routes to Ledger UI | `codex/ui-redesign-bank-reconciliation-detail` | `codex/ui-redesign-bank-detail-close-routes` | `8b2cfff0394d05fd4fe9d7f0577339684cdeeacd` |
| 25 | #170 | Migrate inventory catalog warehouse routes to Ledger UI | `codex/ui-redesign-bank-detail-close-routes` | `codex/ui-redesign-inventory-catalog-warehouse` | `390504b712958c2be8241ca636e7676c771f3018` |
| 26 | #171 | Migrate inventory stock operations to Ledger UI | `codex/ui-redesign-inventory-catalog-warehouse` | `codex/ui-redesign-inventory-stock-operations` | `8cea192b083d4804e3e1d008e32faa39b5f67b9e` |
| 27 | #172 | Migrate inventory receipt and issue flows to Ledger UI | `codex/ui-redesign-inventory-stock-operations` | `codex/ui-redesign-inventory-receipt-issue-flows` | `2761bb0a7398d6013bcefb5a82057a7c5011f575` |
| 28 | #173 | Migrate inventory traceability flows to Ledger UI | `codex/ui-redesign-inventory-receipt-issue-flows` | `codex/ui-redesign-inventory-traceability-flows` | `9fa0c7b92d3c06fe58d291a871badbf99769fc60` |
| 29 | #174 | Migrate inventory valuation previews to Ledger UI | `codex/ui-redesign-inventory-traceability-flows` | `codex/ui-redesign-inventory-valuation-flows` | `23b127dc2044562a1b42f483df85c3ce3bb5f563` |
| 30 | #175 | Migrate inventory variance proposals to Ledger UI | `codex/ui-redesign-inventory-valuation-flows` | `codex/ui-redesign-inventory-variance-proposals` | `5f0f9b2b6d319bf5b58e33fa78a18367e1b03430` |
| 31 | #176 | Migrate inventory report surfaces to Ledger UI | `codex/ui-redesign-inventory-variance-proposals` | `codex/ui-redesign-inventory-reports-settings` | `a6fc2de0edbe8d78f5b9dfe9bf1ddd2b853a508c` |
| 32 | #177 | Migrate inventory clearing settings to Ledger UI | `codex/ui-redesign-inventory-reports-settings` | `codex/ui-redesign-inventory-clearing-settings` | `bb138838f717883ebb65df936c85e2d09b2c1526` |
| 33 | #178 | Migrate accounting admin workspaces to Ledger UI | `codex/ui-redesign-inventory-clearing-settings` | `codex/ui-redesign-accounting-admin-workspaces` | `3807bff6e4d2fa2d4e9ccc62d4e4741ac70ed19d` |
| 34 | #179 | Migrate report drilldowns to Ledger UI | `codex/ui-redesign-accounting-admin-workspaces` | `codex/ui-redesign-report-drilldowns` | `2235e684bde13230972fbde30526b9c791ec9117` |
| 35 | #180 | Migrate document settings to Ledger UI | `codex/ui-redesign-report-drilldowns` | `codex/ui-redesign-documents-storage-settings` | `136363a4378a3c8607345d4ebdb8f972829280cf` |
| 36 | #181 | Migrate storage readiness to Ledger UI | `codex/ui-redesign-documents-storage-settings` | `codex/ui-redesign-storage-readiness` | `fbbc5b561733b529658b38027521b0b48fa1847b` |
| 37 | #182 | Migrate settings admin routes to Ledger UI | `codex/ui-redesign-storage-readiness` | `codex/ui-redesign-settings-admin-subroutes` | `1ddf8fea2f295a3018b2ff8fb340671b5e8d4947` |
| 38 | #183 | Migrate audit logs settings to Ledger UI | `codex/ui-redesign-settings-admin-subroutes` | `codex/ui-redesign-settings-audit-logs` | `ed294ebf72d405ae9123791218604072ff53702a` |
| 39 | #184 | Migrate email outbox settings to Ledger UI | `codex/ui-redesign-settings-audit-logs` | `codex/ui-redesign-settings-email-outbox` | `a41154e427b4419ee6dc5faf056117804f14fe9d` |
| 40 | #185 | Migrate compliance and security settings to Ledger UI | `codex/ui-redesign-settings-email-outbox` | `codex/ui-redesign-settings-compliance-security` | `00b8365752a1dc8304d40b781961eecb438b4082` |
| 41 | #186 | Migrate ZATCA settings shell to Ledger UI | `codex/ui-redesign-settings-compliance-security` | `codex/ui-redesign-settings-zatca` | `28a963ad123bafd335feb365852ffad1aec70999` |
| 42 | #187 | Migrate setup onboarding to Ledger UI | `codex/ui-redesign-settings-zatca` | `codex/ui-redesign-setup-onboarding` | `ddae13ec4b87e4a74b5e9243b426cf7726c856b8` |
| 43 | #188 | Migrate dashboard revisit to Ledger UI | `codex/ui-redesign-setup-onboarding` | `codex/ui-redesign-dashboard-revisit` | `a093ae381d75d20f98ac36847ad694c2c517552e` |
| 44 | #189 | Migrate placeholder routes to Ledger UI | `codex/ui-redesign-dashboard-revisit` | `codex/ui-redesign-placeholder-routes` | `a7334ac5c95bb9ba950d369ef6ee2e43d71e42ec` |
| 45 | #190 | Migrate public auth to Ledger UI | `codex/ui-redesign-placeholder-routes` | `codex/ui-redesign-public-auth-polish` | `85775f56e0ac77d72b1ab11522bd96fef17401a3` |
| 46 | #191 | Migrate supporting panels to Ledger UI | `codex/ui-redesign-public-auth-polish` | `codex/ui-redesign-supporting-panels` | `658099f8ea8faa0755fdbaaea1d1deb42275c421` |
| 47 | #192 | Migrate shared contacts to Ledger UI | `codex/ui-redesign-supporting-panels` | `codex/ui-redesign-contacts-shared-detail` | `5704540efdb4cdabf9d53bd2a1cbf702ef78c800` |
| 48 | #193 | Bridge status messages to Ledger UI | `codex/ui-redesign-contacts-shared-detail` | `codex/ui-redesign-status-message-bridge` | `f647523e791ab8cf82f8af919b6562cc4bb7346c` |
| 49 | #194 | Migrate shared system panels to Ledger UI | `codex/ui-redesign-status-message-bridge` | `codex/ui-redesign-shared-system-panels` | `e67c5d8a478c096312fd2a6138906ec0232a3866` |
| 50 | #195 | Migrate traceability panels to Ledger UI | `codex/ui-redesign-shared-system-panels` | `codex/ui-redesign-traceability-panels` | `e2c720becd50d71b72481a1ab6b2fbc9d1c95448` |
| 51 | #196 | Migrate banking import and tax polish to Ledger UI | `codex/ui-redesign-traceability-panels` | `codex/ui-redesign-bank-transfer-import-tax-polish` | `b882c3aef440f8e55d60875cda4295ec96dbeab2` |
| 52 | #197 | Bridge settings status messages to Ledger UI | `codex/ui-redesign-bank-transfer-import-tax-polish` | `codex/ui-redesign-settings-status-bridge` | `3fc3b431aa9a729fb257f1a3328584e17e646ee4` |
| 53 | #198 | Polish shared textareas and backup panel with Ledger UI | `codex/ui-redesign-settings-status-bridge` | `codex/ui-redesign-shared-textarea-panel-polish` | `e069edcec36c37e3e19f9fb338036c4b2730735e` |
| 54 | #199 | Polish storage settings evidence fields with Ledger UI | `codex/ui-redesign-shared-textarea-panel-polish` | `codex/ui-redesign-storage-settings-polish` | `9070e16f8f1eb19e91854c7a1a6ae710bedbbcd2` |
| 55 | #200 | Polish form textareas with Ledger UI | `codex/ui-redesign-storage-settings-polish` | `codex/ui-redesign-form-textarea-polish` | `105fc13c769c8db3a42fe27a910c43daf75afc81` |
| 56 | #201 | Polish form tables with Ledger UI | `codex/ui-redesign-form-textarea-polish` | `codex/ui-redesign-form-table-polish` | `5079bb58c74e7f9d2c4b19e99edc8b36bcdf1ecb` |
| 57 | #202 | Polish remaining small panels with Ledger UI | `codex/ui-redesign-form-table-polish` | `codex/ui-redesign-small-panel-polish` | `0b00be4dd9f043244eba57b4ac6f46730a9a8cfb` |
| 58 | #203 | Polish email outbox settings with Ledger UI | `codex/ui-redesign-small-panel-polish` | `codex/ui-redesign-email-outbox-polish` | `38e1de74b30c931b4aaea55c1ff2a2e5ed66dbea` |
| 59 | #204 | Bridge ZATCA settings status messages to Ledger UI | `codex/ui-redesign-email-outbox-polish` | `codex/ui-redesign-zatca-status-bridge` | `062521480d70699e5de89f8763ddc681880d842f` |
| 60 | #205 | Polish ZATCA panels and tables with Ledger UI | `codex/ui-redesign-zatca-status-bridge` | `codex/ui-redesign-zatca-panel-table-polish` | `6aedbc9b8e208a724503c8b3fd06259955c43f6c` |
| 61 | #206 | Polish direct panels with Ledger UI | `codex/ui-redesign-zatca-panel-table-polish` | `codex/ui-redesign-direct-panel-polish` | `15415916105e3de8fb566930b7034b78beb37758` |
| 62 | #207 | Polish auth shell spacing | `codex/ui-redesign-direct-panel-polish` | `codex/ui-redesign-auth-polish` | `c85ad1149dada8dfe48c2c5389164ced8627904b` |
| 63 | #208 | Polish marketing surface styling | `codex/ui-redesign-auth-polish` | `codex/ui-redesign-marketing-polish` | `8185cfa29dc3a331ef61dab32659076850469cd7` |
| 64 | #209 | Polish secondary panel tokens | `codex/ui-redesign-marketing-polish` | `codex/ui-redesign-secondary-panel-token-polish` | `2d03b8788e7b53545825040bba4cbec7f26bc72d` |
| 65 | #210 | Polish final UI token pockets | `codex/ui-redesign-secondary-panel-token-polish` | `codex/ui-redesign-final-token-polish` | `581a1dfd9c527ab550979eefa26b0b290288f0fa` |

## Pre-Merge Safety Review

All 65 PRs are open, non-draft, and reported `MERGEABLE` during discovery. Each PR had successful `Non-mutating verification` and `GitGuardian Security Checks` status checks at discovery time.

Changed-path review found frontend, frontend tests, visual tests, and documentation only:

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/components/forms/**`
- `apps/web/src/components/ui/**`
- `tests/visual/**`
- `docs/**`

No changed paths were found under backend APIs, Prisma schema/migrations, Supabase configuration, deployment infrastructure, provider adapters, storage adapters, or server-side accounting/compliance engines. Sensitive-named frontend files in compliance, storage, ZATCA, banking, inventory, and accounting panels were inspected as presentation-layer component migrations and conservative wording preservation.

## Merge Procedure

For each PR, bottom-up from #146 to #210:

1. Re-check PR state, head SHA, draft state, mergeability, and required checks.
2. If the PR base is not `main`, retarget the PR to `main` only after its parent PR has merged into `main`.
3. If GitHub reports conflicts after retargeting, use a clean worktree for that PR branch, rebase onto `origin/main`, resolve only frontend/docs conflicts, run targeted verification, and push the rebased head.
4. Merge with a normal merge commit through GitHub.
5. Fetch `origin/main` and record the new merge commit SHA.
6. Continue only if the merged PR scope remains within the merge/stabilization boundary.

## Verification Plan

During the merge:

- Watch for failed status checks before merging each PR.
- Use targeted local verification only if retargeting/rebase creates conflicts or check drift.
- Preserve branch heads unless a rebase is required for conflict resolution.

After #210 is merged:

- Create fresh clean verification worktree: `E:\Worktrees\Accounting-App\ui-redesign-final-stack-main-verify`.
- Run dependency install if required: `corepack pnpm install --frozen-lockfile`.
- Run repo-available non-mutating verification, preferring `corepack pnpm verify:ci:local`.
- Run focused frontend checks available in the repo, including web tests/typecheck where feasible.
- Run or document skipped visual checks based on available local browser/runtime support.
- Run `git diff --check` and confirm the verification worktree remains clean except for known generated churn. If `apps/web/next-env.d.ts` is regenerated outside scope, restore it from `HEAD`.

## Documentation Plan

After final main verification, update or create:

- `docs/development/UI_REDESIGN_FULL_STACK_MERGE_PLAN.md`
- `docs/development/UI_REDESIGN_FULL_STACK_MERGE_RESULT.md`
- `docs/product/FRONTEND_REDESIGN_ROUTE_FAMILY_CHECKLIST.md`
- `docs/development/openbooks-adoption/FRONTEND_REDESIGN_EVIDENCE.md`
- `docs/product/LEDGERBYTE_FRONTEND_REDESIGN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/PROJECT_AUDIT.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`

The documentation update must report merged/skipped PRs, merge SHAs, verification commands/results, visual checks run or skipped, preserved boundaries, known remaining frontend gaps, and the recommended next goal `UI-REBUILD-STABILIZE-01`.
