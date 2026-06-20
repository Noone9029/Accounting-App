# OpenBooks Adoption Post-Merge Baseline Audit

Date: 2026-06-20

Final merged `main` SHA: `a8ebc9e6d039c52675135fa77bc1eb838c00a70d`

## Status

PR #89 through PR #95 have been merged into `main` in order. The OpenBooks clean-room adoption planning and frontend metadata/helper stack is now part of the LedgerByte main baseline.

This audit is documentation only. It does not add runtime behavior, API modules, Prisma migrations, UI features, provider behavior, storage behavior, hosted behavior, or production compliance claims.

## Merged PR Stack

| PR | Title | Merge commit |
| --- | --- | --- |
| #89 | Document OpenBooks clean-room adoption plan | `7ad5f715fe9b89d888251944a0cfb575df831cb4` |
| #90 | Add LedgerByte app shell route registry | `89f4b274099fc303068073f6dd28b4547a8204c1` |
| #91 | Use app route registry for setup onboarding navigation | `54d9482ada970b1325bb3b5e8ed4b20a81154798` |
| #92 | Refine setup progress metadata | `f9d15382878ef1f1abaa190f59255c0b0e031572` |
| #93 | Add typed onboarding profile metadata | `2b3ce7e15459f96a14e1c28fa61d7dab44f3d694` |
| #94 | Render setup checklist templates from typed onboarding metadata | `a159c72a4cfc96452175a6b66e3a7a5380f9695a` |
| #95 | Add typed onboarding profile selector defaults | `a8ebc9e6d039c52675135fa77bc1eb838c00a70d` |

## Baseline Summary

The merged baseline now includes:

- Clean-room adoption plan, legal/policy guardrails, evidence template, and validator.
- LedgerByte-native app shell route registry for frontend route metadata.
- Setup/onboarding route registry consumers.
- Setup progress metadata helpers.
- Typed onboarding profile metadata and checklist template helpers.
- Setup checklist template preview UI consumption.
- Typed onboarding selector/default helpers.

The merged baseline remains frontend/shared metadata and documentation oriented. It does not implement a full typed onboarding backend or any future Inbox, AI, report-pack, integration-health, provider, storage, or compliance runtime.

## Files And Features Now Present

Clean-room adoption documentation and validator:

- `docs/development/openbooks-adoption/APP_SHELL_ROUTE_REGISTRY_EVIDENCE.md`
- `docs/development/openbooks-adoption/SETUP_ONBOARDING_ROUTE_REGISTRY_CONSUMERS_EVIDENCE.md`
- `docs/development/openbooks-adoption/SETUP_PROGRESS_METADATA_REFINEMENTS_EVIDENCE.md`
- `docs/development/openbooks-adoption/TYPED_ONBOARDING_PROFILE_METADATA_EVIDENCE.md`
- `docs/development/openbooks-adoption/SETUP_CHECKLIST_TEMPLATE_UI_CONSUMPTION_EVIDENCE.md`
- `docs/development/openbooks-adoption/TYPED_ONBOARDING_PROFILE_SELECTOR_DEFAULTS_EVIDENCE.md`
- `scripts/openbooks-clean-room-validate.cjs`

Frontend/shared metadata and helper files:

- `apps/web/src/lib/app-routes.ts`
- `apps/web/src/lib/app-routes.test.ts`
- `apps/web/src/lib/sidebar-nav.ts`
- `apps/web/src/lib/setup-onboarding-routes.ts`
- `apps/web/src/lib/setup-onboarding-routes.test.ts`
- `apps/web/src/lib/setup-progress.ts`
- `apps/web/src/lib/setup-progress.test.ts`
- `apps/web/src/lib/typed-onboarding.ts`
- `apps/web/src/lib/typed-onboarding.test.ts`
- `apps/web/src/lib/typed-onboarding-selector.ts`
- `apps/web/src/lib/typed-onboarding-selector.test.ts`
- `apps/web/src/components/onboarding/typed-onboarding-checklist-preview.tsx`
- `apps/web/src/components/onboarding/typed-onboarding-preview.test.tsx`
- `apps/web/src/components/onboarding/setup-wizard.tsx`
- `apps/web/src/components/onboarding/setup-wizard.test.tsx`

## Checks Run On Main

Post-merge verification was run from clean detached worktree:

`E:\Worktrees\Accounting-App\openbooks-stack-verify-main`

Passed:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-selector typed-onboarding-preview setup-wizard typed-onboarding setup-progress setup-onboarding-routes app-routes sidebar route-load-verification`
  - 9 suites / 55 tests passed
- `corepack pnpm verify:ci:local`
  - included `git diff --check`
  - included web typecheck
  - included typed onboarding selector path test
  - included web production build
- final `git diff --check`

`verify:ci:local` generated the known `apps/web/next-env.d.ts` build churn. The generated change was restored in the isolated verification worktree.

## Checks Skipped

Full monorepo exhaustive tests and browser/E2E were skipped because Goal 8 was a stack merge and stabilization pass for a frontend metadata/helper and documentation stack. The focused web suite plus `verify:ci:local` covered the merged route/setup/typed-onboarding surfaces and the local CI mirror.

## Adoption Status Table

| Area | Status | Evidence |
| --- | --- | --- |
| Clean-room adoption plan and validator | WORKING | Package and strict clean-room validators passed on merged `main`. |
| App shell route registry | WORKING | Focused `app-routes`, `sidebar`, and `route-load-verification` tests passed on merged `main`. |
| Setup/onboarding route registry consumers | WORKING | Focused `setup-onboarding-routes` and setup wizard coverage passed on merged `main`. |
| Setup progress metadata | WORKING | Focused `setup-progress` coverage passed on merged `main`. |
| Typed onboarding profile metadata | WORKING | Focused `typed-onboarding` coverage passed on merged `main`. |
| Setup checklist template UI consumption | WORKING | Focused `typed-onboarding-preview` and `setup-wizard` coverage passed on merged `main`. |
| Typed onboarding selector/defaults | WORKING | Focused `typed-onboarding-selector` coverage and `verify:ci:local` selector path test passed on merged `main`. |
| Full typed onboarding backend | PLANNED | No persistence, API, Prisma migration, or backend state machine exists for this slice. |
| Persistent setup checklist state | PLANNED | Setup checklist state remains non-persistent. |
| Exception Inbox | PLANNED | No Inbox runtime was added. |
| Deterministic bookkeeping pipeline | PLANNED | No deterministic pipeline runtime was added. |
| AI proposal boundary | PLANNED | No AI proposal runtime or boundary implementation was added. |
| Report pack | PLANNED | No report-pack runtime was added. |
| Integration health/degraded mode runtime | PLANNED | No integration-health runtime was added. |
| Document/receipt review through Inbox | PLANNED | No document-review runtime was added. |
| Generated-document object storage | BLOCKED | Approval remains blocked; runtime generated documents remain database-backed. |
| Signed URLs | BLOCKED | Signed URLs remain unimplemented and unproven. |
| UAE/ZATCA/Peppol/ASP production readiness | BLOCKED | Production readiness remains blocked unless separately proven and approved. |

## Working

- Clean-room validator and policy guardrails are present on `main`.
- Route registry and sidebar/mobile helper consumption are present and test-covered.
- Setup/onboarding route helpers are present and test-covered.
- Setup progress metadata is centralized and test-covered.
- Typed onboarding profile/checklist metadata is present and test-covered.
- Setup checklist preview consumption and selector/default behavior are present and test-covered.

## Partial

- Setup and typed onboarding are frontend/shared metadata and preview surfaces only.
- The setup checklist preview is non-persistent and does not represent a durable onboarding state.
- Planned and blocked items are visible as metadata but remain non-actionable.

## Planned

- Full typed onboarding backend.
- Persistent setup checklist state.
- Exception Inbox.
- Deterministic bookkeeping pipeline.
- AI proposal boundary.
- Report pack.
- Integration health/degraded mode runtime.
- Document/receipt review through Inbox.

## Blocked

- Generated-document object storage approval remains `BLOCKED`.
- Real object storage remains unimplemented and unproven.
- Signed URLs remain unimplemented and unproven.
- UAE/ZATCA/Peppol/ASP production readiness remains blocked unless separately proven and approved.

## Non-Goals Preserved

- No OpenBooks code was copied.
- No OpenBooks implementation details were imported.
- No OpenBooks references were added to production source.
- No backend typed onboarding persistence was implemented.
- No persistent setup checklist state was added.
- No Prisma migrations were added for onboarding.
- No API modules were added for onboarding, Inbox, AI, report packs, integration health, or document review.
- No provider, storage, hosted, compliance, ZATCA, UAE, Peppol, ASP, signed URL, or Supabase behavior changed.
- No production compliance readiness was claimed.

## Compliance, Storage, And Provider Blockers

- Generated-document object storage approval remains `BLOCKED`.
- Runtime generated documents remain database-backed unless separately changed.
- Real object storage remains unimplemented and unproven.
- Signed URLs remain unimplemented and unproven.
- UAE/ZATCA/Peppol/ASP/provider production readiness remains blocked unless separately proven and approved.

## Next Recommended Feature Sequence

1. Goal 10: Archetype-aware setup guidance copy. Frontend-only and non-persistent.
2. Goal 11: Typed onboarding persistence design only. Docs/API/schema design only, no migration.
3. Goal 12: Setup checklist persistence implementation behind local/test-safe API, only after design approval.
4. Goal 13: Exception Inbox design plan. Docs/API/schema design only.
5. Goal 14: Inbox DB/API foundation. No AI yet.
6. Goal 15: Inbox UI and audit-safe actions. No AI yet.
7. Goal 16: Deterministic bookkeeping pipeline design. Docs/service design only.
8. Goal 17: AI proposal boundary design. Docs/security/threat model only.

Provider, storage, and compliance work stays separate from this sequence.
