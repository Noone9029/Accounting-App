# UI Redesign Settings Audit Logs Sprint Closure

Branch: `codex/ui-redesign-settings-audit-logs`

## Scope

This frontend-only slice migrates `/settings/audit-logs` onto shared Ledger UI primitives.

## Boundaries preserved

- Audit list filters continue to drive `GET /audit-logs` through the existing query builder.
- Selected audit detail still loads through `GET /audit-logs/:id` and renders sanitized before/after metadata only.
- CSV export still uses the current filters, bearer token, active organization header, and existing filename handling.
- Retention settings remain configuration-only; saving retention settings does not delete audit logs.
- Retention preview remains dry-run only and requires audit retention management permission.
- No backend, schema, provider, storage, accounting, retention purge, export scheduler, or compliance behavior changed.

## Verification

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification audit-logs permissions` - passed, 135 suites / 612 tests.
- `corepack pnpm verify:openbooks-clean-room` - passed, 2071 checked / 0 blocked / 0 forbidden.
- `git diff --check` - passed, with LF-to-CRLF warnings only.
