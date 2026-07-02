# Support Triage Runbook

Status: draft
Date: 2026-07-02

## Intake Fields

- customer/organization
- user email
- environment URL
- route
- timestamp/timezone
- expected behavior
- actual behavior
- screenshot/video
- browser/device
- whether accounting totals, compliance status, payments, or data access are involved

## Triage Buckets

| Bucket | Examples | Owner action |
| --- | --- | --- |
| access/session | login failure, organization switch, permissions | Verify auth/session state without requesting passwords. |
| workflow | invoice, bill, inventory, banking, report issues | Reproduce in test data; avoid changing customer data. |
| data integrity | totals, balances, postings, reconciliation | Escalate before mutation; preserve evidence. |
| compliance/provider | UAE/ZATCA/Peppol/ASP questions | Use conservative readiness wording only. |
| storage/documents | PDFs, attachments, archive records | Do not download private bodies unless explicitly authorized. |

## Support Boundaries

- Do not ask for passwords or secrets.
- Do not promise production readiness, UAE compliance, Peppol certification, ASP connection, live bank feeds, or automatic reconciliation.
- Do not mutate customer data outside an approved remediation path.
