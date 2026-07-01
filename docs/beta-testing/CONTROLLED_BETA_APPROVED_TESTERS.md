# Controlled Beta Approved Testers

Date: 2026-07-01

Status: `BLOCKED - approved tester identities not provided`

No approved tester list with the required provisioning fields was present in the prompt or repository docs.

This file intentionally contains no real private tester data. Do not use historical dummy fixture accounts or generic smoke-test identities as approved first-cohort testers.

## Current Provisioning Decision

- Real accounts created: `No`
- Invites sent: `No`
- Emails sent: `No`
- First onboarding run: `No`
- Blocker: `Approved tester identities not provided`

## Required Approved Tester Fields

| Tester label | Tester role | Tester email | Tester type | Approved environment | Allowed data type | Access start | Access end | Role to assign | Organization/test org | Acknowledgement status | Approval source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<TESTER_LABEL>` | `<ACCOUNTANT_OR_OPERATOR_OR_OWNER_OR_VIEWER>` | `<TESTER_EMAIL>` | `<owner/accountant/internal/friendly SME/operator>` | `ledgerbyte-web-test / ledgerbyte-api-test / xynelbjqcmbgtscfmmzv` | `demo/test data only` | `<YYYY-MM-DD>` | `<YYYY-MM-DD>` | `<least-privilege role>` | `<TEST_ORG>` | `<pending/accepted>` | `<owner approval reference>` |

## Acceptance Rules

- Every tester must be explicitly approved by the owner.
- Every tester must receive controlled-beta restrictions before login.
- Every tester must acknowledge the no-production-data and no-official-reliance restrictions.
- Credentials, reset links, invite links, passwords, tokens, and private emails must not be committed.
- Owner/Admin access stays internal unless separately approved.

## Unblock Requirement

Next required action: owner provides the approved tester list and explicit send/invite approval through `CONTROLLED-BETA-APPROVAL-01`.
