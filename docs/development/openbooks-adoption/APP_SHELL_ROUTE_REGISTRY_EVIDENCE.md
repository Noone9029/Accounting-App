# App Shell Route Registry Evidence

## PR Title

`Add LedgerByte app shell route registry`

## Branch

`feature/ledgerbyte-app-shell-route-registry`

## Commit

`pending before final commit`

## Scope

- `apps/web/src/lib/app-routes.ts`
- `apps/web/src/lib/app-routes.test.ts`
- `apps/web/src/lib/sidebar-nav.ts`
- `apps/web/src/components/app-shell/sidebar.tsx`
- `docs/product/APP_SHELL_ROUTE_REGISTRY.md`
- Status documentation updates

## Adopted Behavior

- Behavior inspiration: central route registry for shell navigation metadata.
- LedgerByte-native specification: `docs/product/APP_SHELL_ROUTE_REGISTRY.md`.
- OpenBooks source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBooks code copied.
- [x] No OpenBooks schema copied.
- [x] No OpenBooks comments copied.
- [x] No OpenBooks UI text copied.
- [x] No OpenBooks file names, function names, or implementation structure copied.
- [x] No OpenBooks dependency added.
- [x] No OpenBooks source fetched, vendored, imported, translated, ported, or reused.
- [x] Production source does not reference OpenBooks.
- [x] Implementation is LedgerByte-native and follows approved docs/specs.

## Files Changed

| File | Purpose |
| --- | --- |
| `apps/web/src/lib/app-routes.ts` | Adds typed LedgerByte route metadata and active/mobile/section lookup helpers. |
| `apps/web/src/lib/app-routes.test.ts` | Covers uniqueness, active helper behavior, planned capability exclusion, route-family coverage, sensitivity tags, and production-source clean-room reference scan. |
| `apps/web/src/lib/sidebar-nav.ts` | Derives the existing sidebar tree from registry route keys while preserving legacy labels and edition-aware compliance children. |
| `apps/web/src/components/app-shell/sidebar.tsx` | Derives the mobile workflow strip from `getMobileShellRoutes()`. |
| `docs/product/APP_SHELL_ROUTE_REGISTRY.md` | Documents purpose, route families, planned handling, mobile visibility, non-goals, validation, and blockers. |
| `docs/development/openbooks-adoption/APP_SHELL_ROUTE_REGISTRY_EVIDENCE.md` | Records clean-room evidence for this registry implementation. |
| `docs/IMPLEMENTATION_STATUS.md` | Records implementation status without changing readiness claims. |
| `docs/REMAINING_ROADMAP.md` | Records next roadmap step after the registry. |
| `docs/PROJECT_AUDIT.md` | Records the audit posture update. |
| `docs/PRODUCT_READINESS_SCORECARD.md` | Records the scorecard posture update. |

## Runtime Behavior Changed

`yes`

The app shell sidebar and mobile first-workflow strip now read route metadata from a LedgerByte-native registry. No backend/API behavior, persistence behavior, hosted behavior, provider behavior, storage behavior, or compliance behavior changed.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/web test -- app-routes`: `failed before implementation as expected; missing ./app-routes`.
- `corepack pnpm --filter @ledgerbyte/web test -- app-routes sidebar`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- app-routes sidebar route-load-verification`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- app-routes`: `passed`.
- `corepack pnpm verify:openbooks-clean-room`: `passed`.
- `node scripts/openbooks-clean-room-validate.cjs --strict`: `passed`.
- `git diff --check`: `passed`.
- `git diff --cached --check`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this frontend route registry slice unless scoped validation fails.
- Browser/E2E route walk: not run because the change is metadata/sidebar wiring covered by focused Jest tests.

## Screenshots/Evidence Captured

- Not applicable; this is a route metadata and navigation helper change covered by unit tests.

## Feature Status

`PARTIAL`

The bounded LedgerByte route registry and shell/mobile wiring are implemented and tested. Broader planned app capabilities remain planned or blocked.

## Why Feature Is Not WORKING Yet

- Exception inbox, AI proposal review, deterministic bookkeeping pipeline, report packs, integration health, document review, and evidence packs are not implemented by this PR.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Compliance Claim Scan

- UAE production readiness claimed: `No`
- ZATCA production readiness claimed: `No`
- Peppol production readiness claimed: `No`
- ASP production readiness claimed: `No`
- Notes: registry sensitivity flags are informational only and do not enable provider or authority workflows.

## Provider/Network Mutation Scan

- Hosted service touched: `No`
- Provider network call made: `No`
- Customer data mutated: `No`
- Notes: frontend metadata only; no network or hosted commands.

## Object-Storage/Signed-URL Claim Scan

- Real object storage implemented/proven: `No`
- Signed URLs implemented/proven: `No`
- Generated-document object storage approval status changed: `No`
- Notes: storage-sensitive routes are tagged, but runtime generated-document storage remains unchanged.

## Remaining Blockers

- Planned route families require separate LedgerByte-native implementation, tests, and evidence.
- Production readiness remains blocked by the existing hosting, storage, security, compliance, provider, and sign-off gates.

## Next Recommended PR

`Implement LedgerByte-native setup/onboarding route registry consumers`
