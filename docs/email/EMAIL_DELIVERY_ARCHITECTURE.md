# Email Delivery Architecture

Audit date: 2026-05-15

LedgerByte now has email delivery groundwork for organization invitations and password reset, but real provider delivery remains disabled by default. The active default provider is `mock`, which stores delivery records in `EmailOutbox` for local/admin inspection and never sends real email.

## Provider Modes

- `mock`: default mode. Creates `EmailOutbox` records with `SENT_MOCK` status and local preview links where appropriate.
- `smtp-disabled`: production-readiness placeholder. Reports that SMTP delivery is intentionally disabled and never sends email.
- `smtp`: configuration-readiness placeholder. It checks whether SMTP configuration is present, but real network sending is still not implemented in this phase.

The SMTP provider stub must fail safely. Selecting `smtp` without complete configuration returns readiness blockers, and selecting it for actual delivery returns a clear failed delivery result rather than attempting a network call.

## Configuration

Required local/default values:

- `EMAIL_PROVIDER=mock`
- `EMAIL_FROM="no-reply@ledgerbyte.local"`
- `APP_WEB_URL="http://localhost:3000"`

Future SMTP placeholders:

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

## Outbox

`EmailOutbox` is the local delivery audit table for this phase. It stores template type, recipient, sender, subject, body text, status, provider marker, and provider metadata. It is tenant-scoped and permission-gated through `emailOutbox.view`.

Mock outbox bodies can contain local invite/reset preview links. That is useful for development and testing, but it is not a production delivery pattern. Production real-email rollout should either hide sensitive body previews or restrict them to a stronger administrative permission.

## Future Provider Implementation Order

1. Select a transactional provider or SMTP relay.
2. Add provider SDK/client with explicit timeout and retry policy.
3. Add delivery status updates for queued, sent, failed, bounced, and complained messages.
4. Add DKIM/SPF/DMARC/domain verification checks to admin settings.
5. Add a queue/worker for asynchronous sending.
6. Add provider webhook verification for delivery events.
7. Add rate-limit and abuse monitoring dashboards.

## Current Limitations

- Real SMTP/API sending is not implemented.
- No background queue or retry worker exists.
- No bounce, complaint, suppression-list, or provider webhook handling exists.
- No DKIM/SPF/DMARC/domain verification exists.
- No branded HTML template polish exists.
