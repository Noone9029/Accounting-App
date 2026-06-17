# Security Settings Capability Inventory

Date: 2026-06-17

Scope: source-backed inventory for a future real `/settings/security` route. This is a planning artifact only. It does not implement a route, backend endpoint, schema change, migration, auth/session change, security feature, provider integration, or production security claim.

## Source Files Inspected

- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth-token.service.ts`
- `apps/api/src/auth/auth-token-rate-limit.service.ts`
- `apps/api/src/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/auth/guards/organization-context.guard.ts`
- `apps/api/src/auth/guards/permission.guard.ts`
- `apps/api/src/auth/auth.types.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/auth/dto/register.dto.ts`
- `apps/api/src/auth/dto/password-reset-request.dto.ts`
- `apps/api/src/auth/dto/password-reset-confirm.dto.ts`
- `apps/api/src/auth/dto/accept-invitation.dto.ts`
- `apps/api/src/organization-members/organization-member.controller.ts`
- `apps/api/src/organization-members/organization-member.service.ts`
- `apps/api/src/roles/role.controller.ts`
- `apps/api/src/roles/role.service.ts`
- `apps/api/src/organizations/organization.controller.ts`
- `apps/api/src/organizations/organization.service.ts`
- `apps/api/src/audit-log/audit-log.controller.ts`
- `apps/api/src/audit-log/audit-log.service.ts`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/permissions.ts`
- `apps/web/src/components/permissions/permission-provider.tsx`
- `apps/web/src/components/forms/auth-form.tsx`
- `apps/web/src/components/app-shell/topbar.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(auth)/password-reset/page.tsx`
- `apps/web/src/app/(auth)/password-reset/confirm/page.tsx`
- `apps/web/src/app/(auth)/invite/accept/page.tsx`
- `apps/web/src/app/(app)/settings/page.tsx`
- `apps/web/src/app/(app)/settings/team/page.tsx`
- `apps/web/src/app/(app)/settings/roles/page.tsx`
- `apps/web/src/app/(app)/settings/roles/[id]/page.tsx`
- `apps/web/src/app/(app)/settings/audit-logs/page.tsx`
- `apps/web/src/app/(app)/setup/page.tsx`
- `apps/web/src/app/(app)/organization/setup/page.tsx`
- Related tests under `apps/api/src/auth`, `apps/api/src/organization-members`, `apps/api/src/roles`, `apps/api/src/audit-log`, `apps/web/src/app/(app)/settings/team`, `apps/web/src/app/(app)/settings/roles`, `tests/e2e`, and `tests/visual`.

## Inventory

| Capability | Status | Source-backed evidence | Truthful UI posture |
| --- | --- | --- | --- |
| Login | Implemented | `POST /auth/login` validates email/password with bcrypt and returns a JWT access token. Successful login writes `AUTH_LOGIN` when the user has an active organization. | The UI can show current sign-in account metadata and last security events from audit logs where available. |
| Logout | Partially implemented | Web `clearSession()` removes local token and active organization id. No backend logout endpoint was found. | The UI can offer local sign-out only; it must not describe server-side session invalidation. |
| JWT/session model | Partially implemented | `JwtAuthGuard` verifies a bearer JWT using `JWT_SECRET`; web stores the token in localStorage. No persisted session model was found in Prisma. | The first route can show token-based sign-in state, not a device/session inventory. |
| Refresh tokens | Not implemented | No refresh token model, controller, or service was found. | Do not expose refresh-token controls. |
| Password reset | Implemented | `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `AuthToken`, and `AuthTokenRateLimitEvent` support reset tokens, expiry, consumption, rate limiting, and audit events. | The UI can link to the existing password reset flow and mention reset availability. |
| Logged-in password change | Not implemented | No authenticated password-change endpoint or current-password verification flow was found. | Do not show a password-change form until backend support exists. |
| Email verification | Not implemented | No email verification token purpose or endpoint was found. | Do not claim verified-email enforcement. |
| Organization invite acceptance | Implemented | Organization-member invite creates an `ORGANIZATION_INVITE` auth token and the invite accept endpoint activates the invited member. | The route can link to Team Members and summarize invite status from existing team data. |
| Invite rate limiting | Implemented | `AuthTokenRateLimitService.assertInviteAllowed` limits invite attempts per email and organization. | Can be documented as an existing guard; do not present it as a user-configurable setting. |
| Password reset rate limiting | Implemented | `AuthTokenRateLimitService.registerPasswordResetAttempt` limits reset attempts by email and IP. | Can be documented as an existing guard; no UI toggle exists. |
| Team member management | Implemented | `GET /organization-members`, role updates, status updates, and invites are guarded by `users.view`, `users.manage`, and `users.invite`. | First route can link to `/settings/team` and summarize user access posture. |
| Suspended/inactive members | Implemented | `OrganizationMember.status` supports `ACTIVE`, `INVITED`, and `SUSPENDED`; service prevents removing last full-access or user-manager path. | Show counts/statuses if data is already loaded through team APIs. |
| Role and permission management | Implemented | `GET/POST/PATCH/DELETE /roles`, system-role protection, permission validation, and last-full-access protection exist. | First route can link to `/settings/roles` and summarize role risk. |
| Organization profile | Partially implemented | `GET/PATCH /organizations/:id` and `/organization/setup` exist; there is no `/settings/organization` route. | Link to `/organization/setup` or existing organization setup affordance only. |
| Audit logs | Implemented | `/audit-logs`, CSV export, retention settings, retention preview, sanitized metadata, and multiple auth/member/role events exist. | First route can link to `/settings/audit-logs` and show security activity shortcuts. |
| Audit retention settings | Partially implemented | Retention settings and preview exist; service states automatic purge execution is not implemented. | Show configuration/dry-run status only; do not imply purge execution. |
| Login history | Partially implemented | `AUTH_LOGIN` audit events exist when an active organization is present. No dedicated login-history endpoint exists. | A security activity panel can link to filtered audit logs, not a full login-history product. |
| Security event logging | Partially implemented | Auth login, password reset request/completion, invite accepted, member invite/status/role, and role create/update/delete audit events are present. | Use audit logs as the source of security-adjacent activity. |
| Active sessions list | Not implemented | No Prisma `Session` model or sessions controller was found. | Do not show a session/device table in the first route. |
| Session revoke | Not implemented | No persisted session/revocation model or endpoint was found. | Do not show revoke-current-device, revoke-other-device, or logout-all controls. |
| MFA | Not implemented | No MFA model, endpoint, UI, or permission was found. | Do not expose MFA status or setup controls. |
| SSO | Not implemented | No SSO provider, organization SSO config, endpoint, or UI was found. | Do not expose SSO status or setup controls. |
| API tokens | Not implemented | No user API token model, endpoint, or UI was found. | Do not expose token creation, rotation, or revocation controls. |
| Security notifications | Unknown / source not found | Mock email invite/reset delivery exists, but no configurable security notification surface was found. | Do not add notification preferences until the product surface exists. |
| Rate limiting visibility | Partially implemented | Auth-token rate-limit events exist internally. No admin UI or reporting endpoint was found. | Mention only as internal guard evidence, not as configurable dashboard data. |
| Data export/delete controls | Unknown / source not found | Audit CSV export exists. No account/security data export or deletion controls were found. | Do not include account deletion or export controls in first route. |
| Storage/security evidence | Do not expose in UI yet | Storage/document evidence is separate from account security and not a security settings capability. | Keep storage evidence in storage/document settings, not `/settings/security`. |

## What The UI Can Truthfully Show Today

- Current authenticated user identity from `/auth/me`.
- Active organization and role/permission context from `/auth/me` and the permission provider.
- Security-adjacent shortcuts to real routes: `/settings/team`, `/settings/roles`, `/settings/audit-logs`, `/setup`, and `/organization/setup`.
- Read-only summaries for members, invited/suspended access, roles, system-role protection, audit retention configuration, and recent security-adjacent audit events if existing APIs are used.
- Existing password reset flow availability as a link or guidance item.
- Conservative copy that token-based sign-in is currently backed by a bearer JWT and local browser storage.

## What Cannot Be Claimed Or Shown Yet

- Stored active sessions or device management.
- Server-side logout or revoke-all behavior.
- MFA availability.
- SSO availability.
- User API-token management.
- Logged-in password-change control.
- Verified-email enforcement.
- Full login-history product beyond audit-log events.
- Threat-monitoring, certification, or production security guarantees.
- Provider, ASP, ZATCA, storage, or compliance certification status.

## Missing Backend/API Capabilities

- Persisted session or refresh-token model.
- Session list and revoke endpoints.
- Authenticated password-change endpoint with current-password verification.
- MFA enrollment, challenge, recovery, and audit model.
- SSO organization configuration model and auth flow.
- User API token model with scoped permissions, hashing, last-used metadata, rotation, and revocation.
- Dedicated security overview endpoint if the frontend should avoid multiple round trips.
- Security notification preferences and delivery policy.

## Missing Frontend Capabilities

- `/settings/security` route.
- Security overview components.
- Permissioned links from `/settings` or settings card surfaces if a settings overview is restored.
- Loading/empty/error states for security overview data.
- Visual QA matrix for `/settings/security` after route implementation.
- Forbidden-claim tests for security route copy.

## Security-Sensitive Risks

- Current access tokens are stored in browser localStorage; a security route should avoid overpromising protection until storage/session strategy is reviewed.
- A revoke button would be misleading without persisted sessions or token invalidation support.
- Password-change UX should not be added without current-password verification, token invalidation decisions, rate limiting, audit events, and tests.
- MFA, SSO, and API-token features require explicit backend design and security review before any UI affordance appears.
- Audit logs include IP/user-agent fields when captured, but read-only audit access is not a dedicated incident-response product.

## Recommended Phased Implementation

1. Phase A: read-only security overview from existing auth/team/roles/audit/organization data.
2. Phase B: account/session actions only after real session backend support exists.
3. Phase C: password controls only after authenticated password-change backend support exists.
4. Phase D: MFA, SSO, and API-token support only after explicit backend design, migrations, tests, and security review.
5. Phase E: visual QA and permission matrix across Owner, Accountant, and Viewer profiles.
