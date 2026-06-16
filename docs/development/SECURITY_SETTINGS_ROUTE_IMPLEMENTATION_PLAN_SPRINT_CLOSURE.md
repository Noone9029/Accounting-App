# Security Settings Route Implementation Plan Sprint Closure

Date: 2026-06-17

## Summary

- PR `#62` (`Owner security and organization settings visual QA`) was merged safely into `main` with merge commit `1fcbdce4da80341a58098070e34e2e37ef616fa1`.
- Added a docs-only, source-backed implementation plan for a future real `/settings/security` route.
- Added a capability inventory for current auth, member, role, organization, permission, token, rate-limit, and audit-log capabilities.
- No `/settings/security` route was implemented in this branch.

## Source-Backed Findings

- Implemented today: login, registration, `/auth/me`, JWT bearer auth, password reset tokens, invite tokens, invite acceptance, token cleanup, token-delivery rate-limit events, team member listing, invite flow, role/status updates, roles and permissions, organization setup/update, audit logs, audit export, and audit retention preview/settings.
- Partially implemented today: local web logout, token-based sign-in state, login-history evidence through audit logs, organization profile setup, and audit retention configuration.
- Not implemented today: persisted active sessions, refresh tokens, session revoke, logout-all, MFA, SSO, API-token management, logged-in password change, email verification, and security notification preferences.
- Unknown/source not found: configurable security notifications and account-level data export/delete controls.

## Recommended First Route

- Build `/settings/security` first as a read-only security overview using existing APIs.
- Include current account identity, password reset guidance, team access summary, role/permission summary, security activity/audit shortcut, organization setup posture, and links to real settings routes.
- Exclude unsupported session, MFA, SSO, API-token, and password-change controls until backend support exists.

## Routes And Surfaces Covered By Planning

- `/settings`
- `/settings/team`
- `/settings/roles`
- `/settings/roles/[id]`
- `/settings/audit-logs`
- `/setup`
- `/organization/setup`
- Future planned route: `/settings/security`

## Routes Skipped Because They Do Not Exist

- `/settings/security`
- `/settings/sessions`
- `/settings/api`
- `/settings/integrations`
- `/settings/organization`
- `/organization`
- `/settings/users`

`/settings/zatca` exists but was not expanded because this branch is not ZATCA work.

## Safety Boundaries

- Documentation/planning only.
- No backend API change.
- No frontend route implementation.
- No Prisma schema change.
- No migration.
- No seed/reset/delete.
- No hosted/customer data mutation.
- No auth/session/security business logic change.
- No password, MFA, SSO, session-management, or API-token implementation.
- No accounting, UAE PINT-AE, ZATCA, provider, ASP, email, Vercel, Supabase, or production infrastructure change from the docs branch itself.
- No production security claim was added.
- No fake security, SSO, MFA, API-token, provider, storage, archive, certification, or production compliance claim was added.

## Verification

Expected branch verification:

- `corepack pnpm verify:diff`
- `corepack pnpm verify:ci:local`
- `git diff --check`
- `git diff --cached --check`
- Forbidden-claim scan over changed docs for active unsupported security claims.

## Provider And ZATCA Status

- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- ZATCA remains parked and preserved.
- The ZATCA request-body stash remains preserved and was not restored, dropped, overwritten, or mixed into this branch.

## Remaining UI Migration And Security Scope

- Implement real `/settings/security` Phase A as read-only overview in a future branch.
- Add visual QA after the route exists.
- Add persisted sessions, password controls, MFA, SSO, or API-token management only after explicit backend design, migrations, tests, and security review.
- Keep organization/security wording conservative until legal/security review confirms stronger claims.
