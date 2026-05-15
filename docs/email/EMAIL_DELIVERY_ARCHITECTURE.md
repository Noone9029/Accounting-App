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
- `APP_WEB_URL="http://localhost:3000"`

SMTP configuration:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`

`SMTP_PASSWORD` must never be logged, returned from an API, stored in frontend bundles, or copied into documentation with a real value.

## Readiness Endpoint

`GET /email/readiness` returns a redacted operational view:

- active provider
- ready/not-ready flag
- blocking reasons
- warnings
- from email
- SMTP configuration booleans
- mock-mode flag
- real-sending-enabled flag

The endpoint does not expose raw SMTP host values, usernames, passwords, tokens, or message links outside the existing mock outbox behavior.

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
4. Add DKIM/SPF/DMARC/domain verification checks to admin settings.
5. Add a queue/worker for asynchronous sending.
6. Add provider webhook verification for delivery events.
7. Add rate-limit and abuse monitoring dashboards.

## Current Limitations

- Real SMTP sending is implemented but opt-in and not enabled by default.
- No paid/provider-specific API adapter is implemented.
- No background queue or retry worker exists.
- No bounce, complaint, suppression-list, or provider webhook handling exists.
- No DKIM/SPF/DMARC/domain verification exists.
- No branded HTML template polish exists.
