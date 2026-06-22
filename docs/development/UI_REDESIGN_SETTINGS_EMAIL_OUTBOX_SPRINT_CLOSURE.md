# UI Redesign Settings Email Outbox Sprint Closure

Branch: `codex/ui-redesign-settings-email-outbox`

## Scope

This frontend-only slice migrates `/settings/email-outbox` toward the shared Ledger UI system.

## Boundaries preserved

- Email outbox reads still use `/email/outbox` and selected detail still uses `/email/outbox/:id`.
- Provider readiness, sender-domain evidence, delivery monitoring evidence, suppression, retry-plan, worker-plan, monitoring-plan, provider-event, webhook-plan, diagnostics, and expired-token cleanup controls keep their existing request handlers.
- Diagnostics remain disabled/safe unless server-side diagnostics are explicitly enabled and the recipient is allowlisted.
- Evidence and monitoring forms remain metadata-only and continue warning against secrets, credentials, provider tokens, webhook secrets, raw payloads, recipient lists, and customer message bodies.
- Suppression controls continue to store masked/hashed email metadata only.
- No backend, schema, provider, scheduler, worker, live SMTP, webhook, monitoring, storage, compliance, or production email behavior changed.

## Verification

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification email permissions` - passed, 135 suites / 612 tests.
- `corepack pnpm verify:openbooks-clean-room` - passed, 2072 checked / 0 blocked / 0 forbidden.
- `git diff --check` - passed, with LF-to-CRLF warnings only.
