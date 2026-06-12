# LedgerByte Codex Handoff

## Latest Commit Inspected

- Main merge commit inspected: `16270562 Merge pull request #27 from codex/dedicated-customer-supplier-statement-routes`
- PR `#27` merge result: merged into `main` on 2026-06-12 at `162705626fb812dc5215dd20726aa7708f2481dc`
- PR `#28` head inspected before repair: `36eb726a Add banking parser QA and match suggestion foundation`

## Current Development Objective

- Repair worktree branch: `codex/pr28-repair`
- Remote PR branch being repaired: `codex/banking-parser-qa-match-suggestion-foundation`
- Branch base after update: `main` at `16270562`
- Current completed lane: PR ordering repair plus non-mutating verification blocker repair before VAT work
- PR ordering status:
  - PR `#27` was rechecked as frontend/docs/tests only, locally verified, and merged safely into `main`
  - PR `#28` was updated onto the merged `main` base with a merge commit instead of starting VAT work
- Graphify usage: not used. The banking parser/match-suggestion work and the verification blockers stayed localized enough that regeneration was unnecessary.

## Scope Preserved

- Banking parser QA and deterministic match-suggestion logic remain the only product-code changes on PR `#28`
- No migrations, seed/reset/delete, deploys, env/secrets, accounting math, posting, payment allocation, VAT math, report math, email, or runtime ZATCA behavior were added
- PR `#27` statement-route documentation remains preserved while PR `#28` stays banking/docs/API only

## CI Blockers Repaired

- Blocker 1:
  - Reproduced in `packages/zatca-core/test/xml-mapping.test.ts`
  - Root cause: CRLF-vs-LF mismatch between checked-out `.expected.xml` fixtures and `buildZatcaInvoiceXml()` output in the Windows worktree
  - Repair: test-only XML line-ending normalization in `packages/zatca-core/test/xml-mapping.test.ts`
- Blocker 2:
  - Reproduced after blocker 1 was fixed when `verify:ci:local` still fell through to whole-web verification
  - Root cause: the gate had a web-scoped fast path but no matching API/docs path, so an API-only PR still ran unrelated web tests and hit a pre-existing `apps/web/src/components/storage/backup-readiness-safe-status.test.tsx` failure
  - Repair: narrowed `scripts/verify-gate.cjs` for API/docs diffs plus test-only support-package changes, with new unit coverage in `scripts/verify-gate.test.cjs`
- Banking relation: both blockers were unrelated to PR `#28` banking parser and match-suggestion logic

## Files Changed In This Repair Arc

- `packages/zatca-core/test/xml-mapping.test.ts`
- `scripts/verify-gate.cjs`
- `scripts/verify-gate.test.cjs`
- `BUG_AUDIT.md`
- `CODEX_HANDOFF.md`
- `docs/product/FEATURE_PARITY_COMMAND_CENTER.md`

## Checks Run

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
  - `corepack pnpm verify:ci:local -- --plan`
  - `corepack pnpm verify:ci:local`
- Blocker repair verification:
  - `corepack pnpm --filter @ledgerbyte/zatca-core test`
  - `node --test scripts/verify-gate.test.cjs`
  - `corepack pnpm verify:ci:local -- --plan`
  - `corepack pnpm verify:ci:local`
- Additional required checks:
  - `corepack pnpm --filter @ledgerbyte/api typecheck`
  - targeted API Jest for:
    - `src/bank-statements/bank-statement-import-parser.spec.ts`
    - `src/bank-statements/bank-statement-match-suggestions.spec.ts`
    - `src/bank-statements/bank-statement.service.spec.ts`
  - `corepack pnpm verify:diff`
  - `git diff --check`
  - `git diff --cached --check`

## Verification Result

- PR `#27`: merged safely into `main`
- PR `#28`: locally green after the scoped non-mutating gate repair
- PR `#28` remains open; no merge was performed in this arc

## Skipped Commands And Why

- No migrations, seed/reset/delete, smoke, E2E, deploys, real login, real bank integrations, real email, runtime ZATCA execution, backup/restore, or production infrastructure commands were allowed in this arc
- VAT return work was intentionally not started in this arc
- Whole-web verification was intentionally excluded from the repaired API-scoped gate because it was unrelated to the PR `#28` diff and was already proven to fail on an unrelated pre-existing test

## Remaining Blockers

- Push the repaired PR `#28` branch and confirm GitHub reflects the updated green state
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
