# LedgerByte User-Testing Post-Deploy Readiness Evidence

Date: 2026-07-10

Status: **PARTIAL PASS - public deployment checks passed; authenticated feature smoke is blocked by stale test credentials.**

This document records a bounded, non-mutating audit of the LedgerByte hosted user-testing environment. It is beta/user-testing evidence only. It is not proof of production readiness, production disaster recovery, managed PITR, provider operation, regulatory compliance, or money movement.

## Audit Scope

- Source commit: `79ce100fb08e7aa6b0515504b64b0e93ec302145`
- Source branch at audit start: clean `main`, equal to `origin/main`
- Supabase project ref: `xynelbjqcmbgtscfmmzv`
- Environment classification: hosted user-testing/beta, not production
- Infrastructure changes: none
- Deployments or migrations run during this audit: none
- Provider calls or provider enablement: none

## Deployment Evidence

| Component | Stable alias | Deployment URL | Deployment ID | State |
| --- | --- | --- | --- | --- |
| API | `https://ledgerbyte-api-test.vercel.app` | `https://ledgerbyte-api-test-3c9wejzcn-ahmad-khalid-s-projects.vercel.app` | `dpl_CkvvHBpNo3r4qAK59HU7v8eJfiYL` | `READY` |
| Web | `https://ledgerbyte-web-test.vercel.app` | `https://ledgerbyte-web-test-8c8pu9a0a-ahmad-khalid-s-projects.vercel.app` | `dpl_AuLPhqjhznsqCBDEXRZNWLEtbtRa` | `READY` |

Both stable aliases resolved to the deployment IDs above during this audit.

## API Smoke

Only safe status fields were retained. Response bodies, credentials, cookies, authorization data, database URLs, and tenant data were not recorded.

| Route | HTTP | Safe result |
| --- | ---: | --- |
| `GET /` | 200 | `LedgerByte API`, status `ok`, environment `production` (Vercel runtime classification) |
| `GET /health` | 200 | service `api`, status `ok` |
| `GET /readiness` | 200 | status `ok`, database check `ok` |

Result: **PASS**.

## Public Web Smoke

Headless Microsoft Edge loaded each route against the stable web alias.

| Route | HTTP | Browser result |
| --- | ---: | --- |
| `/` | 200 | Expected LedgerByte marketing page; no console errors, page exceptions, 500 page, or Next.js runtime error page |
| `/login` | 200 | Login page rendered; no console errors, page exceptions, 500 page, or Next.js runtime error page |
| `/dashboard` | 200 | Dashboard shell rendered; no page exception or runtime error page |

The unauthenticated dashboard shell produced one expected `401` response from `GET https://ledgerbyte-api-test.vercel.app/auth/me`. No unexpected failing browser request was observed.

Result: **PASS for unauthenticated/public shell behavior**.

## Authenticated Smoke

The documented current-user DPAPI store existed at `%LOCALAPPDATA%\LedgerByte\user-testing-credentials.json` and contained a `passwordDpapi` field with no plaintext password field. Its API and web targets matched the approved user-testing aliases.

The credential was decrypted in-process, passed to a child browser process through process-only environment variables, and removed after the attempt. No password, cookie, token, authorization header, organization identifier, or credential value was printed or written to the repository.

`POST /auth/login` returned `401` with the safe error `Invalid email or password.` The stored test credential is stale. No authenticated feature route was claimed as verified.

The following requested surfaces remain **NOT RECHECKED** in this audit:

- dashboard data
- document inbox
- payment readiness settings
- system configuration readiness
- observability readiness
- bank integration readiness
- supplier payout requests
- public API readiness/docs
- webhook readiness
- report CSV and report packs
- invoice email readiness
- import/export toolkit

Required safe smoke configuration for a rerun:

- `LEDGERBYTE_WEB_URL`
- `LEDGERBYTE_API_URL`
- `LEDGERBYTE_SMOKE_EMAIL`
- `LEDGERBYTE_SMOKE_PASSWORD`
- `LEDGERBYTE_SMOKE_ORGANIZATION_ID`

Rotate or update the DPAPI-backed store through the approved secret-management flow. Do not provide the password in chat, source files, shell history, or this evidence document.

Result: **BLOCKED by stale approved smoke credentials**.

## Vercel Environment-Name Audit

Only environment variable names were read. Values were not requested, printed, or recorded.

Required API names were present:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `LEDGERBYTE_DEPLOY_TARGET`
- `PRISMA_CONNECTION_LIMIT`
- `PRISMA_TRANSACTION_MAX_WAIT_MS`
- `PRISMA_TRANSACTION_TIMEOUT_MS`

Additional API names observed were `APP_WEB_URL` and ZATCA configuration names. Their values were not inspected. No ZATCA action was run.

Required web name `NEXT_PUBLIC_API_URL` was present. The web project also exposed market-selection variable names; no values were recorded.

The following optional provider-mode names were absent:

- `LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER`
- `LEDGERBYTE_STRIPE_PAYMENT_LINKS_ENABLED`
- `LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED`
- `LEDGERBYTE_BANK_INTEGRATION_PROVIDER`
- `EMAIL_PROVIDER`
- `LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER`
- `LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE`
- `LEDGERBYTE_OUTBOUND_WEBHOOKS_PUBLIC_APPROVED`
- `LEDGERBYTE_SENTRY_ENABLED`
- `LEDGERBYTE_OTEL_ENABLED`

Repository defaults keep these integrations disabled when the corresponding names are absent. Authenticated configuration and observability readiness endpoints were not rechecked because login was blocked, so hosted provider state beyond the name/default audit is not claimed as independently proven here.

Result: **PASS for required name coverage; no missing required names found**.

## Supabase Migration Status

Previously recorded result: all approved hosted user-testing migrations were applied and Prisma reported the schema up to date.

This audit did not rerun `prisma migrate status`. No process-scoped `DATABASE_URL` or `DIRECT_URL` was available, and local `.env` files were not read. Vercel-hosted secret values were not pulled or decrypted.

Result: **RECORDED PRIOR PASS; NOT RECHECKED IN THIS AUDIT**.

## Known Limitations

- Authenticated feature-route readiness remains unproven for the current deployments until the dedicated user-testing credential is rotated in the approved secret store.
- Authenticated safe configuration and observability summaries were not captured.
- Hosted migration status was not independently rechecked in this audit.
- The existing manual logical database backup is not managed Supabase PITR, and restore has not been proven against the hosted project.
- No live Wio, bank, payment, OCR, email, storage, webhook, telemetry, ZATCA, UAE compliance, or money-movement workflow was tested or enabled.
- `READY` deployment state and smoke responses do not establish production capacity, production recovery, regulatory compliance, or production approval.

## Audit Conclusion

The deployed API and web aliases are reachable, point to the expected `READY` deployments, and pass public health and browser-shell checks. Required Vercel environment variable names are present. The database readiness probe is `ok`.

Overall post-deploy readiness is **PARTIAL PASS** because authenticated feature smoke is blocked by a stale DPAPI-backed user-testing credential. Treat this environment as available for public-shell and API-health review only until credential rotation and authenticated smoke are completed.

No deployment, migration, environment-variable change, Supabase configuration change, provider enablement, provider call, compliance execution, destructive database operation, or money movement occurred during this audit.
