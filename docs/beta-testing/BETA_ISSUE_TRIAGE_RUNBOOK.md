# Beta Issue Triage Runbook

Date: 2026-07-01

Status: Controlled-beta triage process. This does not invite testers or mutate access.

Monitoring/support evidence:

- Local diagnostic: `corepack pnpm monitoring:support-readiness`
- Evidence: `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md`
- Support runbook: `docs/operations/SUPPORT_TRIAGE_RUNBOOK.md`
- Incident simulations: `docs/operations/SUPPORT_INCIDENT_SIMULATION_PLAYBOOK.md`
- Response templates: `docs/operations/SUPPORT_RESPONSE_TEMPLATES.md`

These artifacts do not claim production monitoring, production support SLA, live alerting, hosted log drains, provider readiness, or unrestricted beta readiness.

## Triage Owner

Primary triage owner: `<CONTROLLED_BETA_TRIAGE_OWNER>`

Support owner: `<CONTROLLED_BETA_SUPPORT_OWNER>`

Escalation owner: `<CONTROLLED_BETA_ESCALATION_OWNER>`

Replace placeholders before tester invites.

## Severity Definitions

### Blocker

Prevents workflow continuation or risks data loss, trust, security, privacy, tenant isolation, or compliance misunderstanding.

Examples:

- Cannot log in or access assigned organization.
- Tester can see another organization's data.
- Core route fails for assigned walkthrough.
- Workflow risks data loss or unrecoverable mutation.
- Secret, token, credential, customer-sensitive data, or raw document body is exposed.
- UI claims or implies production compliance, provider connectivity, live bank feeds, real payment collection, real email delivery, object-storage readiness, signed-URL readiness, or unrestricted beta readiness.

### High

Core workflow is confusing, visibly broken, or likely to damage trust.

Examples:

- Invoice, bill, report, statement, reconciliation, document, settings, storage, or compliance page is materially misleading.
- Mobile/tablet layout hides core actions or status.
- Permission boundary appears wrong.
- Compliance/banking/payment/email copy is unsafe but does not expose data.

### Medium

Workflow can continue with a workaround, but a tester is likely to need support.

Examples:

- Empty state, label, filter, or navigation is confusing.
- Report or document wording needs clarification.
- Secondary layout issues remain usable.

### Low

Polish issue that does not block understanding or completion.

Examples:

- Minor spacing or alignment issue.
- Awkward but safe copy.
- Optional label improvement.

## Beta Response SLAs

| Severity | Initial response | Target action |
| --- | --- | --- |
| Blocker | Same beta day | Pause affected testing; decide stop/rollback/revoke path. |
| High | 1 beta business day | Triage and schedule fix or documented workaround before expansion. |
| Medium | 3 beta business days | Batch into next beta fix pass. |
| Low | Weekly review | Track for polish; do not block beta unless it clusters. |

## Weekly Review Process

1. Review all new feedback entries.
2. Remove or quarantine entries containing secrets or sensitive data.
3. Assign severity and category.
4. Link redacted screenshots/videos.
5. Mark duplicate issues and preserve the clearest reproduction steps.
6. Decide whether the beta can continue, must pause, or can expand.
7. Update known restrictions and support notes.

## Stop-The-Beta Rules

Stop or pause beta immediately if:

- Any blocker remains unresolved.
- Access revocation fails.
- A tester sees unauthorized organization data.
- A secret or sensitive production data leak is confirmed.
- Any production compliance, provider, live banking, payment, email, storage, signed URL, or unrestricted readiness claim reaches testers.
- Support cannot meet blocker/high response expectations.

## High Issue Expectations

High issues should be fixed or explicitly worked around before adding testers. Do not expand the cohort while high trust, workflow, permission, or wording issues are open.

## Duplicate Handling

- Keep the first report with complete reproduction details as canonical.
- Link duplicates to the canonical issue.
- Preserve device/browser differences when duplicates show responsive or browser-specific behavior.

## Screenshot and Artifact Handling

- Store only redacted screenshots/videos.
- Do not store passwords, tokens, cookies, auth headers, database URLs, API keys, invite links, reset links, signed XML, QR payloads, PDF bodies, attachment bodies, raw bank-file bodies, or provider responses.
- If sensitive data appears, quarantine the artifact and record only sanitized metadata.

## Sensitive Data Handling

If sensitive data is submitted:

1. Stop sharing the artifact.
2. Notify the support owner and escalation owner.
3. Record the incident without copying the sensitive content.
4. Decide whether access should be revoked.
5. Preserve only sanitized evidence needed for triage.

## When To Revoke Access

Revoke or suspend access when:

- The tester finishes the scheduled window.
- The tester enters prohibited data.
- The tester shares access.
- The tester violates safety rules.
- A blocker requires freezing the test workspace.
- The owner ends the beta round.

## When To Expand Beta

Expansion beyond 3 to 5 testers requires:

- Blocker count 0.
- High count 0 or explicitly accepted by owner with workaround.
- No unresolved security/privacy issue.
- No unresolved production-claim wording issue.
- Revocation checklist has been proven for the current cohort.
- Support capacity is confirmed.
- Owner approval is recorded.
