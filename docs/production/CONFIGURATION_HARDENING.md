# Production Configuration Hardening

Date: 2026-07-08

LedgerByte now validates production-sensitive API configuration at startup. The checks are conservative and fail closed in production-like modes (`staging`, `beta`, and `production`) when local, mock, weak, or ambiguous settings are present.

## Runtime Modes

- `APP_ENV` or `NODE_ENV` must be explicitly set.
- Supported app environments are `local`, `test`, `staging`, `beta`, and `production`.
- `staging`, `beta`, and `production` are production-like for safety checks.
- If both `APP_ENV` and `NODE_ENV` are set, they must not classify different safety modes.

## Required Production-Like Values

- `DATABASE_URL` must be a valid remote PostgreSQL URL. Localhost, SQLite, and file databases are blocked.
- `JWT_SECRET` must be configured, at least 32 characters, and not a default/example/local placeholder.
- `AUTH_COOKIE_SECURE` must not be `false`.
- `CORS_ORIGIN` must be explicit and must not contain wildcards.

## Forbidden Production-Like Values

- `LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER=MOCK`
- `LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED=true`
- `EMAIL_PROVIDER=mock`
- Fake local object-storage adapters such as `local-placeholder`
- `AUTH_COOKIE_SECURE=false`
- wildcard `CORS_ORIGIN`
- `LEDGERBYTE_API_DOCS_ENABLED=true` unless `LEDGERBYTE_API_DOCS_PUBLIC_APPROVED=true`
- `LEDGERBYTE_OBSERVABILITY_DIAGNOSTICS_PUBLIC=true`
- `LEDGERBYTE_LOCAL_BACKUP_RESTORE_APPROVAL` present in production-like modes
- Sentry or OpenTelemetry enabled without the required provider endpoint/DSN

## Provider Safety Matrix

| Surface | Default | Local/test-only modes | Production-like rule |
| --- | --- | --- | --- |
| OCR provider | `NONE` | `MOCK` | `MOCK` is blocked; no live OCR is enabled by this change. |
| Payment/Stripe | disabled | mock links | mock links are blocked; payment links require explicit Stripe secret and webhook configuration before enabled mode is accepted. |
| Object storage | database/local metadata | local placeholder adapters | fake local adapters are blocked; S3 config is reported only as readiness metadata. |
| Bank integration | disabled placeholder | manual/local import only | live bank integration remains disabled and unproven. |
| Email provider | `smtp-disabled` | `mock` | mock is blocked; SMTP requires credentials if selected. |
| Telemetry | disabled | disabled | Sentry/OTel are disabled unless explicitly enabled and configured. |

## Readiness Endpoint

`GET /system/config-readiness` is authenticated, organization-context guarded, and permission-gated with audit-retention administration permission. It reports only safe categories:

- app environment and production-like classification
- database target class, not the database URL
- cookie, CORS, provider, API docs, diagnostics, telemetry, and backup/restore drill readiness
- blockers and warnings without secret values

The endpoint must not return raw environment values, database URLs, JWT secrets, cookies, Stripe secrets, webhook secrets, storage keys, OCR keys, email credentials, private keys, CSID-like material, API keys, provider payloads, document bodies, PDFs, or XML bodies.

## Startup Summary

API startup emits a structured config readiness summary with category statuses only. It does not print raw environment values or secret material.

Example failure categories:

- `JWT_SECRET must be strong and must not use default/example values in production-like modes.`
- `DATABASE_URL must not point at localhost in production-like modes.`
- `CORS_ORIGIN must be explicit and must not include wildcards in production-like modes.`
- `API docs cannot be publicly exposed in production-like modes without explicit approval.`

## Still Unproven

This hardening does not prove hosted production deployment, hosted backup/PITR, object-storage recovery, live payment processing, live OCR, live Wio or bank integrations, live email delivery, external telemetry delivery, ZATCA/UAE compliance, legal retention, or approved RPO/RTO.

Secret rotation, provider credential custody, hosted incident response, and production evidence review remain operational requirements outside this local code change.
