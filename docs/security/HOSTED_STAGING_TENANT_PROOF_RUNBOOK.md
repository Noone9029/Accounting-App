# Hosted Staging Tenant Proof Runbook

Date: 2026-07-05

Branch: `codex/hosted-staging-proof-runbook`

Base: `origin/main` at `596b802aef2610a45072091892052c8fac3a8269`

Purpose: define the exact approval, execution, evidence, and stop gates for running LedgerByte hosted staging tenant-isolation proof with the merged PR #235 read-only adapter.

This runbook is documentation-only. It does not authorize hosted mutations, production database access, hosted migrations, seed/reset/delete, broad cleanup, Supabase or Vercel mutation commands, provider calls, email, bank-feed, payment-processor, ZATCA, Peppol, ASP, object-storage mutation, or customer-data access.

## Current Harness Capability

The current command surface is:

```text
corepack pnpm tenant-isolation:proof
corepack pnpm tenant-isolation:proof -- --mode read-only-plan --proof-run-id <proofRunId> --base-url <local-or-staging-url>
corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id <proofRunId> --base-url <staging-proof-url>
corepack pnpm tenant-isolation:proof -- --mode staging-synthetic-proof --environment staging --proof-run-id <proofRunId> --base-url <staging-proof-url>
```

Only `staging-read-only-probe` has a network-capable adapter today, and only after all staging gates pass. It sends GET requests only:

- `GET /auth/me`.
- `GET /dashboard/summary` for tenant A.
- `GET /search?query=LB-TENANT-PROOF:<proofRunId>` for tenant A.
- `GET /reports/profit-and-loss?from=2026-01-01&to=2026-12-31` for tenant A.
- `GET /dashboard/summary` for tenant B with the same bearer token, expecting `403`.

`staging-synthetic-proof` remains a classification/contract mode only. Do not treat it as an executable mutation proof until a separate reviewed mutation adapter and proof-run-ID cleanup path exist.

## Required Approval Packet

Do not run a hosted staging probe until the owner supplies an approval packet containing all of these fields:

- Approved staging or dedicated proof API base URL.
- Confirmation that the target is not production and contains no real customer data.
- Unique proof-run ID.
- Synthetic tenant A organization ID.
- Synthetic tenant B organization ID.
- Synthetic tenant A user identity description.
- Confirmation that the supplied user has tenant A read permissions for dashboard, search, and reports.
- Confirmation that the supplied user does not have active membership in tenant B.
- Approved bearer token delivery path outside git, chat transcript, and committed docs.
- Explicit `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1` approval.
- Explicit `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1` approval.
- Confirmation that production override is not being used.
- Confirmation that no staging mutation is approved for this run.

The approval packet must not contain the raw token in committed files. The token should be injected into the shell environment only for the approved run and removed immediately after.

## Environment Variables

Required for an approved read-only staging probe:

```powershell
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT = 'staging'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL = '<approved-staging-proof-url>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID = '<proofRunId>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID = '<tenant-a-organization-id>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID = '<tenant-b-organization-id>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN = '<approved-bearer-token>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW = '1'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW = '1'
```

Do not set `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW` for a read-only probe.

After the run, clear the sensitive and approval variables:

```powershell
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW -ErrorAction SilentlyContinue
```

## Preflight

Run these local checks before any hosted probe:

```powershell
git status --short
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm --filter @ledgerbyte/api test -- hosted-tenant-isolation-proof
```

Expected status:

- Worktree is clean before the hosted run.
- Harness tests pass.
- No `apps/web/next-env.d.ts` diff.
- No `.env` file, token, database URL, service role key, private key, cookie, auth header, customer data, document body, attachment body, signed XML, or QR payload is staged or committed.

## Safety Classification

First classify the target without the token if possible:

```powershell
corepack pnpm tenant-isolation:proof -- --mode read-only-plan --proof-run-id $env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID --base-url $env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL
```

Then classify the staged probe:

```powershell
corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id $env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID --base-url $env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL
```

Proceed only if the second command reports a ready plan and then runs the read-only probe. Stop if it reports:

- `safety=refused`.
- `productionLooking=true`.
- Missing allow, read-only allow, token, or tenant variables.
- Any target that is not clearly staging, sandbox, test, or proof.
- Any unexpected status for the five read-only checks.

## Evidence Capture

Capture only sanitized output:

- Safety summary lines.
- JSON fields that show target host, environment, proof-run ID, check IDs, HTTP statuses, pass/fail, `responseBodyCaptured=false`, and `mutationAttempted=false`.
- CI/local command results.
- The exact commit SHA of the code under test.
- Confirmation that environment variables were cleared after the run.

Do not capture:

- Raw token values.
- Cookies.
- Auth headers.
- Database URLs or direct URLs.
- Service-role keys or storage credentials.
- Customer data.
- Response bodies.
- Document bodies.
- Attachment bodies.
- Signed XML.
- QR payloads.
- Provider payloads.

## Interpreting Results

Pass criteria for the current adapter:

- `/auth/me` returns 2xx.
- Tenant A dashboard returns 2xx.
- Tenant A proof-marker search returns 2xx.
- Tenant A Profit and Loss returns 2xx.
- Tenant B dashboard with the tenant A token returns `403`.
- The output reports `mutationAttempted=false`.
- The output reports `responseBodyCaptured=false` for every check.

Failure criteria:

- Tenant B returns 2xx.
- Any tenant A read unexpectedly returns 401/403/404/5xx.
- The target is production-looking.
- The command prints secrets or response bodies.
- Any non-GET request is observed.
- Any hosted write, migration, cleanup, provider, email, bank-feed, payment-processor, ZATCA, Peppol, ASP, storage mutation, or production command is attempted.

## Known Gaps After A Passing Read-Only Probe

A passing PR #235 read-only probe does not prove:

- Browser cookie auth.
- CSRF behavior.
- Browser organization switching.
- Export, PDF, download, attachment, generated-document, signed URL, or object-storage tenant isolation.
- Hosted database runtime-role least privilege.
- Database RLS.
- Hosted environment variable correctness beyond the API behavior seen by the probe.
- Synthetic hosted mutations.
- Proof-run cleanup.
- Backup/restore tenant boundaries.
- Production readiness.

Those remain separate proof lanes.

## Stop Rules

Stop immediately and report the exact blocker if:

- The approval packet is incomplete.
- The target is production-looking or customer-data-bearing.
- The token belongs to a user with access to both tenants.
- The probe returns cross-tenant success.
- The command prints sensitive material.
- Any tool suggests running hosted migrations, hosted cleanup, hosted seed/reset/delete, or production commands.
- `apps/web/next-env.d.ts` appears as generated churn after local verification; restore it before closeout.

## Next Recommended Prompt

```text
Codex, execute the hosted staging tenant read-only proof using the approved staging/proof URL, synthetic tenant IDs, proof-run ID, and bearer token supplied out of band. Run only PR #235's read-only adapter, do not set staging mutation allow, do not run hosted migrations or cleanup, capture sanitized evidence only, and stop immediately on any refusal or cross-tenant success.
```
