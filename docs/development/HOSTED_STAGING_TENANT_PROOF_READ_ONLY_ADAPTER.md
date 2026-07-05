# Hosted Staging Tenant Proof Read-Only Adapter

Date: 2026-07-05

Branch: `codex/hosted-staging-tenant-proof`

Base: `origin/main` at `8fd1a62229f814f2f8c12758cb7fd0afbb4d6a47`

## Scope

This branch prepares the hosted tenant isolation proof harness to execute an approved staging read-only probe. It does not run a hosted probe from the local worktree because the approved staging URL, auth token, synthetic tenant IDs, and explicit allow gates are not present.

No runtime API route, accounting logic, Prisma schema, migration, UI behavior, hosted mutation, seed, reset, delete, cleanup, Supabase command, Vercel deploy, provider call, email, bank-feed, payment-processor, ZATCA, Peppol, or ASP operation was added.

## Adapter Behavior

`staging-read-only-probe` now has a GET-only execution adapter behind the existing safety plan:

- `GET /auth/me` with the supplied bearer token, without an organization header.
- `GET /dashboard/summary` for tenant A.
- `GET /search?query=LB-TENANT-PROOF:<proofRunId>` for tenant A.
- `GET /reports/profit-and-loss?from=2026-01-01&to=2026-12-31` for tenant A.
- `GET /dashboard/summary` for tenant B with the same bearer token, expecting `403`.

The adapter records statuses only. It does not capture or print response bodies, auth tokens, cookies, database URLs, storage credentials, customer records, document bodies, attachment bodies, signed XML, QR payloads, or provider payloads.

## Required Gates

The read-only probe remains refused unless all of these are supplied:

- `LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT=staging` or `--environment staging`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL` or `--base-url <staging-proof-url>`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID` or `--proof-run-id <id>`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID`.

The supplied token must belong to a synthetic tenant A user with the read permissions needed for dashboard, search, and reports. That user must not have active membership in tenant B; if tenant B returns success, the probe fails.

Production-looking targets remain refused without the existing explicit production read-only override. Synthetic staging mutation remains separately gated by `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1` and was not implemented or run here.

## Covered

- Refused plans do not call the HTTP client.
- Production-looking staging probe targets do not call the HTTP client.
- Ready staging read-only probes call only `GET` endpoints.
- Tenant A dashboard, search, and profit-and-loss read surfaces are represented.
- Cross-tenant organization context is represented by expecting tenant B dashboard access to return `403` for the same token.
- Probe output stays secret-free and response-body-free.

## Not Covered

- No real hosted/staging network probe was run in this worktree.
- Browser cookie auth and CSRF behavior are not proven by this adapter; it uses the existing bearer-token contract for read-only API probes.
- Export/PDF/download/signed-URL/object-storage tenant boundaries are not proven by this adapter.
- Synthetic hosted mutation and proof-run cleanup are not implemented or run.
- Database RLS/runtime-role tenant boundaries remain unproven here.
- Production posture remains non-mutating and unexecuted.

## Local Evidence

- `corepack pnpm install --frozen-lockfile` passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` passed.
- `corepack pnpm --filter @ledgerbyte/api exec prisma validate` passed with a local placeholder `DATABASE_URL`/`DIRECT_URL`.
- `corepack pnpm --filter @ledgerbyte/api test -- hosted-tenant-isolation-proof` passed with 16 tests.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `corepack pnpm tenant-isolation:proof` remained local dry-run, non-networked, and non-mutating.
- `corepack pnpm tenant-isolation:proof -- --mode read-only-plan --proof-run-id proof-20260705-local --base-url http://localhost:3001` remained local, non-networked, and non-mutating.
- `corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id proof-20260705-staging --base-url https://api.staging.ledgerbyte.test` refused before network because required staging allow/auth/tenant variables were absent.
- `corepack pnpm lint` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- `corepack pnpm verify:diff` passed.
- `git diff --check` passed with existing CRLF normalization warnings only.
- Targeted high-risk secret scan matched only synthetic test placeholders, bearer-header construction, and environment variable names.
- Targeted trailing-whitespace scan found no matches.
- `apps/web/next-env.d.ts` was restored after generated Next.js route-type churn.

## Next Recommended Prompt

`Review the hosted staging tenant proof read-only adapter branch for owner-review readiness only. Do not run hosted probes unless approved staging URL, bearer token, synthetic tenant IDs, proof-run ID, and explicit read-only allow gates are supplied.`
