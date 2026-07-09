# LedgerByte Final User-Testing Authenticated Smoke Evidence

Date: 2026-07-10

Status: **PASS for the bounded hosted user-testing deployment and authenticated GET/read-only smoke scope.**

This document completes the user-testing follow-up to [USER_TESTING_POST_DEPLOY_READINESS_20260710.md](./USER_TESTING_POST_DEPLOY_READINESS_20260710.md). It is beta/user-testing evidence only. It is not production readiness, production recovery, managed PITR, provider-operation, regulatory-compliance, or money-movement proof.

## Scope And Source

- Application source commit deployed to the API: `3fab3ebb979252c9e1f068a9c94809ca33565ebf`
- Source branch at deployment: clean `main`, equal to `origin/main`
- Hosted Supabase user-testing project: `xynelbjqcmbgtscfmmzv`
- Environment classification: hosted user-testing/beta, not production
- Supabase migrations: previously applied; Prisma previously reported the schema up to date
- Migrations rerun during this arc: none
- Vercel environment-variable changes: none
- Supabase configuration changes: none

## Deployment Evidence

| Component | Stable alias | Deployment URL | Deployment ID | State |
| --- | --- | --- | --- | --- |
| API | `https://ledgerbyte-api-test.vercel.app` | `https://ledgerbyte-api-test-fnsrp62ju-ahmad-khalid-s-projects.vercel.app` | `dpl_AW8tEk16Srj8wNHsN9gsD1x4WL68` | `READY` |
| Web | `https://ledgerbyte-web-test.vercel.app` | `https://ledgerbyte-web-test-8c8pu9a0a-ahmad-khalid-s-projects.vercel.app` | `dpl_AuLPhqjhznsqCBDEXRZNWLEtbtRa` | `READY` |

Only the API was redeployed because the repair and cookie-session changes did not modify web application source. The canonical API alias was explicitly assigned to the new READY deployment. The existing READY web deployment remained on its stable alias.

## API Public Smoke

| Route | HTTP | Result |
| --- | ---: | --- |
| `GET /` | 200 | PASS |
| `GET /health` | 200 | PASS |
| `GET /readiness` | 200 | PASS; database readiness remained `ok` |

## Smoke Credential Repair

The guarded hosted user-testing repair matched exactly one existing smoke user and verified the expected active organization membership. It replaced only that user's password hash using bcrypt cost 12 and revoked active sessions for that user in the same transaction. Zero active sessions required revocation. The local current-user DPAPI credential store was updated and verified.

The repair did not create a user or organization, change accounting data, run migrations, alter provider configuration, or expose the password, hash, database URL, token, or cookie value.

## Cookie And Session Fix

The initial deployed diagnosis showed:

- `POST /auth/login`: 201
- exact approved `Access-Control-Allow-Origin`
- `Access-Control-Allow-Credentials: true`
- host-only `Secure; SameSite=Lax` auth and CSRF cookies
- browser stored neither cookie
- `GET /auth/me`: 401 with no Cookie request header

The API now defaults production-like auth and CSRF cookies to host-only `Secure; SameSite=None; Path=/`. The auth cookie remains `HttpOnly`; the CSRF cookie remains readable for the existing double-submit CSRF contract. Explicit configured SameSite policies still take precedence. Exact credentialed CORS and unsafe-request CSRF enforcement were not widened or disabled.

After deployment, the normal browser flow proved:

- `POST /auth/login`: 201
- auth cookie stored: yes
- CSRF cookie stored: yes
- `/auth/me` request included a Cookie header: yes
- `GET /auth/me`: 200
- dashboard redirect completed: yes
- expected active organization selected: yes
- browser page exceptions: 0
- browser console errors: 0

No bearer-token interception was used for this final smoke.

## Authenticated Web Route Smoke

| Route | HTTP | Result |
| --- | ---: | --- |
| `/dashboard` | 200 | PASS |
| `/document-inbox` | 200 | PASS |
| `/settings/payments` | 200 | PASS |
| `/settings` | 200 | PASS |
| `/settings/bank-integrations` | 200 | PASS |
| `/purchases/supplier-payout-requests` | 200 | PASS |
| `/settings/api-docs` | 200 | PASS |
| `/settings/webhooks` | 200 | PASS |
| `/reports` | 200 | PASS |
| `/report-packs` | 200 | PASS |
| `/settings/email-outbox` | 200 | PASS |
| `/settings/import-export` | 200 | PASS |

## Authenticated API GET Smoke

| Route | HTTP | Result |
| --- | ---: | --- |
| `GET /auth/me` | 200 | PASS |
| `GET /document-inbox` | 200 | PASS |
| `GET /payments/provider-readiness` | 200 | PASS |
| `GET /system/config-readiness` | 200 | PASS |
| `GET /diagnostics/observability-readiness` | 200 | PASS |
| `GET /bank-integrations/readiness` | 200 | PASS |
| `GET /bank-integrations/vendor-payment-requests` | 200 | PASS |
| `GET /public-api/v1/readiness` | 200 | PASS |
| `GET /webhooks/readiness` | 200 | PASS |
| `GET /reports/report-pack` | 200 | PASS |
| `GET /email/invoice-payment/readiness` | 200 | PASS |
| `GET /migration-toolkit/templates` | 200 | PASS |

## Safety And Limitations

- This is hosted user-testing/beta evidence, not production proof.
- Hosted migration status was not rerun; this document relies on the previously recorded up-to-date result.
- The existing manual logical backup is not managed Supabase PITR. Managed PITR remains unverified, and hosted restore remains unproven.
- The authenticated browser proof covered login and GET/read-only surfaces only. Financial and other mutating workflows were intentionally not exercised.
- Live Wio, bank, payment, OCR, email, storage, webhook-delivery, telemetry, ZATCA, and UAE compliance providers remain disabled and were not called.
- No payment link, bank sync, payout release, email send, OCR extraction, storage write, import commit, compliance execution, or money movement occurred.
- Cookie behavior was verified with the current automated Chromium runtime. Browser privacy policies that block cross-site cookies may require a shared-site/custom-domain or same-origin proxy architecture before production use.

## Conclusion

The canonical API and web aliases resolve to READY deployments. Public API health/readiness passes, normal browser cookie authentication completes, `/auth/me` returns 200 after UI login, the dashboard loads as authenticated, and every requested protected GET/read-only web and API surface passed without browser runtime or console errors.

The bounded LedgerByte hosted user-testing deployment-readiness arc is complete. These results must not be presented as production approval, managed recovery proof, live-provider proof, compliance certification, or money-movement proof.
