# UI Redesign Settings Compliance Security Sprint Closure

Branch: `codex/ui-redesign-settings-compliance-security`

## Scope

This frontend-only slice migrates the settings security and compliance readiness routes onto shared Ledger UI primitives:

- `/settings/security`
- `/settings/compliance`

## Boundaries preserved

- Security settings remain read-only and do not expose fake MFA, SSO, API-token, session-revoke, logged-in password-change, email-verification, or configurable notification controls.
- Security shortcuts still point only at existing routes: team, roles, audit logs, setup, and organization setup.
- Compliance readiness keeps edition gating and does not surface UAE eInvoicing controls outside the UAE-enabled edition.
- UAE readiness fields continue to call the existing organization update helper only when the role has organization update permission.
- Compliance wording still states that no ASP, FTA, ZATCA, signing, clearance, reporting, or provider network call is enabled by default.
- No backend, schema, provider, network, compliance, ZATCA, ASP, FTA, signing, reporting, or production behavior changed.

## Verification

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- route-load-verification settings/compliance settings/security compliance permissions` - passed, 135 suites / 612 tests.
- `corepack pnpm verify:openbooks-clean-room` - passed, 2073 checked / 0 blocked / 0 forbidden.
- `git diff --check` - passed, with LF-to-CRLF warnings only.
