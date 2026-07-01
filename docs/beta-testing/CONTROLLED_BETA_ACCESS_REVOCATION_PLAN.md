# Controlled Beta Access Revocation Plan

Date: 2026-07-01

Status: Plan ready. No access mutation executed.

## Access Granting Plan

Access may be granted only after owner-approved tester details are recorded in `CONTROLLED_BETA_APPROVED_TESTERS.md`.

For each tester:

- Use the test/beta environment only.
- Assign the approved test organization.
- Assign the least-privilege role.
- Record access start and end dates.
- Send credentials or invite links only through an approved private channel.
- Do not commit passwords, reset links, invite links, tokens, cookies, auth headers, database URLs, API keys, or private tester details.

## Revocation Plan

At the end of the beta window, or earlier if the beta pauses:

- Suspend or disable the tester account.
- Remove active test organization membership if the access model requires it.
- Rotate any shared demo credential if one was used.
- Confirm the tester can no longer access the test organization.
- Record revocation date, reason, owner, and evidence.

## Ownership

- Revocation owner: `<CONTROLLED_BETA_REVOCATION_OWNER>`
- Support owner: `<CONTROLLED_BETA_SUPPORT_OWNER>`
- Triage owner: `<CONTROLLED_BETA_TRIAGE_OWNER>`
- Escalation owner: `<CONTROLLED_BETA_ESCALATION_OWNER>`

Replace placeholders before inviting testers.

## Evidence To Retain

- Approved tester record.
- Acknowledgement status.
- Access start and end dates.
- Role and organization assignment.
- Redacted feedback and issue metadata.
- Revocation confirmation.
- Any incident notes, without copying sensitive content.

## Credential Rotation

Rotate shared credentials immediately if:

- A shared demo credential was used.
- Access was shared.
- A tester leaves the cohort.
- A screenshot, chat, ticket, or artifact may have exposed credential material.
- The beta pauses because of a security/privacy concern.

## Production Data Confirmation

Before closeout:

- Confirm no production data was entered.
- Confirm no sensitive documents were uploaded.
- Confirm no prohibited provider, payment, email, storage, signed URL, backup/restore, seed/reset/delete, migration, ZATCA, UAE, Peppol, ASP, or tax authority action was run.
- Record suspected sensitive-data issues without copying sensitive content.

## Emergency Stop

Pause beta and revoke affected access immediately if:

- A tester can see another organization's data.
- A secret, token, credential, customer-sensitive record, or raw document body is exposed.
- Production data is entered.
- A production readiness, compliance, provider, banking, payment, email, storage, signed URL, or unrestricted beta claim reaches testers.
- Access cannot be revoked promptly.

## Beta Pause Procedure

1. Stop new invites.
2. Notify support and triage owners.
3. Suspend affected access.
4. Preserve only redacted evidence.
5. Classify blocker/high/medium/low issues.
6. Resume only after owner approval.
