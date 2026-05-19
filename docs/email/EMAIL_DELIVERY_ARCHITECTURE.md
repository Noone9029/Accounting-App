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
- `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`
- `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`
- `EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED=false`
- `EMAIL_PROVIDER_WEBHOOK_SECRET=""`
- `EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS=""`
- `APP_WEB_URL="http://localhost:3000"`

SMTP configuration:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SECURE`
- `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS`
- `LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS`
- `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`
- `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`
- `EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED=false`
- `EMAIL_PROVIDER_WEBHOOK_SECRET`
- `EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS`

`SMTP_PASSWORD` and `EMAIL_PROVIDER_WEBHOOK_SECRET` must never be logged, returned from an API, stored in frontend bundles, or copied into documentation with a real value.

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
- retry policy, retry processor, retry worker, pending/blocked/suppressed retry counts, bounce webhook, provider event ingestion, signed webhook verification booleans, suppression counts, alert threshold evidence, suppression trend evidence, webhook health evidence, alerting, and monitoring booleans
- redaction guarantees
- mock-mode flag
- real-sending-enabled flag

The endpoint is read-only/no-mutation and does not send email. It does not expose raw SMTP host values, usernames, passwords, API keys, tokens, connection URLs, authorization headers, provider secrets, or message links outside the existing mock outbox behavior.

Production readiness remains blocked until SMTP configuration, sender-domain evidence, non-production relay diagnostics, enabled retry processing, scheduled retry-worker evidence, signed bounce/webhook handling, suppression policy, provider event ingestion, alerting thresholds, and monitoring are all implemented and reviewed.

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

## Retry Processing

`EmailOutbox` now includes durable retry metadata: attempt count, max attempts, next/last attempt timestamps, redacted last error, provider message id, provider event status, delivery/bounce/complaint timestamps, and retry lock metadata.

`GET /email/retry-plan` is read-only/no-mutation and sends no email. It reports pending, retryable failed, blocked, suppressed, active-suppression, and due retry counts plus the max-attempts policy.

`POST /email/retry-process` is disabled by default through `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`. In the default state it returns `SKIPPED_DISABLED`, sends no email, and mutates nothing. When explicitly enabled by an operator, it processes only due retryable records, obeys `maxAttempts` and `nextAttemptAt`, skips active suppressions without calling the provider, updates existing outbox metadata, creates no new outbox record, and returns redacted provider summaries.

`GET /email/retry-worker/plan` is read-only/no-mutation and sends no email. It reports whether a scheduled worker is configured/enabled, the scheduler provider (`NONE` by default), retry processor gate state, pending/due/blocked/suppressed counts, active suppression count, max-attempts policy, blockers, warnings, and a recommended five-minute cadence.

`POST /email/retry-worker/run` is disabled by default through `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`. In the default state it returns `SKIPPED_DISABLED`, sends no email, and mutates nothing. If the worker flag is enabled but the retry processor flag remains disabled, it returns `SKIPPED_PROCESSOR_DISABLED` with no mutation. Only when both worker and retry processor gates are explicitly enabled does it delegate to the existing due-record retry processor, which still respects suppressions and max attempts.

This is not a production scheduler yet. It is a disabled-by-default worker execution shell and plan surface for reliability validation.

## Monitoring Evidence And Alerts

`EmailDeliveryMonitoringEvidence` stores manual, tenant-scoped metadata for delivery monitoring readiness.

- Evidence types: `RETRY_WORKER`, `BOUNCE_ALERTS`, `COMPLAINT_ALERTS`, `SUPPRESSION_TRENDS`, `DELIVERY_DASHBOARD`, `PROVIDER_WEBHOOK_HEALTH`, and `OTHER`.
- Endpoints: `GET /email/monitoring-plan`, `GET /email/monitoring-evidence`, `POST /email/monitoring-evidence`, `POST /email/monitoring-evidence/:id/verify`, and `POST /email/monitoring-evidence/:id/revoke`.
- The evidence workflow sends no email, creates no outbox record, performs no external monitoring call, and stores no customer recipient list or customer email body.
- Evidence rejects SMTP passwords, API keys, tokens, authorization headers, connection URLs, provider secrets, webhook secrets, private DKIM keys, raw provider payloads, customer recipients, and customer message bodies.
- Verified monitoring evidence can move monitoring status to `READY_FOR_REVIEW`, but does not make full email `productionReady=true` while relay, provider, webhook, and worker gates remain blocked.
- Bounce and complaint alert threshold fields remain readiness evidence only; no alert email, webhook, or external monitoring notification is sent by default.

## Provider Events And Bounces

`EmailProviderEvent` stores metadata-only provider event summaries for delivery, bounce, complaint, failed, opened, clicked, and unknown events.

- `GET /email/provider-events/plan` returns provider-event readiness, signed-webhook configuration booleans, bounce handling blockers, alerting/monitoring gaps, and `productionReadyContribution=false`.
- `GET /email/provider-events/webhook-plan` returns a read-only/no-mutation signed-webhook plan. It reports whether verification is enabled, whether a webhook secret and allowed providers are configured, whether any signed event has been verified, and confirms raw headers, raw provider payloads, and webhook secrets are not returned.
- `POST /email/provider-events/webhook` is verification-gated. With `EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED=false` it rejects/skips without persisting events, mutating outbox records, or sending email. When enabled with `EMAIL_PROVIDER_WEBHOOK_SECRET` and allowed providers, it accepts only valid provider-agnostic HMAC test signatures, stores redacted metadata, and never stores raw payloads or headers.
- `POST /email/provider-events/mock` captures local/mock event metadata only and can update existing outbox event timestamps/status fields.
- Mock events reject SMTP credentials, API keys, tokens, authorization headers, connection URLs, provider secrets, private DKIM keys, raw provider payloads, customer recipients, and customer message bodies.
- Mock events are unsigned, so they never make bounce webhooks, monitoring, alerting, or production readiness true.

## Suppression List

`EmailSuppression` stores tenant-scoped suppression metadata for bounced, complained, manual, and provider-event sources.

- Endpoints: `GET /email/suppressions`, `POST /email/suppressions`, and `POST /email/suppressions/:id/revoke`.
- Manual suppression accepts an email for matching, but the response and stored record use `emailHash` plus `emailMasked`; raw suppression emails are not returned.
- Bounce or complaint events create active suppression metadata only for signed webhook events or explicit local/mock provider events.
- Active suppressions block future provider send attempts and enabled retry processing for matched tenant emails.
- Suppression notes must not contain SMTP credentials, API keys, tokens, auth headers, connection URLs, webhook secrets, provider secrets, private DKIM keys, or customer message bodies.

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
2. Replace the generic HMAC test verifier with provider-specific signed webhook adapters and production signature contracts.
3. Replace the disabled worker shell with a real scheduled queue/worker after production gates are approved.
4. Add live DNS/provider verification checks for captured DKIM/SPF/DMARC evidence.
5. Connect rate-limit, bounce, complaint, retry-throughput, suppression-trend, and abuse monitoring dashboards with real alert thresholds.
6. Add production template review and invoice/statement send flows.

## Current Limitations

- Real SMTP sending is implemented but opt-in and not enabled by default.
- No paid/provider-specific API adapter is implemented.
- Retry metadata, a disabled-by-default manual processor, and a disabled-by-default worker shell exist, but no production scheduler exists.
- Provider-agnostic signed webhook verification and suppression metadata exist, but no provider-specific production webhook adapter or real provider signature contract is implemented.
- Monitoring evidence and alert threshold readiness are surfaced, but no external monitoring integration, real alert delivery, or production dashboard connection exists.
- DKIM/SPF/DMARC/domain evidence is metadata-only; no live DNS lookup or provider verification is implemented.
- No branded HTML template polish exists.

Tests run for this phase: targeted API email specs, targeted frontend email specs, typecheck, build, `smoke:accounting`, `git diff --check`, and `git diff --cached --check`.

Recommended next prompt: add provider-specific production webhook adapters and an external monitoring integration runbook for email delivery alerts while keeping real customer sends disabled by default.
