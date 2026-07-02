# Controlled Beta Support Checklist

Status: controlled-beta support readiness checklist
Date: 2026-07-02

## Before Inviting Testers

- Confirm support owner, engineering escalation owner, accounting escalation owner, security escalation owner, and compliance escalation owner.
- Run `corepack pnpm monitoring:support-readiness`.
- Confirm `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md` reports no blocked checks.
- Review `docs/beta-testing/BETA_ISSUE_TRIAGE_RUNBOOK.md`.
- Review `docs/operations/SUPPORT_TRIAGE_RUNBOOK.md`.
- Review `docs/operations/INCIDENT_RESPONSE_RUNBOOK.md`.
- Review `docs/operations/SUPPORT_INCIDENT_SIMULATION_PLAYBOOK.md`.
- Confirm screenshots/videos must be redacted before storage.
- Confirm no support owner will ask for passwords, tokens, API keys, database URLs, private document bodies, raw bank files, signed XML, or provider responses.
- Confirm beta restrictions are visible to support: no production launch, no paid SaaS claim, no production compliance claim, no live bank feeds, no real payment collection, no production email guarantee, no object-storage production proof, and no signed-URL production proof.

## Daily During Controlled Beta

- Review new beta issues and classify severity.
- Check access/permission complaints first for tenant-boundary risk.
- Check data-integrity complaints before recommending any workflow continuation.
- Review email/outbox complaints without sending email unless explicitly approved.
- Record incident evidence as sanitized metadata.
- Escalate any blocker/high issue before expanding testers.

## Stop Conditions

- Confirmed or suspected cross-tenant exposure.
- Secret/token/password/API key/customer-sensitive artifact shared.
- Database readiness unavailable during active testing.
- Accounting totals, VAT math, inventory valuation, or reconciliation state appears unreliable.
- Any production compliance/provider/live banking/payment/object-storage/signed-URL readiness claim reaches testers.
- Access revocation fails.
- Support owner cannot respond to blocker/high issues.

## Current Gaps

- Production monitoring provider/log drain is not selected.
- Support SLA tooling is not active; current response targets are controlled-beta drafts.
- Object storage and signed URL readiness remain blocked until proof is executed in an approved non-production environment.
- UAE ASP access is unavailable; real provider calls remain blocked.
