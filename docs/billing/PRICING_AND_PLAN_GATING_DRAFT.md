# Pricing and Plan Gating Draft

Status: draft
Date: 2026-07-02

## Draft Plan Concepts

| Plan | Audience | Possible gates |
| --- | --- | --- |
| controlled beta | invited testers | single organization, limited support, no compliance submission. |
| starter | small businesses | core bookkeeping, AR/AP, reports, limited users. |
| growth | multi-user teams | inventory, banking workflows, documents, audit logs. |
| compliance add-on | regulated workflows | only after provider/legal review; no pre-ASP live claim. |

## Features That Must Not Be Sold Yet

- UAE compliance.
- Peppol certification.
- Accredited ASP connectivity.
- Live bank feeds.
- Automatic reconciliation.
- Hosted PITR/object-storage readiness.

## Implementation Notes

Plan gating should use explicit entitlements and permission checks. Do not gate by hidden UI-only checks.
