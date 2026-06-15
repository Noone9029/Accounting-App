# UAE ASP Provider Response Evaluation Rubric

Audit date: 2026-06-15

Score each category from 0 to 3.

- 0: no evidence or unacceptable answer.
- 1: weak, sales-gated, incomplete, or ambiguous evidence.
- 2: usable but has gaps that must be closed before implementation.
- 3: strong, written, implementation-ready evidence.

Do not select a real provider or implement a provider-specific adapter from this rubric alone. This rubric organizes evidence for technical, commercial, security, legal/accountant, and product review.

| Category | Weight | What strong evidence includes |
| --- | ---: | --- |
| API completeness | 12 | Clear validation, invoice submit, credit-note submit, status, webhook/callback, evidence download, inbound AP, auth, idempotency, retry, and rate-limit docs. |
| Sandbox readiness | 10 | Written sandbox access process, sandbox credentials process, non-production environment separation, sample success/failure flows, and test data rules. |
| UAE MoF status clarity | 10 | Exact legal entity, current pre-approved/accredited status, official evidence, and any remaining testing or production limitations. |
| Commercial SaaS/ISV permission | 10 | Written permission for LedgerByte to serve many SMB tenants through a SaaS/ISV API integration. |
| Webhook/status lifecycle quality | 8 | Complete statuses, delivery lifecycle, polling rules, webhook signing, replay protection, retries, and event ordering guidance. |
| Error quality | 7 | Stable error schema, validation details, duplicate handling, auth/rate-limit errors, outage behavior, and remediation guidance. |
| Sample payload quality | 7 | UAE Peppol/PINT-AE invoice and credit-note examples, accepted/rejected examples, and field mapping guidance. |
| Inbound invoice support | 6 | AP/inbound invoice delivery, buyer participant handling, webhook/status docs, attachment/evidence behavior, and tenant routing. |
| Evidence/archive support | 6 | Receipts, provider evidence, status history, hash/archive metadata, download method, retention expectations, and audit export support. |
| Security/data residency clarity | 8 | DPA, data residency, encryption, access control, audit reports, security certifications, incident response, and breach notification details. |
| Pricing clarity | 5 | Tenant/legal-entity/document/API/support pricing, setup fees, sandbox cost, minimum commit, and renewal/termination terms. |
| Lock-in risk | 4 | Provider-neutral payload/state support, data export, termination rights, migration support, and avoidable proprietary transformation traps. |
| Support/SLA quality | 5 | Technical support path, escalation, incident support, SLA, uptime commitments, regulatory-change notice, and API deprecation policy. |
| Implementation speed | 2 | Practical ability to begin sandbox contract tests quickly after approval without production behavior. |

## Decision Bands

| Weighted result | Decision |
| ---: | --- |
| 85-100 | Strong candidate for provider-specific sandbox contract tests after legal/security review. |
| 70-84 | Candidate with documented gaps; close gaps before implementation. |
| 50-69 | Keep in comparison set; do not implement until material gaps close. |
| 0-49 | Do not implement. Keep as fallback or reject for this phase. |

## Minimum Gates Before Adapter Coding

- UAE MoF status or authorized UAE ASP path is documented.
- SaaS/ISV commercial API use is confirmed in writing.
- Sandbox docs and access process are received.
- Sample invoice and credit-note payloads are received.
- Validation, submit, status, webhook, error, idempotency, retry, and evidence flows are documented.
- Security, DPA, and data residency answers are received.
- Pricing and production go-live requirements are understood.
- Confidential provider material is stored outside git.
