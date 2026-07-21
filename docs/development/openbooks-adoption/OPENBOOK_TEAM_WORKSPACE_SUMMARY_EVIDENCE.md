# OpenBook Team Workspace Summary Evidence

## Scope

This slice adds `GET /organization-members/workspace-summary` as a read-only team and organization review endpoint inspired by OpenBook organization/team management workflows.

The endpoint summarizes current LedgerByte organization memberships by status, role distribution, and existing last-admin guardrails. It gives the UI a compact source for team workspace review without changing any team state.

## Source Posture

- OpenBook source reuse: none.
- Adopted idea: make team membership and role posture easier to review before administrative action.
- LedgerByte sources of truth: existing `OrganizationMember`, `Role`, and permission model.
- Attribution impact: no copied OpenBook code or assets were introduced.

## Guardrails

- Read-only endpoint only.
- Tenant-scoped by `organizationId`.
- Permission-gated with `users.view`, matching existing member read routes.
- No invite, join request, email, role change, membership status change, ownership transfer, or organization switch is performed.
- No provider, storage, VAT, ZATCA, UAE, Peppol, or production-readiness action or claim is made.
- Existing service safeguards for last active full-access and user-manager members remain unchanged.

## Verification

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- organization-member`
