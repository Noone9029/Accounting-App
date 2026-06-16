# Security Settings Route Implementation Plan

Date: 2026-06-17

Objective: plan a real `/settings/security` route using only existing LedgerByte auth, member, role, organization, permission, and audit capabilities. This branch does not implement the route.

## Recommended First Route Scope

The first version should be a read-only Owner-oriented security overview. It should connect existing surfaces instead of inventing new security controls.

Real first-version route:

- Route: `/settings/security`
- Access: authenticated users with an existing admin/settings permission, recommended `users.view` plus `roles.view` plus `auditLogs.view` for the full Owner view.
- Restricted behavior: users without required permissions see the existing access-denied pattern or a reduced read-only panel if product decides to allow partial access.
- Data sources: `/auth/me`, `/organization-members`, `/roles`, `/audit-logs`, `/audit-logs/retention-settings`, `/organizations/:id`, and existing client permission context.
- Linked surfaces: `/settings/team`, `/settings/roles`, `/settings/audit-logs`, `/setup`, and `/organization/setup`.

## Section Plan

### Account Security

- Purpose: show the current account identity and organization context.
- User-facing copy: "Signed in as {name} ({email}). Security controls use your current organization role and permissions."
- Required permissions: authenticated user; no mutation permission for the identity summary.
- Backend/API dependency: `/auth/me`.
- Data model dependency: `User`, active `OrganizationMember`, `Role`.
- Frontend components needed: account identity summary, active organization summary, role chip.
- Empty/loading/error states: loading profile, no active organization, unable to load profile.
- Dangerous actions: none in Phase A.
- Audit events required: none for read-only load.
- Test plan: unit test for profile rendering and missing organization state.
- Visual QA plan: Owner, Accountant, Viewer at `1440x1000`, `1024x768`, and `390x844`.
- Known limitations: no persisted session/device data.

### Password And Sign-In

- Purpose: truthfully point users to existing password reset while avoiding unsupported controls.
- User-facing copy: "Password reset is available through the existing reset flow. In-app password change requires a separate backend implementation."
- Required permissions: authenticated user.
- Backend/API dependency: existing `/auth/password-reset/request` and `/auth/password-reset/confirm`; no new endpoint in Phase A.
- Data model dependency: `AuthToken` with `PASSWORD_RESET` purpose and `AuthTokenRateLimitEvent`.
- Frontend components needed: reset guidance card and link to `/password-reset`.
- Empty/loading/error states: static guidance only.
- Dangerous actions: none in Phase A.
- Audit events required: existing reset request/completion events remain owned by the reset flow.
- Test plan: web unit test verifies no unsupported password-change form is present.
- Visual QA plan: assert copy is conservative and no fake controls appear.
- Known limitations: authenticated password-change control is absent.

### Active Sessions

- Purpose: avoid misleading users while recording the gap.
- User-facing copy: "Device/session management is not available in this release."
- Required permissions: none beyond route access if shown as a limitation.
- Backend/API dependency: future persisted session model and endpoints.
- Data model dependency: future session or refresh-token table.
- Frontend components needed: limitation notice only, or omit this card until Phase B.
- Empty/loading/error states: not applicable in Phase A.
- Dangerous actions: revoke current device, revoke other devices, and logout-all are blocked until backend support exists.
- Audit events required: future session revoke/login/logout events.
- Test plan: forbidden-control test verifies no session revoke action exists.
- Visual QA plan: assert no unsupported session controls are visible.
- Known limitations: no source-backed active session list exists today.

### Security Activity

- Purpose: surface security-adjacent events already captured by audit logs.
- User-facing copy: "Review login, password reset, invite, member, role, and retention changes in Audit logs."
- Required permissions: `auditLogs.view`; export remains `auditLogs.export`.
- Backend/API dependency: `/audit-logs` with filters and `/audit-logs/retention-settings`.
- Data model dependency: `AuditLog`, `AuditLogRetentionSettings`.
- Frontend components needed: recent activity list or shortcut card; link to `/settings/audit-logs`.
- Empty/loading/error states: no events found, unable to load activity, retention settings unavailable.
- Dangerous actions: none in Phase A; audit retention changes remain on `/settings/audit-logs`.
- Audit events required: existing auth/member/role events are sufficient for first version.
- Test plan: API/web tests for filtered audit-log rendering if a summary list is added.
- Visual QA plan: long actor names, long event labels, empty activity state.
- Known limitations: no dedicated login-history endpoint exists.

### Team Access Overview

- Purpose: show member access posture without duplicating the Team Members route.
- User-facing copy: "Manage invites, roles, and suspended access from Team Members."
- Required permissions: `users.view`; management actions remain on `/settings/team` behind `users.manage` and `users.invite`.
- Backend/API dependency: `/organization-members`.
- Data model dependency: `OrganizationMember`, `MembershipStatus`, `User`, `Role`.
- Frontend components needed: counts for active, invited, suspended, and long-name-safe member preview.
- Empty/loading/error states: no members, unable to load members.
- Dangerous actions: no suspend/reactivate/invite actions in Phase A; link to Team Members.
- Audit events required: existing member invite/status/role events.
- Test plan: permission tests for Owner/Accountant/Viewer summary visibility.
- Visual QA plan: long emails and role chips on mobile.
- Known limitations: no last-active/session timestamp exists.

### Roles And Permissions

- Purpose: link users to existing role controls and summarize risky access.
- User-facing copy: "Review system roles and custom permission sets from Roles & Permissions."
- Required permissions: `roles.view`; mutations remain behind `roles.manage`.
- Backend/API dependency: `/roles`.
- Data model dependency: `Role.permissions`, `Role.isSystem`.
- Frontend components needed: role count, system-role count, custom-role count, full-access role note.
- Empty/loading/error states: no roles, unable to load roles.
- Dangerous actions: no create/edit/delete role actions in Phase A; link to role route.
- Audit events required: existing role create/update/delete events.
- Test plan: role summary unit tests and permission matrix link tests.
- Visual QA plan: long custom role names and permission group summaries.
- Known limitations: route should not duplicate the full permission matrix.

### Organization Security Posture

- Purpose: connect security posture to organization setup completeness without inventing certification.
- User-facing copy: "Keep organization profile, roles, and setup checklist current for controlled-beta review."
- Required permissions: `organization.view`; update links rely on `organization.update`.
- Backend/API dependency: `/organizations/:id`, `/dashboard/onboarding-checklist` if setup status is displayed.
- Data model dependency: `Organization`, active membership, setup checklist response.
- Frontend components needed: profile completeness card and setup shortcut.
- Empty/loading/error states: no active organization, setup checklist unavailable.
- Dangerous actions: none in Phase A.
- Audit events required: existing organization update event.
- Test plan: organization profile missing-field copy tests.
- Visual QA plan: long legal names, trade names, TRN/TIN labels, and mobile wrapping.
- Known limitations: no `/settings/organization` route exists today.

### Audit Log Shortcut

- Purpose: make the audit trail easy to reach from security settings.
- User-facing copy: "Open Audit logs to inspect security-adjacent and operational events with sanitized metadata."
- Required permissions: `auditLogs.view`.
- Backend/API dependency: existing audit route.
- Data model dependency: `AuditLog`.
- Frontend components needed: shortcut card and optional last event timestamp.
- Empty/loading/error states: no audit events yet.
- Dangerous actions: CSV export remains on `/settings/audit-logs` and behind `auditLogs.export`.
- Audit events required: none for shortcut render.
- Test plan: link target test.
- Visual QA plan: route link remains real and mobile-friendly.
- Known limitations: no separate incident dashboard exists.

## Explicit Prohibitions

- Do not claim MFA availability until real MFA backend and UI exist.
- Do not claim SSO availability until real SSO backend and UI exist.
- Do not expose active-session revocation until a persisted session/revocation backend exists.
- Do not add security certification, threat-monitoring, or production security guarantee wording.
- Do not add API-token creation, rotation, or revocation controls until a real API-token backend exists.
- Do not add password-change controls until authenticated password-change backend support exists.
- Do not imply provider, ASP, ZATCA, Peppol, storage, or archive certification from this route.

## Implementation Phases

### Phase A: Read-Only Security Overview

- Build `/settings/security` as a read-only route.
- Use existing team, role, organization, and audit data.
- Add conservative cards and real links only.
- Gate the route with existing permissions.
- Add web unit tests and visual QA.

### Phase B: Account/Session Actions

- Start only if a real persisted session or refresh-token backend is designed and implemented.
- Add session list, current device, revoke-device, and logout-all semantics only after audit events and token invalidation rules exist.

### Phase C: Password Controls

- Start only if an authenticated password-change endpoint exists.
- Require current password verification, rate limits, audit events, error states, and token invalidation policy.

### Phase D: MFA, SSO, And API Tokens

- Start only after explicit backend design, data model changes, migrations, tests, and security review.
- Include recovery flows, admin policy, audit events, and rollback plan before UI work.

### Phase E: Visual QA And Permission Matrix

- Add route visual QA for `/settings/security`, `/settings`, `/settings/team`, `/settings/roles`, and `/settings/audit-logs`.
- Check Owner, Accountant, and Viewer.
- Check desktop `1440x1000`, tablet `1024x768`, and mobile `390x844`.
- Run forbidden-copy scans that reject fake security/provider/compliance claims.

## Route And Action Consistency Plan

- `/settings`: if it remains a redirect, do not add a fake settings-card link in this branch. If a settings overview returns later, link its Security card to the real `/settings/security` route only after implementation.
- `/settings/team`: keep invite, role change, suspend, and reactivate actions behind existing `users.invite` and `users.manage` behavior.
- `/settings/roles`: keep create/edit/delete behind `roles.manage`; system roles remain protected.
- `/settings/audit-logs`: keep export behind `auditLogs.export` and retention updates behind `auditLogs.manageRetention`.
- `/setup`: link for setup posture only; do not imply security completion.
- `/organization/setup`: use for existing organization setup/update flow where permissions allow.
- Sidebar/topbar: add a Security link only if the route exists and route permission mapping is updated.
- Mobile behavior: cards stack, long emails and organization names wrap, action buttons remain clear and not over-prominent.
- Access denied: Accountant and Viewer should follow existing permission behavior and must not see Owner-only mutation controls.

## Future Test And Verification Plan

- API tests if new backend support is added.
- Web unit tests for read-only summary cards and permission gating.
- Permission tests for Owner, Accountant, and Viewer.
- Visual QA route matrix:
  - `/settings/security`
  - `/settings`
  - `/settings/team`
  - `/settings/roles`
  - `/settings/audit-logs`
- Viewports:
  - `1440x1000`
  - `1024x768`
  - `390x844`
- Roles:
  - Owner
  - Accountant
  - Viewer
- Audit-event tests for any future mutation.
- Forbidden-copy scan for fake security, provider, certification, ASP, ZATCA, Peppol, and production guarantee claims.

## Known Limitations

- The first route should be a truth-first overview, not a security control center.
- There is no real `/settings/security` route yet.
- There is no real `/settings/sessions`, `/settings/api`, `/settings/integrations`, or `/settings/organization` route today.
- The existing `/settings` route redirects to `/settings/team`.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- ZATCA remains parked and preserved outside this work.
