# OpenBook AI Proposal Boundary Evidence

## Scope

- Adds `GET /automation/proposal-boundary` as a read-only API surface for proposal-only automation and AI guardrails.
- Adds a small Nest module, controller, service, and focused API tests.
- Documents the endpoint in the API catalog.

## Source Reuse

- No OpenBook source code is copied in this slice.
- This slice adopts the product boundary idea that automation and AI may prepare proposals, but must not be authoritative posting or provider actors.

## Guardrails

- The endpoint requires authentication, active organization context, and `dashboard.view`.
- The endpoint is read-only and does not call Prisma, email, provider, storage, bank-feed, tax-network, ZATCA, UAE, Peppol, or hosted-system mutation paths.
- The response sets automation authority to disabled, requires human confirmation, and requires tenant/permission/fiscal-lock/audit checks before any future confirmed mutation.
- The response does not return secrets, customer document bodies, raw provider payloads, executable instructions, or production-readiness claims.

## Focused Checks

- `corepack pnpm --filter @ledgerbyte/api test -- automation-proposal-boundary` - passed
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed
- `corepack pnpm verify:openbooks-clean-room` - passed
- `git diff --check` - passed

## Next Slice

Add a web settings/readiness panel for this boundary after the API slice lands, or keep working through the independent OpenBook adoption PR queue until prerequisite endpoints merge.
