# Incident Response Runbook

Status: draft
Date: 2026-07-02

## Severity

| Severity | Description | Response target |
| --- | --- | --- |
| SEV-1 | Data loss, cross-tenant exposure, payment/compliance false claim, or total outage. | Immediate owner response; stop risky operations. |
| SEV-2 | Major workflow outage for beta users. | Same business day. |
| SEV-3 | Degraded workflow, confusing UI, isolated failed job. | Next triage cycle. |
| SEV-4 | Cosmetic or docs issue. | Backlog. |

## First 15 Minutes

1. Confirm affected environment and current deployment SHA.
2. Stop any risky mutation path if data integrity is uncertain.
3. Preserve logs and screenshots.
4. Identify whether accounting, VAT, inventory valuation, banking, compliance, storage, or provider behavior is affected.
5. Do not promise compliance/production status.

## Monitoring/Support Evidence

- Run `corepack pnpm monitoring:support-readiness` only as a local/source diagnostic.
- Use `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md` to confirm which signals are available, partial, or blocked.
- Use `docs/operations/SUPPORT_INCIDENT_SIMULATION_PLAYBOOK.md` for tabletop drills and incident-specific first checks.
- Use `docs/operations/SUPPORT_RESPONSE_TEMPLATES.md` for conservative beta communications.
- Do not run migrations, seed/reset/delete commands, provider calls, email sends, object storage operations, signed URL checks, ZATCA/UAE/Peppol/ASP actions, payment actions, or production deployment commands as part of incident triage unless a separate approved remediation plan exists.

## Data or Tenant Isolation Concern

- Treat as SEV-1.
- Freeze related deploys.
- Capture affected route/API/log evidence.
- Do not delete data unless a reviewed remediation plan exists.
- Prepare customer communication only after scope is verified.

## Post-Incident

- Write timeline.
- Record root cause.
- Add regression test or monitoring rule.
- Update readiness score/gate if the incident invalidates prior evidence.

## ARC-05 incident playbooks and evidence preservation

For every incident, preserve only: request ID, tenant-safe reference, route/action, safe error class, timestamp, deployment SHA, readiness state, and approved metadata hashes/counts. Do not preserve request/response bodies, documents, XML, recipient addresses, credentials, tokens, OTPs, CSIDs, or raw provider responses.

| Incident | Severity | Immediate response | Recovery and evidence |
| --- | --- | --- | --- |
| Backup failure or stale restore evidence | SEV-2 | Stop expansion and classify target; do not run an unapproved restore. | Use the local recovery evidence index; schedule an approved non-production drill. |
| Storage corruption/hash mismatch | SEV-2 | Stop serving the affected artifact path and retain metadata/hash only. | Validate provider/key/tenant metadata, use database fallback where applicable, and preserve a redacted reconciliation record. |
| Cross-tenant/runtime-role denial | SEV-1 | Freeze affected route/deploy and revoke access only under an approved remediation plan. | Preserve request ID and tenant-safe refs; reproduce locally with synthetic data before any hosted action. |
| Email queue, stale claim, retry, or suppression | SEV-2/3 | Do not force-send or bypass suppression. | Inspect metadata-only queue/retry state; retry only through approved worker controls and record safe outcome. |
| ZATCA outage, rejection, expiry, or unexpected network | SEV-1/2 | Keep no-network/production refusal active; stop submission path. | Record safe validation/rejection code and mode only; sandbox execution still requires explicit approval. |
| Credential or webhook-signature compromise | SEV-1 | Stop affected integration and rotate/revoke through the owner-controlled secret system. | Preserve no secret material; record scope, time, safe rejection count, and rotation confirmation. |
| Rollback | SEV-1/2 | Halt mutation, identify last safe SHA, and use the approved deployment/database rollback plan. | Keep redacted evidence immutable; verify liveness/readiness and tenant boundaries after rollback. |
