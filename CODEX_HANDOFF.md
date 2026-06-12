# LedgerByte Codex Handoff

## Latest Commit Inspected

- Main merge commit inspected: `16270562 Merge pull request #27 from codex/dedicated-customer-supplier-statement-routes`
- PR `#27` merge result: merged into `main` on 2026-06-12 at `162705626fb812dc5215dd20726aa7708f2481dc`
- PR `#28` head inspected before repair: `36eb726a Add banking parser QA and match suggestion foundation`

## Current Development Objective

- Repair worktree branch: `codex/pr28-repair`
- Remote PR branch being repaired: `codex/banking-parser-qa-match-suggestion-foundation`
- Branch base after update target: `main` at `16270562`
- Current objective: resolve the PR `#28` non-mutating verification blocker without widening banking scope, then leave the PR updated onto latest `main`
- PR ordering status:
  - PR `#27` was verified as frontend/docs/tests only, then merged safely into `main`
  - PR `#28` started from the old `main` base `b0f312fc` and is being updated after the PR `#27` merge
- Graphify usage: not used. The banking parser/match-suggestion work and the verification blocker stayed localized enough that regeneration was unnecessary.

## Scope Preserved

- Banking parser QA and deterministic match-suggestion logic remain the only product-code changes on PR `#28`
- No migrations, seed/reset/delete, deploys, env/secrets, accounting math, posting, payment allocation, VAT math, report math, email, or runtime ZATCA behavior were added
- PR `#27` statement-route documentation remains preserved while PR `#28` stays banking/docs/API only

## CI Blocker

- Reproduced failure command: `corepack pnpm verify:ci:local`
- Failing area: `packages/zatca-core/test/xml-mapping.test.ts`
- Root cause: platform-specific CRLF-vs-LF mismatch between checked-out `.expected.xml` fixtures and `buildZatcaInvoiceXml()` output inside the Windows worktree
- Banking relation: unrelated to PR `#28` banking parser and match-suggestion logic

## Exact Repair

- Added test-only XML line-ending normalization in `packages/zatca-core/test/xml-mapping.test.ts`
- Kept strict fixture equality on XML content and ordering after newline normalization
- Preserved the merged PR `#27` dedicated statement-route record in `BUG_AUDIT.md`, `CODEX_HANDOFF.md`, and `docs/product/FEATURE_PARITY_COMMAND_CENTER.md`

## Files Changed In This Repair Arc

- `packages/zatca-core/test/xml-mapping.test.ts`
- `BUG_AUDIT.md`
- `CODEX_HANDOFF.md`
- `docs/product/FEATURE_PARITY_COMMAND_CENTER.md`

## Checks Run So Far

- Repository state:
  - `git status --short`
  - `git branch --show-current`
  - `git log -1 --oneline`
  - `git fetch origin --prune`
- PR inspection:
  - GitHub PR/status inspection for PR `#27` and PR `#28`
  - commit-status inspection for heads `6c658b6b7a1dbdf433f21179d212183863653d08` and `36eb726aba6317ad5ad65a9d2ae602576b658039`
- PR `#27` local verification:
  - `corepack pnpm install --frozen-lockfile`
  - `corepack pnpm --filter @ledgerbyte/web typecheck`
  - targeted web Jest for the touched statement-route files
  - `corepack pnpm verify:diff`
  - `git diff --check`
- PR `#27` merge:
  - merged into `main` with merge commit `162705626fb812dc5215dd20726aa7708f2481dc`
- PR `#28` blocker reproduction:
  - `corepack pnpm install --frozen-lockfile`
  - `corepack pnpm verify:ci:local -- --plan`
  - `corepack pnpm verify:ci:local`
- Targeted blocker verification:
  - `corepack pnpm --filter @ledgerbyte/zatca-core test`

## Pending Before Closure

- Finish resolving the PR `#28` merge onto latest `main`
- Run the post-merge full verification pass:
  - targeted `@ledgerbyte/zatca-core` test
  - `corepack pnpm verify:ci:local -- --plan`
  - `corepack pnpm verify:ci:local`
  - targeted banking API tests
  - `corepack pnpm --filter @ledgerbyte/api typecheck`
  - `corepack pnpm verify:diff`
  - `git diff --check`
  - `git diff --cached --check` if staged

## Skipped Commands And Why

- No migrations, seed/reset/delete, smoke, E2E, deploys, real login, real bank integrations, real email, runtime ZATCA execution, backup/restore, or production infrastructure commands were allowed in this arc
- VAT return work was intentionally not started in this arc

## Remaining Blockers

- PR `#28` still needs its post-merge full verification pass and push after the docs merge is finalized
- Live bank feeds, certified bank-specific parser coverage, raw-file archive execution, FX/transfer-fee handling, hosted/customer-data proof, broader banking E2E/smoke/full-test coverage, and accountant sign-off remain out of scope and unresolved
- Existing unrelated dirty files remain outside this arc in the original checkout and must stay unstaged there: `apps/api/scripts/smoke-accounting.ts`, `apps/web/src/app/(app)/settings/zatca/page.tsx`, `.codex-logs/`, and `AGENTS.md`

## Product Posture

- LedgerByte remains controlled beta/user-testing only
- LedgerByte is not production-ready
- LedgerByte is not official VAT filing ready
- LedgerByte is not ZATCA compliant
- Production/ZATCA/customer-data behavior changed: no

## Exact Next Recommended Prompt Title

`VAT return truthfulness and filing-export foundation`
