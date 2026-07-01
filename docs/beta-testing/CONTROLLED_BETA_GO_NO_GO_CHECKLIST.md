# Controlled Beta Go/No-Go Checklist

Date: 2026-07-01

Current expected status: `GO with restrictions`

Allowed statuses: `pass`, `pass with restriction`, `blocked`, `not applicable`.

## Product Gate

| Check | Status | Notes |
| --- | --- | --- |
| Core shell and routes passed beta evidence | pass | PR #215 closed blockers. |
| Remaining blocker/high/medium issues | pass | Current counts are 0/0/0. |
| Low public/marketing/auth visual fixture depth issue | pass with restriction | Does not block controlled beta; do not claim complete public launch evidence. |

## Evidence Gate

| Check | Status | Notes |
| --- | --- | --- |
| Required visual shards | pass | 1,077/1,077 passed in BETA-FIX-01 evidence. |
| Live walkthrough | pass | 23/23 non-mutating checks passed. |
| Test stack is production | blocked | Test stack is not production and must not be presented as production. |

## Security Gate

| Check | Status | Notes |
| --- | --- | --- |
| Tester cohort limited to approved users | pass with restriction | 3 to 5 testers only. |
| Least-privilege role assigned | pass with restriction | Must be checked per tester. |
| Secrets excluded from docs/feedback | pass with restriction | Must be scanned before PR and before invites. |
| Production penetration testing | not applicable | Not in this beta scope. |

## Support Gate

| Check | Status | Notes |
| --- | --- | --- |
| Support contact identified | pass with restriction | Placeholder must be filled before invites. |
| Triage owner identified | pass with restriction | Placeholder must be filled before invites. |
| Blocker/high response expectations documented | pass | See triage runbook. |

## Legal/Disclaimer Gate

| Check | Status | Notes |
| --- | --- | --- |
| Restrictions documented | pass | Controlled beta restrictions prepared. |
| Acknowledgement template prepared | pass | Product/legal draft only. |
| Final legal approval | pass with restriction | Required before external use if owner requires it. |

## Test Environment Gate

| Check | Status | Notes |
| --- | --- | --- |
| Web test URL known | pass | `https://ledgerbyte-web-test.vercel.app`. |
| API test URL known | pass | `https://ledgerbyte-api-test.vercel.app`. |
| Supabase test project known | pass | `xynelbjqcmbgtscfmmzv`. |
| Environment treated as production | blocked | It is test/user-testing only. |

## Data Safety Gate

| Check | Status | Notes |
| --- | --- | --- |
| Demo/test data only | pass with restriction | Production data requires separate written approval. |
| Sensitive production data prohibited | pass | Stated in restrictions and onboarding guide. |
| Raw bank/attachment/PDF/signed XML/QR payload prohibited | pass | Stated in restrictions and feedback handling. |

## Rollback/Revocation Gate

| Check | Status | Notes |
| --- | --- | --- |
| Access checklist prepared | pass | See `BETA_ACCESS_CHECKLIST.md`. |
| Revocation checklist prepared | pass | See `BETA_ACCESS_REVOCATION_CHECKLIST.md`. |
| Automated revocation implemented by this task | not applicable | Docs/checklist only; no access mutation in this goal. |

## Compliance Wording Gate

| Check | Status | Notes |
| --- | --- | --- |
| No production tax filing claim | pass | Explicitly restricted. |
| No real ZATCA/UAE/Peppol/ASP claim | pass | Explicitly restricted. |
| No live bank feed claim | pass | Explicitly restricted. |
| No real payment claim | pass | Explicitly restricted. |
| No public launch or paid plan claim | pass | Explicitly restricted. |
| No production email guarantee | pass | Explicitly restricted. |

## Overall Decision

`GO with restrictions`

Restrictions:

- Controlled testers only.
- Test/demo data only unless separately approved.
- No production tax filing.
- No real ZATCA/UAE/Peppol/ASP.
- No live bank feeds.
- No real payments.
- No public launch.
- No paid plans.
- No production email guarantee.
