# Beta Access Dry Run - 2026-05-22

Status: completed against the deployed user-testing environment.

This dry run verified that LedgerByte beta access can be managed with the existing team, role, invite, and status controls without using real customer data or sending real external email.

## Scope

Target environment:

- API: `https://ledgerbyte-api-test.vercel.app`
- Web: `https://ledgerbyte-web-test.vercel.app`

Credential path:

- Local DPAPI-backed user-testing credential store was used.
- Passwords, tokens, auth headers, request bodies, response bodies, customer/vendor data, invite tokens, and email/PDF/document bodies were not printed.

Out of scope:

- No real external tester was invited.
- No real customer data was used.
- No production invoice, bank statement, or compliance material was used.
- No full smoke or full E2E was run.
- No auth architecture, permission logic, Supabase RLS, runtime database role, Vercel environment, migration, seed, reset, delete, backup, restore, real ZATCA, or real email behavior changed.

## Target Health

| Check | Result |
| --- | --- |
| API `/` | `200` |
| API `/health` | `200` |
| API `/readiness` | `ok` |
| Web `/setup` | `200` |
| Web `/settings/team` | `200` |
| Authenticated beta session | Available through local secret store |

## Email Safety Check

Before creating any invite, the deployed beta API email readiness endpoint was checked.

| Field | Result |
| --- | --- |
| Provider | `mock` |
| Mock mode | `true` |
| Real sending enabled | `false` |

Because the provider was `mock` and real sending was disabled, the dummy invite dry run was safe to execute. The invite outbox record was created with provider `mock` and status `SENT_MOCK`.

## Dummy Identity

The dry run used one safe dummy identity:

- `beta-viewer-20260521230652@example.test`

This is a non-routable documentation/test identity and not a real external tester.

## Workflow Result

| Step | Result |
| --- | --- |
| Invite dummy tester | Passed |
| Initial role | `Viewer` |
| Initial membership status | `INVITED` |
| Member visible in team list | Passed |
| Mock outbox record created | Passed |
| Change role to scoped workflow role | Passed: `Sales` |
| Change role back to least-privilege default | Passed: `Viewer` |
| Suspend/revoke access | Passed: `SUSPENDED` |
| Reactivate access | Passed: `ACTIVE` |
| Final revoke after reactivation check | Passed: `SUSPENDED` |
| Final role | `Viewer` |
| Owner/Admin assigned to dummy tester | `false` |

The dummy member was intentionally left suspended rather than deleted so audit history and workflow evidence remain intact.

## Recommended Roles Confirmed

- General external beta review: `Viewer`.
- Sales workflow testing with dummy data: `Sales` or a custom scoped role.
- AP workflow testing with dummy data: `Purchases` or a custom scoped role.
- Trusted accountant workflow testing: `Accountant` only when broader workflow access is required.
- Internal beta operators only: `Owner` and `Admin`.

## Limitations

- The dry run did not have a real tester accept the invite and complete a full browser session.
- The dry run did not validate MFA, advanced session controls, or production email relay behavior.
- A real selected-tester round still needs the operator to invite only approved testers, provide the beta testing script, and suspend access after the testing window.
- Full smoke and full E2E remain pending.
- Runtime database role hardening remains parked until a safe Vercel environment mutation path is available.
- Real ZATCA production compliance, CSID execution, clearance/reporting, PDF/A-3, live bank feeds, automatic bank matching, and real customer email sending remain not enabled.
