# Beta Access Management

Date: 2026-05-22

Status: user-testing guidance only. This document does not change auth architecture, production security posture, Supabase RLS, runtime database roles, Vercel environment variables, or deployment configuration.

## Purpose

Use this workflow to invite and manage a small controlled group of LedgerByte beta testers in the user-testing environment. The first beta group should be limited to 3-5 selected testers so feedback can be triaged without exposing production data or creating unclear access ownership.

Vercel is beta/user-testing only, not final production hosting.

## Who Should Be Invited

Invite only people who can give focused feedback on the current beta scope:

- Business owner or operations reviewer who can judge first-use clarity.
- Accountant or bookkeeper reviewer who can judge terminology and statements.
- Internal product/support reviewer who can observe workflow friction.
- One technical reviewer for browser/device and privacy feedback.

Do not invite broad public users, production customers, or anyone who needs real production accounting output.

## Current Access Model

Existing LedgerByte access surfaces:

- `/settings/team` lists organization members, sends mock/local invites, changes member roles, and suspends/reactivates members.
- `/settings/roles` lists system/custom roles and allows custom role creation when the user has role management permission.
- `/settings/roles/:id` shows the permission matrix for a role.
- `POST /organization-members/invite` creates an invited membership and mock/local invite outbox record.
- `PATCH /organization-members/:id/role` changes a member role.
- `PATCH /organization-members/:id/status` suspends or reactivates access.
- `POST /auth/invitations/:token/accept` lets an invited user set a password and activate membership.

Real customer email sending is not enabled by default. Invite delivery is mock/local unless a later approved email plan changes it.

## Recommended Beta Roles

Default to the least access needed for the testing script:

| Tester type | Recommended role | Notes |
| --- | --- | --- |
| Read-only walkthrough or accountant readability review | `Viewer` | Safest external default. Can inspect ledgers, reports, documents, and settings visibility without posting. |
| Sales workflow tester | `Sales` or a custom scoped role | Use only in a dummy beta organization. Avoid full admin access. |
| Purchases/AP workflow tester | `Purchases` or a custom scoped role | Use only in a dummy beta organization. |
| Accountant workflow tester who must post/review broader workflows | `Accountant` | Assign only to trusted beta reviewers because this role can perform broad accounting workflow actions. |
| Internal administrator managing testers | `Owner` or `Admin` | Keep internal. Do not assign to external beta testers unless explicitly approved. |

For mixed workflow testing, prefer a custom `Beta Workflow Tester` role with only the permissions needed for the assigned script. Do not add `admin.fullAccess` or broad settings permissions for external testers.

## Beta Organization Labels

Use explicit names so beta data is easy to identify:

- `Beta Test - <Tester Initials> - <YYYY-MM>`
- `Beta Accountant Review - <Reviewer Initials> - <YYYY-MM>`
- `Internal QA Beta - <Workflow> - <YYYY-MM>`

The organization should contain dummy data only. Do not reuse production company names, customer names, supplier names, document numbers, bank references, or real tax identifiers.

## Invite Workflow

1. Confirm the tester is approved for the beta window.
2. Confirm which workflow the tester will run.
3. Create or select a beta/test organization.
4. Open `/settings/team`.
5. Choose the least-privilege role for the test.
6. Send the mock/local invite.
7. Share access instructions through the approved channel without exposing tokens in public tickets or docs.
8. Ask the tester to accept the invite, set their own password, and confirm they can reach the expected organization.

Do not share a common password between testers. Do not send database URLs, Vercel tokens, Supabase keys, API keys, auth headers, cookies, or raw invite tokens in public channels.

## Tester Instructions To Include

Before testing starts, tell testers:

- Use dummy customers, suppliers, invoices, bank files, documents, and references only.
- Do not upload real bank statements, payroll files, contracts, IDs, customer documents, or supplier documents.
- Do not use production invoices or real tax documents.
- Do not treat beta reports, PDFs, statements, or ledgers as legal/tax/accounting evidence.
- No real ZATCA submission, CSID execution, clearance/reporting, PDF/A-3, or production compliance certification is enabled.
- No live bank feed or external bank aggregation is enabled.
- Real customer email sending is not enabled by default.
- Screenshots and videos must be redacted before sharing.

## Password Reset

Use the existing password-reset flow when a tester forgets their password. Do not send or store tester passwords manually.

Safe handling:

- Ask the tester to request password reset through the beta web flow.
- If mock/local email is active, an authorized admin can inspect the mock email outbox for the reset link.
- Do not paste reset links into public tickets.
- Do not commit reset links, tokens, or screenshots containing tokens.

## Revoking Access

At the end of the beta session:

1. Open `/settings/team`.
2. Find the tester membership.
3. Set status to `SUSPENDED`.
4. Confirm the tester no longer appears as active.
5. Record revocation in the beta access log or feedback tracker.
6. Keep the dummy beta data for triage until the product owner approves cleanup.

Suspending the tester is preferred over deleting records because it preserves audit history and feedback context.

## Rotating Access

For another beta round:

- Review whether the tester still needs access.
- Reactivate only during the scheduled beta window.
- Re-check the role before reactivation.
- Downgrade to `Viewer` when active workflow posting is no longer needed.
- Suspend again after the review window closes.

## Tester-Reported Data Cleanup

Do not reset, seed, delete, or destructively clean data during beta access management.

Recommended process:

1. Record the cleanup request in the feedback tracker.
2. Confirm whether the data is dummy data and whether it is needed for a bug investigation.
3. If cleanup is needed, prepare a reviewed cleanup plan with object counts and affected organization only.
4. Run cleanup only after explicit approval.
5. Preserve audit and generated-document evidence unless a reviewed deletion policy says otherwise.

## What Not To Share With Testers

Never share:

- Database URLs or direct database credentials.
- Supabase service role keys.
- Vercel tokens or environment variables.
- API keys, auth headers, cookies, JWTs, invite tokens, or password reset tokens.
- ZATCA certificates, private keys, CSID material, signed XML, QR payloads, or compliance secrets.
- Real customer/vendor data, production documents, raw bank files, attachment bodies, or PDF bodies.
- Backup/restore credentials or operational runbooks that expose secrets.

## Admin Checklist

- [ ] Tester is approved and assigned to a specific beta workflow.
- [ ] Tester count remains within the initial 3-5 person cohort.
- [ ] Beta/test organization is clearly labeled.
- [ ] Role is least-privilege for the assigned workflow.
- [ ] `Owner`/`Admin` is internal-only.
- [ ] Tester receives the beta testing guide and script.
- [ ] Tester receives data safety instructions.
- [ ] Access is suspended after testing.
- [ ] Feedback is captured with no secrets or real customer-sensitive data.

## Known Limitations

- Full smoke remains pending.
- Full E2E remains pending.
- Accountant review is still pending and must not be treated as approval or certification.
- Runtime database role hardening remains parked until a safe Vercel environment mutation path is available.
- Bank-specific parser validation remains pending real sanitized target-bank exports.
- Real ZATCA production compliance is not enabled.
- Real email sending is not enabled by default.
- Live bank feeds and automatic matching are not implemented.
