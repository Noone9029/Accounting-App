# UI Redesign Settings ZATCA Sprint Closure

Branch: `codex/ui-redesign-settings-zatca`

## Scope

This frontend-only slice migrates the main `/settings/zatca` shell, edition guard, status states, adapter summary, SDK readiness panel, and empty states toward shared Ledger UI primitives.

## Boundaries preserved

- ZATCA remains visible only in the KSA edition.
- Local generation and SDK validation wording remains preparation-only.
- The page still states that ZATCA production compliance is not enabled and that no invoice submission, production credentials, CSID request, signing, clearance, reporting, PDF/A-3, or real network call is enabled by default.
- Existing profile, EGS, CSR, CSID custody, SDK readiness, hash-chain reset, storage evidence, checklist, XML mapping, and submission-log request handlers were not changed.
- No backend, schema, provider, SDK execution, network, signing, reporting, PDF/A-3, key custody, CSID, compliance, or production behavior changed.

## Verification

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.
- `corepack pnpm --filter @ledgerbyte/web test -- settings/zatca route-load-verification permissions` - passed, 3 suites / 26 tests.
- `corepack pnpm --filter @ledgerbyte/web test` - passed, 135 suites / 612 tests.
- `corepack pnpm verify:openbooks-clean-room` - passed, 2074 checked / 0 blocked / 0 forbidden.
- `git diff --check` - passed, with LF-to-CRLF warnings only.
