# Setup Onboarding Route Registry Consumers Evidence

## PR Title

`Use app route registry for setup onboarding navigation`

## Branch

`feature/setup-onboarding-route-registry-consumers`

## Commit

`pending before final commit`

## Scope

- `apps/web/src/lib/setup-onboarding-routes.ts`
- `apps/web/src/lib/setup-onboarding-routes.test.ts`
- `apps/web/src/lib/dashboard.ts`
- `docs/product/SETUP_ONBOARDING_ROUTE_REGISTRY_CONSUMERS.md`
- Status documentation updates

## Adopted Behavior

- Behavior inspiration: setup/onboarding route-registry consumption.
- LedgerByte-native specification: `docs/product/SETUP_ONBOARDING_ROUTE_REGISTRY_CONSUMERS.md`.
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
| `apps/web/src/lib/setup-onboarding-routes.ts` | Adds pure setup/onboarding route helper functions backed by `app-routes.ts`. |
| `apps/web/src/lib/setup-onboarding-routes.test.ts` | Tests active route mapping, planned route exclusion, breadcrumbs, completion destination, missing-key fallback, and production-source clean-room reference scan. |
| `apps/web/src/lib/dashboard.ts` | Uses setup route helpers for setup wizard and dashboard setup destinations while preserving existing copy. |
| `docs/product/SETUP_ONBOARDING_ROUTE_REGISTRY_CONSUMERS.md` | Documents purpose, behavior, active/planned handling, non-goals, validation, and blockers. |
| `docs/development/openbooks-adoption/SETUP_ONBOARDING_ROUTE_REGISTRY_CONSUMERS_EVIDENCE.md` | Records clean-room evidence for this setup/onboarding consumer slice. |
| `docs/IMPLEMENTATION_STATUS.md` | Records implementation status without changing readiness claims. |
| `docs/REMAINING_ROADMAP.md` | Records next roadmap step after this slice. |
| `docs/PROJECT_AUDIT.md` | Records the audit posture update. |
| `docs/PRODUCT_READINESS_SCORECARD.md` | Records the scorecard posture update. |

## Runtime Behavior Changed

`yes`

Setup wizard and dashboard setup helper destinations now consume registry-backed setup route helpers. This is frontend route metadata/helper consumption only. No backend/API behavior, persistence behavior, hosted behavior, provider behavior, storage behavior, or compliance behavior changed.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes`: `failed before implementation as expected; missing ./setup-onboarding-routes`.
- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes setup-wizard`: `passed`.
- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes app-routes sidebar route-load-verification`: `passed`.
- `corepack pnpm verify:openbooks-clean-room`: `passed`.
- `node scripts/openbooks-clean-room-validate.cjs --strict`: `passed`.
- `git diff --check`: `passed`.
- `git diff --cached --check`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this frontend setup route-consumer slice unless scoped validation fails.
- Browser/E2E route walk: not run because the change is pure route metadata/helper consumption covered by focused Jest tests.

## Screenshots/Evidence Captured

- Not applicable; this is a route metadata/helper change covered by unit and component tests.

## Feature Status

`WORKING`

The bounded setup/onboarding route-consumer slice is implemented and covered by focused tests. Broader typed onboarding remains planned.

## Why Broader Typed Onboarding Is Not WORKING Yet

- No persistent typed onboarding backend was implemented.
- No setup checklist database tables, Prisma migrations, or setup checklist state machine were added.
- Inbox, AI proposal review, deterministic bookkeeping pipeline, report packs, integration health, document review, and evidence packs are not implemented by this PR.

## Compliance Claim Scan

- UAE production readiness claimed: `No`
- ZATCA production readiness claimed: `No`
- Peppol production readiness claimed: `No`
- ASP production readiness claimed: `No`
- Notes: setup route helpers only preserve existing local-readiness navigation and do not enable provider or authority workflows.

## Provider/Network Mutation Scan

- Hosted service touched: `No`
- Provider network call made: `No`
- Customer data mutated: `No`
- Notes: frontend metadata/helper changes only; no network or hosted commands.

## Object-Storage/Signed-URL Claim Scan

- Real object storage implemented/proven: `No`
- Signed URLs implemented/proven: `No`
- Generated-document object storage approval status changed: `No`
- Notes: storage route consumption is metadata-only and does not change runtime storage behavior.

## Remaining Blockers

- Broader typed onboarding requires separate LedgerByte-native implementation, tests, and evidence.
- Production readiness remains blocked by the existing hosting, storage, security, compliance, provider, and sign-off gates.

## Next Recommended PR

`Implement LedgerByte-native setup progress metadata refinements`
