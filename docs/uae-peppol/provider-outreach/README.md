# UAE ASP Provider Outreach Pack

Audit date: 2026-06-15

## Purpose

This folder prepares LedgerByte/Leisurebyte for provider outreach before any real UAE ASP adapter is implemented.

The goal is to collect provider-backed evidence for UAE Peppol/PINT-AE sandbox access, API contracts, commercial terms, security posture, data residency, support, and sample payloads. These files are process and documentation artifacts only.

## Provider-Backed Strategy

LedgerByte remains the accounting/bookkeeping SaaS, data capture layer, local readiness validator, audit trail, and orchestration layer. LedgerByte should integrate with an accredited UAE ASP API for final provider-side validation, Peppol/PINT-AE exchange, buyer delivery, and FTA reporting when the commercial and technical path is proven.

Recommended first outreach order:

1. Complyance
2. ClearTax
3. Taxilla
4. EDICOM
5. Pagero / Thomson Reuters
6. Comarch
7. TronStride / Aigentrix
8. Storecove
9. Sovos
10. OpenText

Storecove, Sovos, and OpenText were not found on the current MoF UAE pre-approved list during the provider-selection review. Treat them as lower-priority global fallback or comparator providers unless updated MoF evidence or an authorized UAE ASP partnership is received.

## Evaluation Rules

- Do not code a provider-specific adapter until sandbox docs, commercial terms, security/data residency answers, and sample invoice and credit-note payloads are received.
- Do not treat provider marketing pages as enough evidence for implementation.
- Do not treat a sandbox offer as production approval.
- Do not treat MoF listing evidence as LedgerByte accreditation.
- Require written confirmation that SaaS/ISV commercial API use is allowed for multi-tenant LedgerByte customers.
- Require endpoint lifecycle evidence: validation, submit, status, webhook/callback, evidence/receipt download, inbound AP support, retry, rate limit, idempotency, and error schema.
- Require security and data evidence: DPA, data residency, access control, encryption, audit reports or security certifications, incident process, and support/SLA path.
- Keep provider responses and evaluation notes as documentation, not secrets.
- Never commit API keys, tokens, private sandbox URLs, private credentials, NDAs, confidential price sheets, private customer data, or non-public provider documents.

## Safety Boundaries

- Controlled beta/user-testing only.
- UAE Peppol/PINT-AE readiness only.
- No real ASP calls.
- No real ASP submission.
- No FTA reporting.
- No real Peppol transmission.
- No production Peppol claim.
- No FTA certified, Peppol certified, official UAE provider, or accredited ASP claim by LedgerByte.
- No ZATCA production behavior.
- No hosted/customer-data mutation.
- No Vercel/Supabase change.
- No production infrastructure command.
