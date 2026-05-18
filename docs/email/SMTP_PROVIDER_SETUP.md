# SMTP Provider Setup

Audit date: 2026-05-16

LedgerByte supports an opt-in SMTP adapter for transactional emails. The default provider remains `mock`, so local development, tests, and smoke runs do not require SMTP credentials and do not send real email.

## Provider Modes

- `EMAIL_PROVIDER=mock`: default. Records email in `EmailOutbox` with `SENT_MOCK`; no external send.
- `EMAIL_PROVIDER=smtp-disabled`: no-send mode for readiness review. Test sends create safe failed outbox records instead of connecting to SMTP.
- `EMAIL_PROVIDER=smtp`: real SMTP send mode. Requires complete SMTP configuration.

## Required Env Vars For SMTP

```bash
EMAIL_PROVIDER=smtp
EMAIL_FROM="no-reply@example.com"
EMAIL_REPLY_TO="support@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_SECURE="false"
LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED="false"
LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS=""
LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS="example.test,ledgerbyte.local"
LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED="false"
```

Never commit real SMTP credentials. `SMTP_PASSWORD` is not returned by readiness APIs and must not be logged.

## Sender-Domain Evidence

Before production review, capture metadata-only evidence for the sender domain:

- SPF
- DKIM
- DMARC

Use `/settings/email-outbox` or the `/email/sender-domain-evidence` endpoints to create draft evidence, then verify or revoke it after review. Do not paste DNS provider secrets, SMTP usernames/passwords, API keys, tokens, authorization headers, connection URLs, provider secrets, raw private DKIM keys, or customer email content.

This is manual evidence capture only. LedgerByte does not perform live DNS lookups or provider verification yet.

## Testing Safely

Use a sandbox SMTP service such as Mailtrap, Resend SMTP, or another provider test mailbox before using production sender domains. Verify:

- `GET /email/readiness` shows `ready: true` and `realSendingEnabled: true`.
- `GET /email/readiness` shows sender-domain SPF/DKIM/DMARC status, relay diagnostics status, and `productionReady=false` until relay diagnostics, domain evidence, bounces, retries, and monitoring are all ready.
- `GET /email/diagnostics-plan` reports whether diagnostics execution is enabled, whether allowlisted recipients/domains are configured, and that no customer email/no mutation is the default.
- Default `POST /email/diagnostics` returns `SKIPPED_DISABLED`, sends no email, and creates no outbox record.
- `GET /email/retry-plan` reports retry counts and max-attempts policy without sending email or mutating data.
- Default `POST /email/retry-process` returns `SKIPPED_DISABLED`, sends no email, and mutates nothing because `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`.
- `GET /email/provider-events/plan` reports mock-only event readiness; unsigned mock events do not make bounce/webhook or monitoring production-ready.
- If diagnostics sending is explicitly enabled, use only an allowlisted sandbox recipient; responses mask the recipient and return a redacted delivery summary.
- `POST /email/test-send` still creates an `EmailOutbox` record with `SENT_PROVIDER` when explicitly used against a configured SMTP relay.
- The provider message id is stored when the SMTP relay returns one.
- Failed sends store a safe failure summary without credentials.

## Current Limitations

- Retry metadata and a disabled-by-default manual processor exist, but no scheduled background worker.
- Mock bounce/complaint/provider event capture exists, but no signed production webhook or suppression-list handling.
- DKIM/SPF/DMARC evidence is metadata-only; no live DNS or provider validation workflow is implemented.
- No invoice/statement email sending yet.
- Mock remains the default and should remain active for tests/smoke.
