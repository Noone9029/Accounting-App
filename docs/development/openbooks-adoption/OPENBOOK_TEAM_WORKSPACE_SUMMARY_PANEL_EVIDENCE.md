# OpenBook Team Workspace Summary Panel Evidence

## Scope

- Adds a standalone `TeamWorkspaceSummaryPanel` web component for read-only team membership and role posture review.
- Adds web types for the read-only team workspace summary response shape.
- Adds focused component tests for render behavior and guardrail wording.

## Source Reuse

- No OpenBook source code is copied in this slice.
- The slice applies the roadmap idea of safer team and organization UX to LedgerByte's existing UI primitives.

## Guardrails

- No route wiring, API client call, invite flow, join request, email sending, role change, status change, ownership transfer, or organization switch is introduced.
- No hosted mutation is introduced.
- No storage-provider, VAT, ZATCA, UAE, Peppol, ASP, or production-readiness claim is introduced.
- The component intentionally renders aggregate counts, role names, and guardrail text only; it does not render member email addresses.

## Focused Checks

- `corepack pnpm --filter @ledgerbyte/web test -- team-workspace-summary-panel` - passed
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed
- `corepack pnpm verify:openbooks-clean-room` - passed
- `git diff --check` - passed

## Next Slice

After the read-only backend team workspace summary endpoint merges, wire this panel into the team settings page using the real LedgerByte API response and existing permission model.
