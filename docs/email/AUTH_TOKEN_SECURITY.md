# Auth Token Security

Audit date: 2026-05-16

LedgerByte invitation and password-reset links use short-lived raw tokens that are only shown in generated mock/local links. The database stores SHA-256 token hashes in `AuthToken`; it does not store raw tokens.

## Token Purposes

- `ORGANIZATION_INVITE`: used for invited-user onboarding, expires after 7 days.
- `PASSWORD_RESET`: used for password reset confirmation, expires after 1 hour.

Both token types are single-use. Consuming a token sets `consumedAt`, and consumed tokens cannot be reused.

## Rate Limits

Rate-limit evidence is stored in `AuthTokenRateLimitEvent`, which is database-backed so it works across multiple app instances better than in-memory counters.

Password reset request limits:

- maximum 3 requests per email per hour
- maximum 10 requests per IP address per hour when IP metadata is available
- blocked password reset requests still return the same generic success message to avoid account enumeration

Organization invite limits:

- maximum 5 invites per email per hour per organization
- maximum 50 invites per organization per day
- blocked invite requests return a clear authenticated admin error because the endpoint is already permission-gated

## Cleanup

`POST /auth/tokens/cleanup-expired` deletes expired, unconsumed tokens older than 30 days for the active organization. It does not delete active tokens and does not immediately delete consumed-token history.

This endpoint is an operational helper, not a background scheduler. A future production rollout should move token cleanup to a scheduled job or queue worker.

## Account Enumeration Protection

`POST /auth/password-reset/request` always returns:

`If an account exists, password reset instructions have been sent.`

If the email does not belong to a user, no token or email is created, but the response is unchanged. If rate limits are reached, the response is also unchanged.

## Outbox Visibility Risk

Mock/local `EmailOutbox` records can include preview links in the email body. That is useful for development smoke tests, but it must remain admin-only and should not be treated as production-safe customer support tooling.

SMTP mode can send invite and password-reset links externally when explicitly enabled. Token hashing and expiry rules are unchanged; only delivery routing changes. The SMTP readiness and test-send surfaces never expose `SMTP_PASSWORD`.

## Future Hardening

- Add MFA.
- Add refresh-token rotation or session invalidation after password reset.
- Add CAPTCHA or stronger abuse controls if public password-reset traffic grows.
- Add audit dashboards for invite/password-reset volume.
- Add provider webhook verification and suppression-list handling.
- Add background email queueing and retry controls before high-volume use.
