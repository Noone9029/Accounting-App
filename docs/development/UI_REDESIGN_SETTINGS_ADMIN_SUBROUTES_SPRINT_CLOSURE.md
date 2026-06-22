# UI Redesign Settings Admin Subroutes Sprint Closure

Branch: `codex/ui-redesign-settings-admin-subroutes`

## Scope

This frontend-only slice migrates the remaining admin-heavy settings routes below onto the shared Ledger UI primitives:

- `/settings/team`
- `/settings/roles`
- `/settings/roles/:id`
- `/settings/number-sequences`
- `/settings/banking-accounting`

## Boundaries preserved

- Team invites still write to the mock email outbox; no real email sending or provider delivery was added.
- Team role/status actions keep the existing `/organization-members` PATCH payloads and beta suspension guidance.
- Role creation, role detail editing, system-role protection, delete blocking, and the permission matrix contract were preserved.
- Number sequence edits still affect future documents only; existing document numbers are not renumbered.
- Banking accounting settings remain manual-only and do not add live bank feeds, bank credentials, provider callbacks, automatic posting, or conversion of existing deposit/card/cheque records.
- No backend, schema, accounting, compliance, storage, provider, or posting behavior changed.

## Verification

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification settings/team settings/roles settings/banking-accounting number-sequences permissions` - passed, 6 suites / 32 tests.
- `corepack pnpm --filter @ledgerbyte/web test` - passed, 135 suites / 612 tests.
- `corepack pnpm verify:openbooks-clean-room` - passed, 2070 checked / 0 blocked / 0 forbidden.
- `git diff --check` - passed, with LF-to-CRLF warnings only.

## Remaining Settings Work

- `/settings/audit-logs`
- `/settings/email-outbox`
- `/settings/compliance`
- `/settings/zatca`
- `/settings/security`
