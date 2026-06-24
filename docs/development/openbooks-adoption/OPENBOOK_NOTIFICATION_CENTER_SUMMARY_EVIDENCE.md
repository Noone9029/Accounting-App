# OpenBook Notification Center Summary Evidence

## PR Title

`Add notification center summary API`

## Branch

`codex/openbook-notification-center-summary`

## Commit

`pending before final commit`

## Scope

- `apps/api/src/email/email.controller.ts`
- `apps/api/src/email/email.service.ts`
- `apps/api/src/email/email.controller.spec.ts`
- `apps/api/src/email/email.service.spec.ts`
- `docs/development/openbooks-adoption/OPENBOOK_NOTIFICATION_CENTER_SUMMARY_EVIDENCE.md`

## Adopted Behavior

- Behavior inspiration: OpenBook-style notification-center overview for reminders and delivery status.
- LedgerByte-native implementation: a read-only email notification summary API backed by existing LedgerByte outbox, provider-event, and suppression metadata.
- OpenBook source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBook code copied.
- [x] No OpenBook schema copied.
- [x] No OpenBook comments copied.
- [x] No OpenBook UI text copied.
- [x] No OpenBook file names, function names, or implementation structure copied.
- [x] No OpenBook dependency added.
- [x] No OpenBook source fetched, vendored, imported, translated, ported, or reused in this slice.
- [x] Production source does not reference OpenBook.
- [x] Implementation uses LedgerByte email outbox, provider event, suppression, tenant, and permission boundaries.

## Files Changed

| File | Purpose |
| --- | --- |
| `apps/api/src/email/email.controller.ts` | Adds `GET /email/notification-center-summary` guarded by `emailOutbox.view`. |
| `apps/api/src/email/email.service.ts` | Adds a metadata-only, read-only summary over outbox statuses, due retries, provider events, suppressions, and recent items. |
| `apps/api/src/email/email.controller.spec.ts` | Verifies the endpoint requires email outbox view permission. |
| `apps/api/src/email/email.service.spec.ts` | Verifies tenant-scoped summary counts, metadata-only recent item selection, and no provider/send/mutation/audit side effects. |
| `docs/development/openbooks-adoption/OPENBOOK_NOTIFICATION_CENTER_SUMMARY_EVIDENCE.md` | Records guardrails and verification for this adoption slice. |

## Runtime Behavior Changed

`yes`

The API now exposes a read-only notification center summary endpoint for existing LedgerByte email metadata. It does not send email, call a provider, run retries, create outbox records, update outbox records, update suppressions, process webhooks, change storage behavior, or change compliance behavior.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/api test -- email`: `passed`.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: `passed`.
- `corepack pnpm verify:openbooks-clean-room`: `passed`.
- `git diff --check`: `passed`.
- `git diff --cached --check`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this narrow email API summary slice unless focused checks fail.
- Browser/visual checks: not applicable because this slice has no frontend surface.

## Feature Status

`PARTIAL`

Notification-center summary metadata is available through a read-only API. Customer-facing collection workflows, reminder UI, notification center UI, explicit audited reminder actions, and provider sending remain separate future slices.

## Provider/Network Mutation Scan

- Hosted service touched: `No`.
- Provider network call made: `No`.
- Customer email sent: `No`.
- Email retry run: `No`.
- Outbox/suppression/provider-event mutation added: `No`.

## Compliance Claim Scan

- UAE production readiness claimed: `No`.
- ZATCA production readiness claimed: `No`.
- Peppol production readiness claimed: `No`.
- ASP/provider-network readiness claimed: `No`.
- Notes: this endpoint reports email metadata only and makes no compliance readiness claim.

## Object-Storage/Signed-URL Claim Scan

- Real object storage implemented/proven: `No`.
- Signed URLs implemented/proven: `No`.
- Generated-document object storage approval status changed: `No`.

## Remaining Blockers

- Notification center UI remains unimplemented.
- Collection reminder candidate review and explicit reminder actions remain separate future work.
- Provider sending, hosted jobs, and production readiness remain blocked until separately approved and proven.

## Next Recommended PR

`Add notification center UI consumption for the read-only summary endpoint`
