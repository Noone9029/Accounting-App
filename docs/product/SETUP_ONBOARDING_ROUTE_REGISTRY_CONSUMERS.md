# Setup Onboarding Route Registry Consumers

## Purpose

LedgerByte setup/onboarding now consumes the app route registry for setup wizard destinations where it is safe to do so. This keeps setup links aligned with `apps/web/src/lib/app-routes.ts` while preserving existing setup copy, local-readiness wording, and the read-only checklist posture.

## What Was Implemented

- Added `apps/web/src/lib/setup-onboarding-routes.ts` as a pure TypeScript consumer of the app route registry.
- Added setup route helper coverage for navigation items, breadcrumbs, completion destination, checklist-item route mapping, active-route filtering, and missing-route fallback.
- Updated `apps/web/src/lib/dashboard.ts` so setup wizard step action hrefs and dashboard setup routes are derived from registry-backed setup route helpers.
- Preserved the existing setup wizard labels, action labels, and safe explanations.

## Registry Consumption

The setup/onboarding helper reads active route definitions from `app-routes.ts` and returns setup-specific metadata for:

- Guided setup.
- Organization profile.
- VAT/tax profile.
- First customer.
- First invoice.
- Bank/payment method.
- First payment.
- First report.
- Compliance readiness visibility.
- Storage readiness.

Create-invoice and customer-payment setup links keep the existing `returnTo=/setup` behavior while using registry route hrefs as their base destination.

## Active Route Handling

Only routes with `capabilityStatus: "active"` are returned by setup/onboarding helpers. Missing route keys return `null`, and setup completion continues to point to the active dashboard destination.

## Planned And Future Route Handling

Planned route families such as Inbox, AI proposal review, report packs, integration health, and document review remain excluded from active setup navigation. Broader typed onboarding remains planned and is not implemented by this slice.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production source setup/onboarding route consumers do not reference OpenBooks.

## Non-Goals

- No full typed onboarding backend was implemented.
- No persistent setup checklist database tables or Prisma migrations were added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No API runtime behavior, hosted deployment behavior, provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior was added.
- No UAE, ZATCA, Peppol, ASP, provider, storage, or compliance readiness status changed.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes setup-wizard`
- `corepack pnpm --filter @ledgerbyte/web test -- setup-onboarding-routes app-routes sidebar route-load-verification`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding, persistent checklist state, and setup state-machine behavior remain planned.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Next Recommended PR

`Implement LedgerByte-native setup progress metadata refinements`
