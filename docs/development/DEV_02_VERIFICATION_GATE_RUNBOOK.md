# DEV-02 Verification Gate Runbook

## Purpose

This runbook documents the safe verification gate scripts added in DEV-02 Part 3. The gates make common local and CI-candidate checks easier to run without changing application behavior, database state, infrastructure, provider settings, or production targets.

These gates are non-destructive by default. They do not replace manual browser/runtime QA, smoke tests, E2E, migrations, or release-readiness checks.

## Scripts

Root package scripts:

| Script | Command | When to run | Services required | Mutation risk |
| --- | --- | --- | --- | --- |
| `verify:diff` | `corepack pnpm verify:diff` | Before and after staging docs or code changes | None | None |
| `verify:local:web` | `corepack pnpm verify:local:web` | During web-only/frontend-safe work | None by default | None |
| `verify:local:api` | `corepack pnpm verify:local:api` | During API-only/backend-safe work | None by default | None |
| `verify:local:guards` | `corepack pnpm verify:local:guards` | When credential and user-testing guard scripts change | None | None; cleanup plan tests only |
| `verify:repo` | `corepack pnpm verify:repo` | Slower pre-push candidate gate | None by default | None from gate commands |
| `verify:ci:local` | `corepack pnpm verify:ci:local` | Local mirror of proposed non-destructive CI PR gate | None by default | None from gate commands |

Direct runner examples:

```powershell
node scripts/verify-gate.cjs verify:diff --plan
node scripts/verify-gate.cjs verify:repo --dry-run
node scripts/verify-gate.cjs --list
```

## Exact Command Plans

`verify:diff` runs:

```powershell
git status --short
git diff --check
git diff --cached --check
```

`verify:local:web` runs:

```powershell
git diff --check
corepack pnpm --filter @ledgerbyte/web typecheck
```

`verify:local:api` runs:

```powershell
git diff --check
corepack pnpm --filter @ledgerbyte/api typecheck
```

`verify:local:guards` runs:

```powershell
git diff --check
node --test scripts/test-credential-env.test.cjs
corepack pnpm test:user-testing-cleanup-plan
```

`verify:repo` runs:

```powershell
git diff --check
corepack pnpm db:generate
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
git diff --cached --check
```

`verify:ci:local` runs:

```powershell
git diff --check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
node --test scripts/test-credential-env.test.cjs
corepack pnpm test:user-testing-cleanup-plan
```

## Targeted Web/API Tests

Pass targeted Jest args through the web or API gate when the change needs a narrow test in addition to typecheck:

```powershell
corepack pnpm verify:local:web -- settings roles
corepack pnpm verify:local:api -- bank-statements
node scripts/verify-gate.cjs verify:local:web --plan -- settings roles
```

The runner rejects targeted args that mention forbidden default-gate areas such as smoke, E2E, migrations, seed/reset/delete, deploys, ZATCA, email, backup/restore, login, or URLs.

## Windows PowerShell Examples

Use these from the repo root:

```powershell
corepack pnpm verify:diff
corepack pnpm verify:local:web
corepack pnpm verify:local:api -- reports
corepack pnpm verify:local:guards
```

Use plan mode before a slow or new gate:

```powershell
node scripts/verify-gate.cjs verify:ci:local --plan
```

## CI And Local Distinction

- `verify:diff`, `verify:local:web`, `verify:local:api`, and `verify:local:guards` are local developer gates.
- `verify:repo` is a local pre-push or PR-candidate gate. It can be slower because it runs full workspace typecheck, test, and build.
- `verify:ci:local` mirrors the implemented PR verification gate.
- DEV-02 Part 5 adds `.github/workflows/pr-verification.yml` without changing the deployed E2E workflow.

## Documentation and CI proposal status

- README now points developers to these verification gates and the non-destructive default boundary.
- The lightweight CI proposal and implementation status are documented in [DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md](DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md).
- GitHub workflow implementation is now limited to [../../.github/workflows/pr-verification.yml](../../.github/workflows/pr-verification.yml). The deployed E2E workflow remains separate and manual.

## PR CI workflow

Workflow path: [../../.github/workflows/pr-verification.yml](../../.github/workflows/pr-verification.yml).

The workflow runs on `pull_request` and manual `workflow_dispatch`. Use `workflow_dispatch` only to rerun the same non-mutating PR-style gate manually; it is not a deployed beta, smoke, migration, seed, reset, delete, ZATCA, email, backup/restore, or login-flow runner.

Commands run by PR CI:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm verify:diff
corepack pnpm verify:ci:local
```

PR CI intentionally excludes production URLs, deployed beta checks, Vercel/Supabase setting changes, databases/services, migrations, seed/reset/delete, login/audit-writing flows, E2E, smoke, real ZATCA, real email, backup/restore, and customer-data mutation.

## DEV-02 Finalization

DEV-02 final verification and remaining blocker summary are documented in [DEV_02_FINAL_HANDOFF.md](DEV_02_FINAL_HANDOFF.md). The final pass verified the PR workflow locally as far as safely possible without running actual `verify:ci:local`, `verify:repo`, full tests, full build, E2E, smoke, migrations, seed/reset/delete, deployed beta checks, ZATCA, email, backup/restore, production-hosting research, or login/audit-writing flows.

## Intentional Exclusions

Default gates intentionally exclude:

- production hosting research or production URLs
- deploys, provisioning, Vercel/Supabase settings, or environment variable changes
- database migrations, Prisma schema changes, seed/reset/delete, or demo seeding
- full Playwright E2E and in-app browser runtime QA
- smoke tests and any flow that creates or mutates accounting records
- login or other audit-log-writing flows
- real ZATCA, CSID, signing, clearance/reporting, PDF/A-3, or ZATCA network calls
- real email, relay diagnostics, sends, retry workers, provider webhooks, or suppression mutations
- report downloads, PDF generation, exports, attachment workflows, backup execution, or restore execution

## Operational Notes

- The gates do not require Docker by default.
- The gates do not start API or web services by default.
- Local API/web health checks remain documented in [DEV_01_LOCAL_QA_RUNBOOK.md](DEV_01_LOCAL_QA_RUNBOOK.md) and should be run only when service startup is explicitly in scope.
- Use `git status --short` before staging so unrelated dirty marketing or graphify output remains untouched and unstaged.

## Recommended Default Use

For narrow docs or script changes:

```powershell
corepack pnpm verify:diff
```

For web-only work:

```powershell
corepack pnpm verify:local:web
```

For API-only work:

```powershell
corepack pnpm verify:local:api
```

For a broader candidate before handing off:

```powershell
corepack pnpm verify:repo
```

Run `verify:repo` and `verify:ci:local` only when the slower workspace checks are reasonable for the current task.
