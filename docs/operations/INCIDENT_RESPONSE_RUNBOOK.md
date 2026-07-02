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
