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

## Beta Issue Intake

Use the beta issue log/triage flow for tester reports. Capture:

- environment URL and route
- tester role and organization
- timestamp/timezone
- severity candidate
- expected vs actual behavior
- reproduction steps
- redacted screenshot/video link
- whether the issue touches accounting totals, VAT, inventory valuation, reconciliation, permissions, provider/compliance status, email, storage, signed URLs, or customer-sensitive data

## Severity Mapping

| Support class | Beta severity | Escalation |
| --- | --- | --- |
| Cross-tenant exposure, secret leak, data loss, unsafe production/compliance/provider claim | Blocker | Security owner and support owner immediately. |
| Core workflow unavailable, database readiness degraded, wrong balance, permission failure | High or Blocker | Engineering/accounting owner before beta expansion. |
| Confusing but usable workflow, delayed email, stale evidence, blocked storage readiness | Medium | Batch into next beta fix pass unless it clusters. |
| Copy/spacing/minor docs issue | Low | Weekly review. |

## Sensitive Screenshots

- Ask for redacted screenshots only.
- Do not store passwords, tokens, cookies, auth headers, database URLs, API keys, invite links, reset links, signed XML, QR payloads, private PDF bodies, attachment bodies, raw bank files, or provider responses.
- If sensitive data is submitted, quarantine it, stop sharing it, and record only sanitized metadata.

## Legal/Tax Boundary

Support must not give legal, tax, ZATCA, UAE VAT, Peppol, ASP accreditation, or filing advice. Use only verified product-status wording and escalate compliance questions.

## Pause Beta

Pause the affected beta workflow if a blocker remains unresolved, support cannot meet blocker/high response expectations, access revocation fails, database readiness is unavailable, data integrity is uncertain, or a production/provider/compliance/live-banking/payment/storage/signed-URL claim reaches testers.

## Support Boundaries

- Do not ask for passwords or secrets.
- Do not promise production readiness, UAE compliance, Peppol certification, ASP connection, live bank feeds, or automatic reconciliation.
- Do not mutate customer data outside an approved remediation path.
