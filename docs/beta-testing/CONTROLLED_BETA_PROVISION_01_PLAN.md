# CONTROLLED-BETA-PROVISION-01 Plan

Date: 2026-07-01

Branch: `codex/controlled-beta-provision-01`

Baseline inspected: `8cefeeb12bba584d98788c65d555605a6cd727c1`

## Status

Provisioning packet prepared. Real tester provisioning is `BLOCKED` because approved tester identities were not provided in the prompt or repository docs.

No account was created, no invite was sent, no onboarding login was attempted, and no hosted database, Vercel, provider, email, payment, storage, signed URL, or compliance mutation was run.

## Beta Decision

LedgerByte remains `GO with restrictions` for controlled beta only.

This goal does not approve public launch, production launch, paid SaaS launch, compliance launch, production data entry, or production reliance.

## Tester Approval Requirement

Before any invite or account action, the owner must provide an approved tester list with:

- Tester name or label.
- Tester role.
- Tester email.
- Tester type: owner, accountant, internal, friendly SME, or operator.
- Approved environment.
- Allowed data type.
- Access start and end date.
- Role to assign.
- Organization or test organization to use.
- Acknowledgement status.

Without those fields, the only allowed output is provisioning-ready documentation and a blocked onboarding result.

## Allowed Environment

- Web test URL: `https://ledgerbyte-web-test.vercel.app`
- API test URL: `https://ledgerbyte-api-test.vercel.app`
- Supabase test project: `xynelbjqcmbgtscfmmzv`
- Data posture: seeded demo/test data only.

This is a user-testing environment, not production.

## Forbidden Actions

- Do not invite unapproved testers.
- Do not send real or production email.
- Do not use production data or sensitive customer financial data.
- Do not deploy or mutate Vercel environment variables.
- Do not mutate hosted Supabase state unless a future approved provisioning prompt explicitly authorizes it.
- Do not run hosted migrations, seed/reset/delete, backup/restore, storage, signed URL, provider, payment, ZATCA, UAE, Peppol, ASP, tax-authority, accounting, report, VAT, inventory valuation, banking, or reconciliation mutations.
- Do not add production-readiness, compliance-readiness, live-bank-feed, payment-readiness, email-readiness, object-storage-readiness, signed-URL-readiness, or unrestricted beta claims.

## Provisioning Options

### Current Run

`BLOCKED`: approved tester identities are missing.

Allowed work:

- Prepare approved tester list template.
- Prepare invite and onboarding templates.
- Prepare dry-run checklist.
- Verify the test environment with non-mutating GET requests.
- Record first onboarding as blocked.
- Record access/revocation and support readiness plans.

### Future Approved Run

If owner-approved tester details are provided:

- Confirm every tester row includes the required approval fields.
- Use the test/beta environment only.
- Assign least-privilege roles.
- Send credentials or invites only through an approved private channel.
- Do not commit passwords, reset links, invite links, tokens, or private tester details.
- Document every authorized mutation in the provisioning evidence.

## Evidence Required

- Approved tester list or explicit blocked status.
- Environment readiness check.
- Provisioning dry-run checklist.
- Invite template.
- Onboarding message template.
- First onboarding result or blocked result.
- Access and revocation plan.
- Support readiness plan.
- Safety scans proving no secrets, raw credentials, private tester data, fake claims, or unauthorized hosted mutations.

## Stop Conditions

Stop before provisioning if:

- Approved tester identities are missing.
- Tester approval fields are incomplete.
- Owner send/invite approval is missing.
- Private credential delivery channel is not approved.
- Support owner, triage owner, beta window, or revocation owner is missing.
- Any action would require production data, production email, hosted migration, provider call, storage/signed URL operation, payment, compliance action, seed/reset/delete, or destructive mutation.
