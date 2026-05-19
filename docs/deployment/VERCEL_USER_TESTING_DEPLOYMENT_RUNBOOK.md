# LedgerByte Vercel User-Testing Deployment Runbook

Date: 2026-05-19

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

Observed latest deployments on 2026-05-19:

- API deployment `dpl_7m9dEBuTSPv94XVZxN2bqm5SAxVH`, state `READY`, commit `6c3917046711c6bafd21ec1400ba9809306c7b93`.
- Web deployment `dpl_AFEMwVrHwzVRr9t4BXxGH8ZtbkKm`, state `READY`, commit `6c3917046711c6bafd21ec1400ba9809306c7b93`.

## Git Auto-Deploy Status

Current status: connected Git metadata is visible, but push-only automatic deployment is not yet proven.

Evidence:

- Vercel deployment metadata includes `githubOrg=Noone9029`, `githubRepo=Accounting-App`, `githubCommitRef=main`, and `githubCommitSha`.
- The current known-good deployments were created by authenticated CLI deployment with explicit project IDs.
- `.github/workflows/deployed-e2e.yml` is manual `workflow_dispatch` only and does not deploy.
- There is no repository GitHub Actions workflow that deploys the API or web projects.

Required proof before treating Git auto-deploy as reliable:

1. Push a harmless test commit to `main` or a controlled preview branch.
2. Confirm both Vercel projects create new deployments from that commit without CLI deploy commands.
3. Confirm the deployments use the expected build/install commands and environment variables.
4. Run deployed smoke and Playwright E2E against the new aliases.
5. Record the deployment ids and commit hash in this runbook or a dated release note.

Until that proof exists, use the explicit CLI deployment path below.

## API Deployment Method

The API is deployed from the repository root through the Vercel Node wrapper in `api/index.js` and `vercel.api.json`.

Important implementation details:

- `api/index.js` loads `apps/api/dist/apps/api/api/index.js`.
- `scripts/vercel-postinstall.cjs` builds the Nest API only when `VERCEL=1` and `LEDGERBYTE_DEPLOY_TARGET=api`.
- The API Vercel project must install with pnpm/corepack, not plain `npm install`, because the monorepo uses `workspace:*` dependencies.
- The API Vercel project must keep `LEDGERBYTE_DEPLOY_TARGET=api` configured.

Recommended CLI shape from repository root:

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

The web app is deployed from the repository root with `vercel.web.json`.

Recommended CLI shape from repository root:

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
```

Then sign in through the browser test flow, not by inspecting tokens.

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
