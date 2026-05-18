# Email Delivery Architecture

Audit date: 2026-05-16

LedgerByte now has email delivery groundwork for organization invitations, password reset, and opt-in SMTP delivery. Real provider delivery remains disabled by default. The active default provider is `mock`, which stores delivery records in `EmailOutbox` for local/admin inspection and never sends real email.

## Provider Modes

- `mock`: default mode. Creates `EmailOutbox` records with `SENT_MOCK` status and local preview links where appropriate.
- `smtp-disabled`: production-readiness placeholder. Reports that SMTP delivery is intentionally disabled and never sends email.
- `smtp`: real SMTP adapter. It is only used when explicitly selected and complete SMTP configuration is present.

The SMTP provider must fail safely. Selecting `smtp` without complete configuration returns readiness blockers and failed test-send outbox records. Provider errors are stored as safe summaries without SMTP secrets.

## Configuration

Required local/default values:

- `EMAIL_PROVIDER=mock`
- `EMAIL_FROM="no-reply@ledgerbyte.local"`
- `EMAIL_REPLY_TO=""`
- `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=false`
- `APP_WEB_URL="http://localhost:3000"`

SMTP configuration:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`
- `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS`
- `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`

`SMTP_PASSWORD` must never be logged, returned from an API, stored in frontend bundles, or copied into documentation with a real value.

## Readiness Endpoint

`GET /email/readiness` returns a redacted operational view:

- active provider
- ready/not-ready flag
- blocking reasons
- warnings
- from email
- from/reply-to configured booleans
- SMTP configuration booleans
- production-ready flag
- diagnostics execution gate
- diagnostics plan fields for allowlisted recipients/domains and non-production relay testing
- sender-domain readiness for SPF, DKIM, and DMARC metadata evidence
- relay diagnostics status
- bounce webhook, retry policy, and monitoring booleans
- redaction guarantees
- mock-mode flag
- real-sending-enabled flag

The endpoint is read-only/no-mutation and does not send email. It does not expose raw SMTP host values, usernames, passwords, API keys, tokens, connection URLs, authorization headers, provider secrets, or message links outside the existing mock outbox behavior.

Production readiness remains blocked until SMTP configuration, sender-domain evidence, non-production relay diagnostics, bounce handling, retries, and monitoring are all implemented and reviewed.

## Sender-Domain Evidence

`EmailSenderDomainEvidence` stores manual, tenant-scoped metadata for sender-domain authentication review.

- Evidence types: `SPF`, `DKIM`, `DMARC`, `MX`, `RETURN_PATH`, `PROVIDER_VERIFICATION`, and `OTHER`.
- Endpoints: `GET /email/sender-domain-evidence`, `POST /email/sender-domain-evidence`, `POST /email/sender-domain-evidence/:id/verify`, and `POST /email/sender-domain-evidence/:id/revoke`.
- The evidence workflow sends no email, creates no outbox record, performs no DNS-provider action, and stores no customer email body.
- Secret-bearing values are rejected, including SMTP passwords, usernames when submitted as sensitive keys, API keys, tokens, authorization headers, connection URLs, provider secrets, and private DKIM keys.
- Verified SPF/DKIM/DMARC evidence can move sender-domain status to `READY_FOR_REVIEW`, but does not make full email `productionReady=true` while relay, bounce, retry, and monitoring gaps remain.

## Safe Diagnostics

`POST /email/diagnostics` returns a diagnostic plan/status without creating outbox records.

- Default `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=false`: returns `SKIPPED_DISABLED`, `executionAttempted=false`, `noEmailSent=true`, `noCustomerEmailSent=true`, and `noMutation=true`.
- `GET /email/diagnostics-plan` exposes the same no-send plan for settings UI use.
- Enabled mode requires a request recipient and an allowlist match through `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS` or `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`.
- Diagnostic subjects/bodies are test-only and contain no tenant records or business data.
- Responses mask recipients and return redacted delivery summaries only.

## Test Send

`POST /email/test-send` creates a `TEST_EMAIL` outbox record through the active provider:

- mock mode records `SENT_MOCK`
- smtp-disabled records a safe failed no-send attempt
- smtp mode sends through SMTP when readiness is complete and records `SENT_PROVIDER`
- failed provider sends record `FAILED` with a safe error summary

## Outbox

`EmailOutbox` is the delivery audit table for this phase. It stores template type, recipient, sender, subject, body text, status, provider marker, and provider metadata. It is tenant-scoped and permission-gated through `emailOutbox.view`.

Mock outbox bodies can contain local invite/reset preview links. That is useful for development and testing, but it is not a production delivery pattern. Production real-email rollout should either hide sensitive body previews or restrict them to a stronger administrative permission.

## Future Provider Implementation Order

1. Add provider-specific API adapters if SMTP is not sufficient.
2. Add explicit timeout and retry policy around provider sends.
3. Add delivery status updates for queued, sent, failed, bounced, and complained messages.
4. Add live DNS/provider verification checks for captured DKIM/SPF/DMARC evidence.
5. Add a queue/worker for asynchronous sending.
6. Add provider webhook verification for delivery events.
7. Add rate-limit and abuse monitoring dashboards.

## Current Limitations

- Real SMTP sending is implemented but opt-in and not enabled by default.
- No paid/provider-specific API adapter is implemented.
- No background queue or retry worker exists.
- No bounce, complaint, suppression-list, or provider webhook handling exists.
- DKIM/SPF/DMARC/domain evidence is metadata-only; no live DNS lookup or provider verification is implemented.
- No branded HTML template polish exists.
