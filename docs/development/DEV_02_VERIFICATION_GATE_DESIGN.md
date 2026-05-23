# DEV-02 Verification Gate Design

Status: Part 2 design completed on 2026-05-23.
Source state inspected: `a647ff4 Inventory DEV-02 verification gates`.

## Purpose And Scope

DEV-02 Part 2 designs the LedgerByte verification gate structure before any script, CI, workflow, or app behavior changes. It uses the DEV-02 Part 1 inventory, DEV-01 final triage, current package scripts, Playwright configs, smoke scripts, and existing CI workflow as source material.

This design does not run full tests, full builds, full E2E, smoke scripts, migrations, seed/reset/delete commands, deploys, environment changes, ZATCA, email, backup/restore, production-hosting research, login, or audit-log-writing flows. Production hosting remains paused. AWS remains a future production direction only. Vercel remains beta/user-testing/staging only.

## Gate Principles

- Non-destructive by default: default gates must not change database rows, send email, call ZATCA, write backups/restores, mutate roles/settings, or create accounting records.
- No production target by default: no gate should point at production URLs, production databases, production storage, production email, or production ZATCA services.
- No login/audit-writing flows unless explicitly approved: authenticated browser and E2E gates remain manual until an audit-log and fixture policy exists.
- No migrations or seed/reset/delete in default gates: `db:migrate`, `db:seed`, demo seeding, reset, cleanup, and destructive scripts stay outside default local and PR gates.
- Targeted checks before broad checks: small changes should run the narrowest affected typecheck/test first, then broader gates before push or CI.
- Clear separation: local, PR/CI, nightly/manual, and future release-readiness gates must have different service assumptions and mutation policies.
- Readiness is not route proof: API `/health` and `/readiness` prove service reachability only, not browser route behavior or business workflow correctness.
- Staging is not production: deployed beta/user-testing checks must remain manual/non-production and cannot be promoted to production validation.

## Proposed Gate Tiers

| Tier | Name | Default role |
| --- | --- | --- |
| Tier 0 | Diff and docs safety checks | Always run around docs/code changes and before staging. |
| Tier 1 | Fast local developer gate | Fast targeted checks for the changed workspace/package. |
| Tier 2 | Pre-push or PR candidate gate | Broad non-mutating repo checks before pushing meaningful changes. |
| Tier 3 | CI pull request gate | Automatic non-mutating PR checks once CI is added later. |
| Tier 4 | Manual/nightly deeper QA gate | Visual, disposable local runtime, smoke, and E2E checks with explicit target policy. |
| Tier 5 | Release-readiness gate, future only | Future non-production release gate after environment and mutation policies exist. |

## Tier 0: Diff And Docs Safety Checks

Exact proposed commands:

```powershell
git status --short
git diff --check
git diff --cached --check
```

| Field | Design |
| --- | --- |
| Runtime/cost | Fast. |
| Required services | None. |
| Mutation risk | None. |
| When to run | At the start of work for state awareness, before staging, and after staging. |
| Pass/fail expectation | Any whitespace/conflict-marker failure blocks commit until fixed. Dirty unrelated files must stay unstaged. |
| Explicitly excluded | Tests, builds, E2E, smoke, migrations, seed/reset/delete, deploys, env changes, login, ZATCA, email, backup/restore. |

## Tier 1: Fast Local Developer Gate

Exact proposed command pattern:

```powershell
git diff --check
corepack pnpm --filter @ledgerbyte/web typecheck
corepack pnpm --filter @ledgerbyte/web test -- <changed-area-pattern>
corepack pnpm --filter @ledgerbyte/api typecheck
corepack pnpm --filter @ledgerbyte/api test -- <changed-area-pattern>
corepack pnpm --filter @ledgerbyte/zatca-core test
node --test scripts/test-credential-env.test.cjs
corepack pnpm test:user-testing-cleanup-plan
```

Use only the commands matching the files changed. Examples:

- Web route/component change: `corepack pnpm --filter @ledgerbyte/web typecheck` plus a targeted web Jest pattern.
- API service/controller change: `corepack pnpm --filter @ledgerbyte/api typecheck` plus a targeted API Jest pattern.
- ZATCA package change without real network scope: `corepack pnpm --filter @ledgerbyte/zatca-core test`.
- E2E credential-guard script change: `node --test scripts/test-credential-env.test.cjs`.
- Cleanup-plan script change: `corepack pnpm test:user-testing-cleanup-plan`.

| Field | Design |
| --- | --- |
| Runtime/cost | Fast to medium, depending on targeted test breadth. |
| Required services | None. |
| Mutation risk | None expected; Jest/package tests should use mocks or local files only. |
| When to run | During development after a focused change, before broad gates. |
| Pass/fail expectation | Targeted typecheck/test failures block commit unless the change is intentionally docs-only and the test is unrelated. |
| Explicitly excluded | Full E2E, smoke scripts, visual snapshot updates, local login, migrations, seed/reset/delete, deployed checks, report/PDF downloads, real ZATCA/email/storage/backup actions. |

## Tier 2: Pre-Push Or PR Candidate Gate

Exact proposed commands:

```powershell
git diff --check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
git diff --cached --check
```

| Field | Design |
| --- | --- |
| Runtime/cost | Medium. |
| Required services | None expected. |
| Mutation risk | No app data mutation. Build commands may create ignored local build artifacts. |
| When to run | Before pushing product code, shared package changes, API changes, or verification script changes. |
| Pass/fail expectation | Any typecheck, unit/component/package test, or build failure blocks push unless explicitly documented as an unrelated pre-existing failure. |
| Explicitly excluded | `db:migrate`, `db:seed`, `demo:seed-workflows`, all smoke scripts, `corepack pnpm e2e`, deployed E2E, visual snapshot updates, login-heavy browser QA, ZATCA SDK/CSR/signing commands, real email, backup/restore, deploys. |

Notes:

- `corepack pnpm test` currently includes real API/web/ZATCA tests plus placeholder package tests for packages whose coverage lives elsewhere.
- `corepack pnpm build` is useful before PR, but should not become a mandatory edit-loop check for tiny docs-only changes.
- `corepack pnpm db:generate` should be added to a future Prisma/schema-specific gate only when Prisma client/schema files change.

## Tier 3: CI Pull Request Gate

Exact proposed commands for a future PR workflow:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
git diff --check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
node --test scripts/test-credential-env.test.cjs
corepack pnpm test:user-testing-cleanup-plan
```

| Field | Design |
| --- | --- |
| Runtime/cost | Medium. |
| Required services | None. |
| Mutation risk | None for app data. |
| When to run | On pull request and possibly push to protected branches after CI workflow work is approved. |
| Pass/fail expectation | PR is blocked on install, typecheck, test, build, or safety-harness failure. |
| Explicitly excluded | Playwright E2E, deployed beta E2E, smoke scripts, service containers, migrations, seeding, login, production URLs, Vercel/Supabase setting changes, ZATCA/email/backup/restore. |

CI design notes:

- The current only workflow is `.github/workflows/deployed-e2e.yml`, which is manual dispatch and beta/user-testing oriented. It should stay separate.
- PR CI should start with non-mutating checks only. Service containers and E2E should be designed later after disposable database and credential policy exists.
- Visual regression can be considered after browser dependencies and snapshot stability are proven, but it should not be the first PR gate.

## Tier 4: Manual/Nightly Deeper QA Gate

Exact proposed commands:

```powershell
corepack pnpm test:visual
Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest -Uri http://localhost:4000/readiness -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing -TimeoutSec 10
Invoke-WebRequest -Uri http://localhost:3000/dashboard -UseBasicParsing -TimeoutSec 10
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS = "false"
corepack pnpm e2e
Remove-Item Env:LEDGERBYTE_E2E_SEED_WORKFLOWS
corepack pnpm smoke:accounting:ar
corepack pnpm smoke:accounting:ap
corepack pnpm smoke:accounting:documents
corepack pnpm smoke:accounting:reports
corepack pnpm smoke:accounting:zatca-safe
```

| Field | Design |
| --- | --- |
| Runtime/cost | Medium to slow. |
| Required services | Visual: web only through Playwright web server. Health shell checks: API, web, Docker DB/Redis if readiness is expected. E2E/smoke: API, web, Docker DB/Redis, approved credentials, and disposable data. |
| Mutation risk | `test:visual` should not mutate app data. E2E and smoke are mutating or login/audit-writing unless explicitly configured and approved. |
| When to run | Manual/nightly only after explicit target policy, fixture policy, and data-mutation approval. |
| Pass/fail expectation | Failures become blocker triage items; do not claim full browser QA if Browser URL policy or login/audit boundary still blocks the run. |
| Explicitly excluded | Production targets, production data, destructive cleanup, migrations on shared DBs, seed/reset/delete outside disposable local/test DBs, real ZATCA, real email, backup/restore, report/PDF download checks unless the manual run explicitly includes output QA. |

Tier 4 policy:

- Prefer `corepack pnpm test:visual` as the first deeper UI check because it uses mocked visual fixtures and starts only local web.
- Use local API/web health checks as readiness proof only when services are already approved and running.
- Keep E2E and smoke out of default gates until login audit writes, workflow seeding, output generation, and test data cleanup are explicitly handled.
- Prefer smaller smoke slices over `corepack pnpm smoke:accounting` when diagnosing one area.

## Tier 5: Release-Readiness Gate, Future Only

Exact candidate commands, not active defaults:

```bash
node scripts/check-deployed-e2e-env.cjs
LEDGERBYTE_E2E_SEED_WORKFLOWS=false corepack pnpm e2e
corepack pnpm smoke:accounting:ar
corepack pnpm smoke:accounting:ap
corepack pnpm smoke:accounting:documents
corepack pnpm smoke:accounting:reports
corepack pnpm smoke:accounting:zatca-safe
```

| Field | Design |
| --- | --- |
| Runtime/cost | Slow. |
| Required services | Approved deployed beta/user-testing or future staging web/API/DB, plus approved credentials and explicit data policy. |
| Mutation risk | Medium to high: E2E login writes audit logs; smoke creates/updates/voids/downloads/exports test records depending on phase. |
| When to run | Future release-readiness only after non-production target, cleanup, retention, and data boundaries are approved. |
| Pass/fail expectation | A failed release gate blocks release candidate promotion; a passed beta/user-testing gate does not prove production readiness. |
| Explicitly excluded | Production E2E, production smoke, production deploys, provider setting changes, migrations, seed/reset/delete, real ZATCA, real customer email, backup/restore execution, customer-data mutation. |

Tier 5 remains design-only until a later ticket approves a dedicated non-production release target and fixtures.

## Recommended Default Local Gate

Default local gate for ordinary app/script changes:

```powershell
git diff --check
corepack pnpm --filter <changed-workspace> typecheck
corepack pnpm --filter <changed-workspace> test -- <changed-area-pattern>
```

If the change crosses package boundaries or touches shared contracts:

```powershell
corepack pnpm typecheck
corepack pnpm test
```

For docs-only changes:

```powershell
git diff --check
```

Run `git diff --cached --check` after staging.

## Recommended PR/CI Gate

Recommended first automatic PR/CI gate:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
git diff --check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
node --test scripts/test-credential-env.test.cjs
corepack pnpm test:user-testing-cleanup-plan
```

This gate is intentionally non-mutating and does not need Docker, API, web, deployed beta, credentials, ZATCA SDK, SMTP, or storage configuration.

## Recommended Manual/Nightly Gate

Recommended first manual/nightly gate:

```powershell
corepack pnpm test:visual
Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest -Uri http://localhost:4000/readiness -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest -Uri http://localhost:3000/login -UseBasicParsing -TimeoutSec 10
Invoke-WebRequest -Uri http://localhost:3000/dashboard -UseBasicParsing -TimeoutSec 10
```

Only after explicit disposable-data approval, add:

```powershell
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS = "false"
corepack pnpm e2e
Remove-Item Env:LEDGERBYTE_E2E_SEED_WORKFLOWS
corepack pnpm smoke:accounting:ar
corepack pnpm smoke:accounting:ap
corepack pnpm smoke:accounting:documents
corepack pnpm smoke:accounting:reports
corepack pnpm smoke:accounting:zatca-safe
```

## How DEV-01 Blockers Affect DEV-02

- Browser Use URL policy blocker: local route visits through the in-app Browser remain blocked, so default gates cannot claim browser-runtime pass. Shell HTTP checks and code review remain evidence types, not full browser QA.
- Login/audit-writing blocker: E2E and authenticated browser flows write audit/security records through login, so they remain manual until a fixture and audit policy exists.
- Mutation/state-machine QA deferred: finalize, void, allocate, reverse, approve, close, post, reconcile, transfer, and settings/admin mutations cannot be default gates.
- Exports/downloads/PDF generation deferred: output-producing checks need explicit artifact handling, data policy, and non-production target approval.
- Real ZATCA/email/storage/backup deferred: default gates must keep real ZATCA network calls, real email sends, object-storage migration, backup execution, and restore execution out of scope.

## Proposed Implementation Plan For DEV-02 Part 3

Scripts to add or update:

- Add a root package script such as `verify:local` that runs the non-mutating default local gate wrapper.
- Add a root package script such as `verify:pr` that runs `typecheck`, `test`, `build`, `node --test scripts/test-credential-env.test.cjs`, and `test:user-testing-cleanup-plan`.
- Consider a small `scripts/verify-gate.cjs` helper to print the tier, commands, exclusions, and skipped manual-only checks before executing safe commands.
- Consider adding `test:credential-env` as a root package script around `node --test scripts/test-credential-env.test.cjs`.
- Do not wire smoke, E2E, migrations, seed/reset/delete, deploy, ZATCA, email, or backup/restore into default scripts.

Docs to update:

- Update this design doc with implemented script names.
- Update `docs/development/DEV_02_VERIFICATION_GATE_INVENTORY.md` if command names change.
- Update `CODEX_HANDOFF.md` with implemented gate names and remaining manual-only commands.
- Consider a compact README testing section after the scripts exist, without changing production docs.

CI changes to consider later:

- Add a new PR workflow only after Part 3 scripts are implemented and pass locally.
- Keep `.github/workflows/deployed-e2e.yml` manual dispatch only.
- Consider visual regression in CI after snapshot stability is verified.
- Defer service-container E2E and smoke CI until disposable database, login/audit, and cleanup policy exists.

Tests to run after implementation:

- `git diff --check`
- `node --test scripts/verify-gate.test.cjs` if a helper test is added.
- `corepack pnpm verify:local` if the script is added.
- `corepack pnpm verify:pr` or the exact command chain if the script is not added yet.
- `git diff --cached --check` after staging.

## Part 3 Implementation Note

DEV-02 Part 3 added [DEV_02_VERIFICATION_GATE_RUNBOOK.md](DEV_02_VERIFICATION_GATE_RUNBOOK.md), `scripts/verify-gate.cjs`, `scripts/verify-gate.test.cjs`, and root package scripts for `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`.

The implemented runner prints command plans before execution, supports `--plan`/`--dry-run`, supports optional targeted web/API Jest args, and rejects default-gate args that point at smoke, E2E, migrations, seed/reset/delete, deploys, ZATCA, email, backup/restore, login, or URLs. GitHub workflow wiring remains deferred to a later ticket.

## Part 4 Documentation And CI Proposal Note

DEV-02 Part 4 wired README and the runbook to the implemented verification gates and created [DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md](DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md). The proposal describes a future non-mutating PR workflow that runs `verify:diff` and `verify:ci:local`, but no GitHub workflow file is implemented yet.

See [DEV_02_VERIFICATION_GATE_RUNBOOK.md](DEV_02_VERIFICATION_GATE_RUNBOOK.md) for local usage and [DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md](DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md) for the proposed YAML.

## Part 5 Implementation Note

DEV-02 Part 5 implemented the non-mutating PR workflow at [../../.github/workflows/pr-verification.yml](../../.github/workflows/pr-verification.yml). The workflow runs `corepack pnpm verify:diff` and `corepack pnpm verify:ci:local` after a frozen-lockfile install, and it keeps deployed E2E, smoke, migrations, seed/reset/delete, deploys, ZATCA, email, backup/restore, production URLs, and login/audit-writing flows out of PR CI.

## Commands That Remain Forbidden Or Manual-Only

Forbidden in default local and PR/CI gates:

- `corepack pnpm db:migrate`
- `corepack pnpm db:seed`
- `corepack pnpm demo:seed-workflows`
- `corepack pnpm smoke:accounting`
- `corepack pnpm smoke:accounting:*`
- `corepack pnpm e2e`
- `corepack pnpm e2e:headed`
- `corepack pnpm user-testing:cleanup-plan`
- `corepack pnpm exec playwright test -c playwright.visual.config.ts --update-snapshots`
- `corepack pnpm zatca:*` except pure package tests for `@ledgerbyte/zatca-core`
- deployed beta/user-testing E2E or smoke checks
- any production URL, production database, production storage, production email, production ZATCA, backup/restore, deploy, provider setting, or environment variable mutation command

Manual-only with explicit approval:

- `corepack pnpm test:visual`
- `node scripts/check-deployed-e2e-env.cjs` against beta/user-testing only
- `corepack pnpm e2e` with session-only `LEDGERBYTE_E2E_SEED_WORKFLOWS=false`
- selected smoke slices against disposable local/test data
- local API/web/Docker startup and health/readiness probes
- `corepack pnpm db:generate` when Prisma/schema/client changes

## Open Questions

- Should `verify:local` auto-detect changed workspaces or require an explicit `--scope` argument?
- Should docs lint/link checks be added, and which tool should be used without creating noisy false positives?
- Should placeholder package tests be replaced with real package-level tests or kept as informational scripts?
- What is the approved fixture policy for login/audit-writing E2E?
- Should CI use service containers for disposable Postgres/Redis, or should runtime/browser QA remain manual until DEV-03?
- When should `corepack pnpm test:visual` become a PR gate instead of a nightly/manual gate?
- What cleanup policy is acceptable for smoke-created records in local and beta/user-testing data?
- Which output-producing PDF/export/download checks can be made non-mutating enough for nightly use?

## Recommended Next Step

Run `DEV-02 Part 6: verify CI workflow locally and finalize DEV-02` next. Keep verification local and non-mutating; do not add smoke, E2E, migrations, seed/reset/delete, deploys, ZATCA, email, backup/restore, production targets, or login/audit-writing flows.
