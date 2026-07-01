# Controlled Beta Support Readiness

Date: 2026-07-01

Status: Ready as a template. Owner-specific placeholders remain required before invites.

## Support Owners

- Support owner: `<CONTROLLED_BETA_SUPPORT_OWNER>`
- Triage owner: `<CONTROLLED_BETA_TRIAGE_OWNER>`
- Escalation owner: `<CONTROLLED_BETA_ESCALATION_OWNER>`
- Support channel: `<CONTROLLED_BETA_SUPPORT_CHANNEL>`

Replace placeholders before inviting testers.

## Response Expectations

| Severity | Initial response | Target action |
| --- | --- | --- |
| Blocker | Same beta day | Pause affected testing; decide stop, rollback, or revoke path. |
| High | 1 beta business day | Triage and schedule fix or documented workaround before expansion. |
| Medium | 3 beta business days | Batch into next beta fix pass. |
| Low | Weekly review | Track for polish; do not block beta unless repeated. |

## Triage Cadence

- Daily during the first active onboarding week.
- Weekly after first cohort stabilizes.
- Immediate review for blocker, security/privacy, cross-organization, production-data, or unsafe-claim reports.

## Severity Definitions

- Blocker: prevents workflow continuation or risks data loss, trust, security, privacy, tenant isolation, or compliance misunderstanding.
- High: core workflow is confusing, visibly broken, or likely to damage trust.
- Medium: workflow can continue with support or workaround.
- Low: polish or clarity issue.

## Escalation Process

1. Support owner acknowledges the report.
2. Triage owner assigns severity and category.
3. Escalation owner decides whether to pause beta, revoke access, or continue with workaround.
4. Product owner approves expansion only when blocker count is zero and high issues are zero or explicitly accepted with workaround.

## Stop-Beta Rules

Stop or pause the beta if:

- Any blocker remains unresolved.
- A tester sees unauthorized organization data.
- A secret, token, credential, customer-sensitive record, raw bank file, signed XML, QR payload, PDF body, or attachment body is exposed.
- A tester enters prohibited production data.
- Access revocation fails.
- Support cannot meet blocker/high response expectations.
- Unsafe production, compliance, provider, live-bank-feed, payment, email, object-storage, signed-URL, or unrestricted beta wording reaches testers.

## Artifact Handling

- Store only redacted screenshots/videos.
- Do not store passwords, tokens, cookies, auth headers, database URLs, API keys, invite links, reset links, signed XML, QR payloads, PDF bodies, attachment bodies, raw bank-file bodies, or provider responses.
- Quarantine and sanitize any accidental sensitive submission.

## Tester Communication Loop

- Confirm receipt of blocker/high reports.
- Provide safe workaround or pause instruction.
- Update testers when access is revoked or restored.
- Summarize triage outcomes without exposing private tester or sensitive data.
