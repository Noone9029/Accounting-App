# LedgerByte Vercel User-Testing Deployment Runbook

Date: 2026-05-20

This runbook documents the current LedgerByte user-testing deployment path for the API and web projects. It is operational documentation only; it does not contain Vercel tokens, database URLs, Supabase service keys, SMTP secrets, ZATCA credential material, XML bodies, QR bodies, document bodies, or attachment bodies.

## Current User-Testing Targets

- GitHub repository: `Noone9029/Accounting-App`
- Production branch used for user testing: `main`
- API project: `ledgerbyte-api-test`
- API project id: `prj_2GeXXbVWoD1WaDOhylTR3cEPlUCR`
- API user-testing URL: `https://ledgerbyte-api-test.vercel.app`
- Web project: `ledgerbyte-web-test`
- Web project id: `prj_TQViL2ZHGtZgVRaxutr9GEiv08n8`
- Web user-testing URL: `https://ledgerbyte-web-test.vercel.app`
- Supabase test project ref: `xynelbjqcmbgtscfmmzv`

Latest proven Git-triggered deployments on 2026-05-20:

- API deployment `dpl_GbGmuk5pfDwiJwD337auhYBkozkR`, state `READY`, commit `c5b4f290eedc1dc8f84958087c748d5b08618fca`.
- Web deployment `dpl_FV4LjD3PDheC74rQJ9b3XR15doAW`, state `READY`, commit `c5b4f290eedc1dc8f84958087c748d5b08618fca`.
- API alias `https://ledgerbyte-api-test.vercel.app` points at `dpl_GbGmuk5pfDwiJwD337auhYBkozkR`.
- Web alias `https://ledgerbyte-web-test.vercel.app` points at `dpl_FV4LjD3PDheC74rQJ9b3XR15doAW`.

## Git Auto-Deploy Status

Current status: push-only Git auto-deploy is proven for both user-testing projects.

Evidence:

- Both projects are connected to GitHub repository `Noone9029/Accounting-App` on production branch `main`.
- Deployment list metadata for the final deployments includes `githubOrg=Noone9029`, `githubRepo=Accounting-App`, `githubCommitRef=main`, `githubCommitSha=c5b4f290eedc1dc8f84958087c748d5b08618fca`, and `githubDeployment=1`.
- Git provider deployment creation is enabled. Commit comments are disabled for commits and enabled for pull requests; that does not disable deployment creation.
- `.github/workflows/deployed-e2e.yml` is manual `workflow_dispatch` only and does not deploy.
- There is no repository GitHub Actions workflow that deploys the API or web projects; Vercel Git integration created the deployments.

Proof sequence:

1. Reconnected both projects with `vercel git connect https://github.com/Noone9029/Accounting-App`.
2. Pushed harmless proof commit `09e9b4f674bd21cf38bcf19ffb4fc2d45055295f` (`Prove Vercel Git auto deploy`).
3. Vercel Git created deployments without `vercel deploy`.
4. Web deployment for `09e9b4f` became `READY`; API deployment `dpl_9rYNkHzMrGeUT757aXuudRnx5SMn` failed because the Git build did not use `vercel.api.json` and expected a `public` output directory.
5. Pushed repair commit `07551b065cf7e393b3fb39aeabad2cb236aba916` to add root API Git deployment config. API and web Git deployments became `READY`, but API runtime returned `500` because workspace package build outputs were absent in the fresh Git build.
6. Pushed repair commit `c5b4f290eedc1dc8f84958087c748d5b08618fca` to build API workspace package dependencies during Vercel API postinstall. API and web Git deployments became `READY`, and aliases pointed to the Git-triggered deployments.

Project settings observed during repair:

- API project `ledgerbyte-api-test`: framework `Other`, root directory `.`, source files outside root enabled, Git link `github/Noone9029/Accounting-App`, production branch `main`, no ignored-build command observed.
- Web project `ledgerbyte-web-test`: framework `Next.js`, root directory `apps/web`, source files outside root enabled, Git link `github/Noone9029/Accounting-App`, production branch `main`, no ignored-build command observed.
- API build behavior is controlled by root `vercel.json` and `scripts/vercel-postinstall.cjs`.
- Web build behavior is controlled by `apps/web/vercel.json` and the `apps/web` project root.

Keep the explicit CLI deployment path below as the fallback if Git integration is later disconnected or blocked.

## API Deployment Method

The API Git deployment is deployed from the repository root through the Vercel Node wrapper in `api/index.js` and root `vercel.json`.

Important implementation details:

- `api/index.js` loads `apps/api/dist/apps/api/api/index.js`.
- Root `vercel.json` maps all routes to `api/index.js` and sets install to `corepack enable && corepack pnpm install --frozen-lockfile`.
- `scripts/vercel-postinstall.cjs` builds workspace package dependencies, generates Prisma, and builds the Nest API only when `VERCEL=1` and `LEDGERBYTE_DEPLOY_TARGET=api`.
- The API Vercel project must install with pnpm/corepack, not plain `npm install`, because the monorepo uses `workspace:*` dependencies.
- The API Vercel project must keep `LEDGERBYTE_DEPLOY_TARGET=api` configured.

Fallback CLI shape from repository root:

```powershell
$env:VERCEL_ORG_ID="team_lAUvESBraFO74ZDE8jwU6xN4"
$env:VERCEL_PROJECT_ID="prj_2GeXXbVWoD1WaDOhylTR3cEPlUCR"
npx --yes vercel@latest deploy --prod --local-config vercel.api.json --scope ahmad-khalid-s-projects
```

Do not print or commit Vercel tokens. If the CLI is not authenticated, run the normal Vercel login flow locally and keep credentials out of the repository.

Required API environment variables are presence-checked only in audits. Do not print values:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `LEDGERBYTE_DEPLOY_TARGET=api`
- `PRISMA_CONNECTION_LIMIT`
- `PRISMA_TRANSACTION_MAX_WAIT_MS`
- `PRISMA_TRANSACTION_TIMEOUT_MS`
- `ZATCA_ADAPTER_MODE=mock`
- `ZATCA_ENABLE_REAL_NETWORK=false`
- `ZATCA_SDK_EXECUTION_ENABLED=false`
- Empty or disabled real ZATCA base URLs unless a separate approved ZATCA sandbox phase exists.

## Web Deployment Method

The web app Git deployment is deployed from the `apps/web` project root with `apps/web/vercel.json`.

Fallback CLI shape from repository root:

```powershell
$env:VERCEL_ORG_ID="team_lAUvESBraFO74ZDE8jwU6xN4"
$env:VERCEL_PROJECT_ID="prj_TQViL2ZHGtZgVRaxutr9GEiv08n8"
npx --yes vercel@latest deploy --prod --local-config vercel.web.json --scope ahmad-khalid-s-projects
```

The web build command is:

```bash
corepack pnpm --filter @ledgerbyte/web build
```

The web install command should use:

```bash
corepack enable && corepack pnpm install --frozen-lockfile
```

Required web environment variable:

- `NEXT_PUBLIC_API_URL=https://ledgerbyte-api-test.vercel.app`

## Direct API Deploy Failure Mode

A prior failed API deployment attempted the wrong install behavior and produced:

```text
npm error Unsupported URL Type "workspace:": workspace:*
Error: Command "npm install" exited with 1
```

This is why the current API method uses the repository root, pnpm/corepack install behavior, and the root `api/index.js` wrapper. Do not switch the API project to `apps/api` as a standalone root unless the workspace install and wrapper path are revalidated.

## Post-Deploy Health Checks

Run these after every API deployment:

```powershell
Invoke-RestMethod https://ledgerbyte-api-test.vercel.app/
Invoke-RestMethod https://ledgerbyte-api-test.vercel.app/health
Invoke-RestMethod https://ledgerbyte-api-test.vercel.app/readiness
```

Expected:

- `/` returns non-sensitive LedgerByte API status JSON.
- `/health` returns `{ "status": "ok", "service": "api" }`.
- `/readiness` returns safe JSON and never exposes database URLs or secrets. A `503` means the function is alive but database readiness needs review.

Run this after every web deployment:

```powershell
Invoke-WebRequest https://ledgerbyte-web-test.vercel.app -UseBasicParsing
Invoke-WebRequest https://ledgerbyte-web-test.vercel.app/setup -UseBasicParsing
Invoke-WebRequest https://ledgerbyte-web-test.vercel.app/settings/storage -UseBasicParsing
```

Then sign in through the browser test flow, not by inspecting tokens.

2026-05-20 Git-triggered deployment checks:

- `https://ledgerbyte-api-test.vercel.app/` returned HTTP `200`.
- `https://ledgerbyte-api-test.vercel.app/health` returned HTTP `200`.
- `https://ledgerbyte-api-test.vercel.app/readiness` returned HTTP `200`.
- `https://ledgerbyte-web-test.vercel.app` returned HTTP `200`.
- `https://ledgerbyte-web-test.vercel.app/setup` returned HTTP `200`.
- `https://ledgerbyte-web-test.vercel.app/settings/storage` returned HTTP `200`.

## Post-Deploy Smoke

Use the seeded test credentials from local secret storage or CI secrets. Do not paste passwords into docs or logs.

```powershell
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_SMOKE_EMAIL="<from secret store>"
$env:LEDGERBYTE_SMOKE_PASSWORD="<from secret store>"
corepack pnpm smoke:accounting
```

Expected safety gates:

- ZATCA real network remains disabled.
- ZATCA production compliance remains false.
- Email diagnostics, retry processor, retry worker, provider webhooks, and customer email sends remain disabled by default.
- Backup/restore readiness remains plan/evidence only unless an approved non-production drill has been run.

2026-05-20 result against Git-triggered API deployment `dpl_GbGmuk5pfDwiJwD337auhYBkozkR`: `corepack pnpm smoke:accounting` passed. The summary confirmed mock email mode with no customer email sending by default, ZATCA production compliance `false`, real ZATCA network disabled, CSID execution disabled, and backup/readiness no-backup/no-restore behavior. Local secret-store credentials were not available in the shell, so the proof used an isolated generated test user and organization with the generated password kept in-process and not printed.

## Post-Deploy E2E

```powershell
$env:LEDGERBYTE_WEB_URL="https://ledgerbyte-web-test.vercel.app"
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_E2E_EMAIL="<from secret store>"
$env:LEDGERBYTE_E2E_PASSWORD="<from secret store>"
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS="false"
corepack pnpm e2e
```

For GitHub Actions, use the manual **Deployed E2E Smoke** workflow. It does not deploy; it only validates an already deployed environment.

2026-05-20 result against Git-triggered API deployment `dpl_GbGmuk5pfDwiJwD337auhYBkozkR` and web deployment `dpl_FV4LjD3PDheC74rQJ9b3XR15doAW`: `corepack pnpm e2e` passed with `10 passed` and `2 skipped` in 3.7 minutes. `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` was set. No real customer email send, real ZATCA network, CSID request, clearance, reporting, PDF/A-3 workflow, destructive DB reset, migration, or seed was run.

## Rollback Plan

1. Identify the last known-good deployment id in Vercel for each project.
2. Promote or roll back the API project first.
3. Run `/`, `/health`, and `/readiness` against the API alias.
4. Promote or roll back the web project.
5. Run deployed E2E against the aliases.
6. If database migrations are involved, stop and use the database restore runbook. Do not run ad hoc destructive SQL.

## CLI/Auth Caveats

- The local `.vercel/project.json` currently points at `ledgerbyte-web-test`; API deployments must set `VERCEL_PROJECT_ID` explicitly or relink intentionally.
- Do not use plain `vercel deploy --prod` without checking which project is linked.
- Do not rely on shell history for tokens or secret values.
- Treat Vercel project ids as non-secret identifiers, but do not publish auth tokens.
- Do not enable real ZATCA network or customer email sending as part of deployment verification.
- Supabase RLS remains disabled on 76 public tables in the user-testing project as of the 2026-05-19 review. Do not enable RLS as part of deployment proof; handle it in a separate phased hardening task.
