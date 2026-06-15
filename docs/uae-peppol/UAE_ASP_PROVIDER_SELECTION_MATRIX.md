# UAE ASP Provider Selection Matrix

Audit date: 2026-06-15

## Executive Summary

LedgerByte should start UAE ASP outreach with providers that combine current UAE Ministry of Finance pre-approved listing evidence with clear developer or sandbox evidence. This document is not a final production provider selection. It is a provider-selection research artifact for controlled beta/user-testing only.

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

The first six are on the MoF pre-approved list reviewed on 2026-06-15. TronStride is also on the MoF list and has public API documentation, but its public documentation exposes production-looking endpoint examples and needs stronger commercial, security, and sandbox due diligence before implementation. Storecove, Sovos, and OpenText have useful public API or platform evidence, but they were not found on the current MoF pre-approved UAE list during this review, so they should not be treated as UAE ASP candidates unless MoF listing or partner coverage is confirmed.

Final recommendation: start outreach with the most API-friendly MoF-listed providers first. Do not implement a real provider until sandbox docs, commercial terms, security terms, data-hosting commitments, and legal/accountant review are complete.

## LedgerByte Architecture Boundary

LedgerByte remains the bookkeeping/accounting SaaS, data-capture layer, local readiness validator, audit trail, and orchestration layer. A future accredited UAE ASP API must handle final Peppol/PINT-AE validation, transmission, exchange, buyer delivery, and FTA reporting.

This branch does not add credentials, executable provider URLs, provider SDKs, network calls, production infrastructure, Vercel/Supabase changes, or real ASP behavior.

## Sources Reviewed

Official and standards sources:

- UAE MoF Electronic Invoicing Guidelines: https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoicing-Guidelines_V-1.0-23Feb2026.pdf
- UAE MoF pre-approved eInvoicing service providers list: https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/
- UAE MoF Accreditation of eInvoicing Service Providers: https://mof.gov.ae/en/services/accreditation-of-einvoicing-service-providers/
- OpenPeppol BIS Billing 3.0: https://docs.peppol.eu/poacc/billing/3.0/
- OpenPeppol PINT-AE v1.0.1: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/
- OpenPeppol UAE 2025-Q2 document specifications: https://docs.peppol.eu/poac/ae/2025-Q2/
- OpenPeppol eDelivery / AS4 background: https://peppol.org/documentation/technical-documentation/

Provider-primary or provider-adjacent sources:

- Complyance UAE page: https://complyance.io/uae
- ClearTax UAE API/middleware integration page: https://www.cleartax.com/ae/uae-e-invoicing-integration-api-middleware-erp-connector
- ClearTax public API docs, KSA reference only: https://docs.cleartax.in/cleartax-docs/e-invoicing-ksa-api/e-invoicing-ksa-api-reference
- EDICOM UAE page: https://edicomgroup.com/electronic-invoicing/united-arab-emirates
- EDICOM UAE pre-approved provider article: https://edicomgroup.com/blog/united-arab-emirates-electronic-invoicing-project
- Comarch UAE page: https://www.comarch.com/trade-and-services/data-management/e-invoicing/e-invoicing-in-uae/
- Taxilla UAE page: https://www.taxilla.com/eninvoice-uae
- Pagero / Thomson Reuters UAE page: https://europe.thomsonreuters.com/compliance/solutions/e-invoicing-united-arab-emirates
- Pagero public File API docs: https://pagero.github.io/file-api-doc/
- Storecove public API docs: https://www.storecove.com/docs/
- Sovos indirect tax API workflow: https://docs.sovos.com/en/indirect-tax/indirect-tax-products/einvoicing/indirect-tax-api/standard-e-invoicing-workflow
- Sovos developer sandbox setup: https://docs.sovos.com/en/indirect-tax/indirect-tax-products/einvoicing/compliance-network/implement-compliance-network/connect-to-sovos
- OpenText e-invoice management: https://www.opentext.com/solutions/e-invoice-management
- TronStride / Aigentrix API docs: https://www.tronstride.com/api-docs/

## Provider Shortlist

| Provider | MoF pre-approved list evidence | Public API documentation | Sandbox evidence | Fit summary |
| --- | --- | --- | --- | --- |
| Complyance | Found as Complyance Electronics L.L.C on MoF list | Marketing-level developer/API page | Public page mentions sandbox and PINT-AE validation scenarios | Best first outreach because UAE-specific, MoF-listed, and developer-forward. Need full API docs, auth, webhook, pricing, and ISV rights. |
| ClearTax | Found as Defmacro Software DMCC (ClearTax) on MoF list | UAE integration article plus public KSA API docs | Public KSA sandbox docs; UAE sandbox terms not public | Strong second outreach due MoF listing, middleware/API positioning, and regional tax tech maturity. Need UAE-specific API docs and sandbox access. |
| Taxilla | Found as TAXILLA FINOPS 360 FZCO on MoF list | UAE page says API as a Service | Sandbox not public | Good outreach candidate if they support SaaS/ISV embedding. Public details are sales-gated. |
| EDICOM | Found as EDICOM Middle East Services on MoF list | Public UAE product and Peppol pages, not detailed API docs | Sandbox not public | Strong enterprise ASP candidate. Likely more sales-led and integration-heavy. |
| Pagero / Thomson Reuters | Found as Pagero Gulf FZ-LLC on MoF list | Public File API docs exist, UAE page is sales-led | Sandbox not public in UAE material | Strong network/compliance provider. Need API scope, SaaS eligibility, webhook/status, and pricing clarity. |
| Comarch | Found as Comarch Middle East FZ LLC on MoF list | Public UAE/product pages, no detailed API docs found | Sandbox not public | Enterprise provider with MoF evidence, but API integration details appear sales-gated. |
| TronStride / Aigentrix | Found as TronStride FZC on MoF list | Public API docs with endpoints, API key auth, lifecycle states | Public docs do not clearly separate sandbox from production | Technically clear, but public docs expose production-looking examples. Requires security, MoF status, sandbox, and commercial diligence before use. |
| Storecove | Not found on current MoF UAE list in this review | Strong public API docs covering submissions, received documents, webhooks, sandbox | Clear sandbox and webhook simulation docs | Excellent API clarity, but cannot be selected for UAE ASP work unless MoF status, local partnership, or authorized UAE ASP path is confirmed. |
| Sovos | Not found on current MoF UAE list in this review | Public indirect tax API docs and developer hub | Clear sandbox app setup docs | Strong global compliance platform. UAE ASP eligibility must be verified before outreach moves beyond research. |
| OpenText | Not found on current MoF UAE list in this review | Public product pages; no detailed public UAE API docs found | Sandbox not public | Enterprise managed-service option. Low immediate fit for SMB SaaS adapter until UAE ASP path and API docs are confirmed. |

## Weighted Scoring Matrix

Scoring scale: 0 = no evidence, 1 = weak/sales-gated, 2 = partial, 3 = strong public evidence. Weighted score is out of 300.

| Category | Weight |
| --- | ---: |
| UAE readiness / MoF listing evidence | 20 |
| Developer API clarity | 15 |
| Sandbox access clarity | 12 |
| Webhook/status support | 10 |
| Validation/error quality | 10 |
| Inbound AP support | 8 |
| Commercial/ISV friendliness | 8 |
| Security/data-hosting clarity | 7 |
| Cost transparency | 4 |
| Lock-in risk | 3 |
| SMB fit | 2 |
| Implementation speed | 1 |

| Provider | UAE evidence | API clarity | Sandbox | Webhook/status | Validation/errors | Inbound AP | ISV fit | Security/hosting | Cost | Lock-in | SMB fit | Speed | Weighted score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Complyance | 3 | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 0 | 2 | 3 | 3 | 206 |
| ClearTax | 3 | 2 | 1 | 2 | 2 | 1 | 2 | 1 | 0 | 1 | 2 | 2 | 197 |
| Taxilla | 3 | 2 | 0 | 1 | 1 | 1 | 2 | 1 | 0 | 1 | 2 | 2 | 169 |
| EDICOM | 3 | 1 | 0 | 1 | 2 | 2 | 1 | 2 | 0 | 1 | 1 | 1 | 166 |
| Pagero / Thomson Reuters | 3 | 1 | 0 | 1 | 1 | 2 | 1 | 2 | 0 | 1 | 1 | 1 | 158 |
| Comarch | 3 | 1 | 0 | 1 | 1 | 1 | 1 | 2 | 0 | 1 | 1 | 1 | 150 |
| TronStride / Aigentrix | 3 | 3 | 1 | 1 | 2 | 2 | 2 | 0 | 1 | 1 | 2 | 3 | 214 |
| Storecove | 0 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 1 | 2 | 3 | 3 | 209 |
| Sovos | 0 | 2 | 3 | 2 | 2 | 2 | 1 | 2 | 0 | 1 | 1 | 2 | 169 |
| OpenText | 0 | 1 | 0 | 1 | 1 | 2 | 1 | 2 | 0 | 1 | 1 | 1 | 102 |

Interpretation:

- TronStride scores high on visible API detail, but should not outrank Complyance/ClearTax for first outreach because the immediate question is a safe, commercial LedgerByte SaaS partner path, not only raw endpoint visibility.
- Storecove scores high on developer experience but remains blocked for UAE work unless MoF status or an authorized UAE ASP partnership is proven.
- Complyance and ClearTax are the best first outreach pair because they combine MoF listing with UAE-specific developer/integration positioning.

## Provider API Evidence Notes

### Complyance

- MoF list evidence: Complyance Electronics L.L.C appears on the official pre-approved list.
- Public API/sandbox evidence: the UAE page positions a developer-friendly API and says the sandbox can simulate UAE invoice scenarios, validate PINT-AE payloads, and trigger FTA-style errors before production.
- Public gaps: full endpoint reference, auth method, webhook signing, status schema, inbound AP flow, archive/evidence download, rate limits, pricing, and data residency are not public in the reviewed material.
- Likely integration difficulty: medium if sandbox docs are complete; high if custom sales onboarding is required.
- Vendor lock-in risk: medium. Need confirm whether LedgerByte can keep its own canonical compliance events and evidence metadata.
- Commercial questions: SaaS/ISV rights, reseller rights, per-tenant pricing, per-document pricing, sandbox duration, support SLA, and right to serve multiple LedgerByte tenants.
- Fit for LedgerByte SMB SaaS: high pending sandbox documentation and commercial terms.

### ClearTax

- MoF list evidence: Defmacro Software DMCC (ClearTax) appears on the official pre-approved list.
- Public API/sandbox evidence: UAE page describes direct API, middleware, ERP connectors, Peppol status handling, PINT-AE transformation, validation, and dashboard/response handling. Public detailed API docs found were KSA-oriented, not UAE-specific.
- Public gaps: UAE-specific endpoint reference, sandbox access process, webhook signing, inbound AP, evidence archive download, and pricing are not public.
- Likely integration difficulty: medium. ClearTax may be strong if it supports clean direct API and ISV multi-tenant contracts; otherwise it may be enterprise-connector oriented.
- Vendor lock-in risk: medium-high if PINT-AE transformation and status handling are opaque.
- Commercial questions: whether LedgerByte can submit canonical XML/JSON, whether ClearTax accepts SaaS platform integrations, who owns tenant onboarding, and how MLS/status responses map back to LedgerByte.
- Fit for LedgerByte SMB SaaS: high if direct API and multi-tenant commercial terms are available.

### Taxilla

- MoF list evidence: TAXILLA FINOPS 360 FZCO appears on the official pre-approved list.
- Public API/sandbox evidence: UAE page advertises API as a Service for embedding Peppol-compliant eInvoicing into software solutions.
- Public gaps: endpoint docs, sandbox docs, auth, webhooks, inbound AP, evidence archive, pricing, data residency, and ISV contract are not public.
- Likely integration difficulty: medium-high until docs are provided.
- Vendor lock-in risk: medium.
- Fit for LedgerByte SMB SaaS: promising if Taxilla provides SaaS/ISV API terms.

### EDICOM

- MoF list evidence: EDICOM Middle East Services appears on the official pre-approved list.
- Public API/sandbox evidence: public UAE pages cover Peppol/PINT-AE, XML/JSON formats, and ASP transmission responsibility, but detailed developer docs were not found.
- Public gaps: endpoint docs, sandbox flow, auth, webhook signing, inbound AP callbacks, evidence download, and pricing are sales-gated or not public.
- Likely integration difficulty: medium-high, likely enterprise integration.
- Vendor lock-in risk: medium. Need confirm whether LedgerByte can keep provider-neutral state.
- Fit for LedgerByte SMB SaaS: medium unless EDICOM has SaaS partner APIs and SMB pricing.

### Pagero / Thomson Reuters

- MoF list evidence: Pagero Gulf FZ-LLC appears on the official pre-approved list.
- Public API/sandbox evidence: public File API docs exist; UAE page states pre-approved ASP positioning. UAE-specific API details and sandbox terms were not public in reviewed material.
- Public gaps: UAE-specific endpoint reference, webhook signing, status polling, inbound AP, evidence download, pricing, and data residency.
- Likely integration difficulty: medium-high.
- Vendor lock-in risk: medium.
- Fit for LedgerByte SMB SaaS: medium pending ISV/SaaS partner terms.

### Comarch

- MoF list evidence: Comarch Middle East FZ LLC appears on the official pre-approved list.
- Public API/sandbox evidence: public UAE pages explain PINT-AE positioning and the UAE model, but no detailed public API docs were found.
- Public gaps: developer docs, sandbox, auth, status, webhooks, inbound AP, evidence download, and pricing.
- Likely integration difficulty: high until sales provides technical docs.
- Vendor lock-in risk: medium-high.
- Fit for LedgerByte SMB SaaS: medium-low for first adapter unless API docs are made available quickly.

### TronStride / Aigentrix

- MoF list evidence: TronStride FZC appears on the official pre-approved list.
- Public API/sandbox evidence: public API docs show API-key auth, create, validate, lifecycle states, sample payloads, and endpoint examples.
- Public gaps: separate sandbox base URL, webhook signing, rate limits, data residency, security certification, commercial SaaS rights, pricing fit, and long-term provider maturity.
- Likely integration difficulty: low-medium technically, high diligence burden commercially/security-wise.
- Vendor lock-in risk: medium.
- Fit for LedgerByte SMB SaaS: possible, but not first until security/commercial review is stronger.

### Storecove

- MoF list evidence: not found on current MoF UAE list during this review.
- Public API/sandbox evidence: strong public API docs with sandbox, document submissions, received documents, webhooks, and webhook simulation.
- Public gaps for UAE: MoF pre-approved/accredited status, UAE ASP rights, PINT-AE/UAE DCTCE support path.
- Likely integration difficulty: low technically if authorized; blocked for UAE until official eligibility is clear.
- Vendor lock-in risk: low-medium because docs appear API-first.
- Fit for LedgerByte SMB SaaS: high developer fit, blocked by UAE MoF status uncertainty.

### Sovos

- MoF list evidence: not found on current MoF UAE list during this review.
- Public API/sandbox evidence: public docs explain indirect-tax API workflow, schema validation, responses, archiving, and developer hub sandbox app setup with OAuth-style keys.
- Public gaps for UAE: MoF pre-approved/accredited UAE ASP evidence, UAE PINT-AE endpoint docs, commercial SaaS terms.
- Likely integration difficulty: medium technically, blocked by UAE eligibility.
- Vendor lock-in risk: medium-high due broad compliance platform abstraction.
- Fit for LedgerByte SMB SaaS: medium-low unless UAE ASP status and partner terms are confirmed.

### OpenText

- MoF list evidence: not found on current MoF UAE list during this review.
- Public API/sandbox evidence: public product page covers global e-invoicing and Peppol coverage, but not a UAE developer API.
- Public gaps for UAE: MoF status, developer docs, sandbox, API contract, webhooks, evidence archive, pricing, and SaaS/ISV rights.
- Likely integration difficulty: high for a first LedgerByte adapter.
- Vendor lock-in risk: high if delivered as managed enterprise service.
- Fit for LedgerByte SMB SaaS: low for first adapter.

## Commercial Questions

- Are you currently on the UAE MoF pre-approved provider list, and can you share the exact legal entity and current accreditation/pre-approval evidence?
- Is final accreditation complete or still subject to MoF testing? If still pending, what remains?
- Do you permit SaaS/ISV integrations where LedgerByte serves many SMB tenants through one platform?
- Do you support reseller, white-label, referral, or embedded-commercial models?
- Is pricing per legal entity, tenant, Peppol participant, document, API call, bundle, or support tier?
- Is pricing public? If not, confirm that pricing is not public / requires sales quote.
- Is sandbox access free, time-limited, or contract-gated?
- What are production onboarding fees, minimum commits, support tiers, and SLA terms?
- Who owns Peppol participant registration and buyer onboarding?
- Can LedgerByte keep a provider-neutral audit trail and switch providers later?
- What termination, data export, and provider migration rights are included?

## Technical Questions

- What is the sandbox API base URL and how is it separated from production?
- What authentication method is used in sandbox and production?
- Do you accept PINT-AE XML, provider JSON, UBL XML, or all of these?
- Do you provide validation-only endpoints before submission?
- Do you provide submit endpoints for invoice and credit note?
- Do you provide status polling, webhooks, or both?
- What webhook signing method is used?
- What is the error schema, and are PINT-AE/Peppol/FTA-style errors normalized?
- Can you return sample accepted, rejected, pending, and validation-failed responses?
- Do you support inbound AP invoice receipt and delivery to LedgerByte?
- Do you support evidence, receipt, XML, response, and archive download APIs?
- What rate limits, idempotency keys, retry policies, and duplicate-detection rules apply?
- How are Peppol participant IDs registered, verified, and updated?
- What sandbox fixtures are available for buyer-not-on-network, rejected invoice, validation failure, duplicate submit, and delayed status?

## Compliance And Security Questions

- Where is data hosted and processed?
- Do you provide data residency commitments for UAE customer data?
- What certifications are current, including ISO/IEC 27001, ISO 22301, SOC 2, or equivalent?
- What encryption is used at rest and in transit?
- What incident response SLA and customer notification periods are contractual?
- What audit logs are available to LedgerByte?
- What retention period applies to invoice payloads, status messages, and evidence artifacts?
- Can LedgerByte request deletion/export at tenant termination?
- What change-notice period applies for API, schema, PINT-AE, Peppol, and MoF/FTA changes?
- How are secrets rotated, scoped, and revoked?

## Risks And Unknowns

- MoF list status can change. Re-verify the official MoF list immediately before procurement and before coding a real adapter.
- Pre-approved listing is not the same as final production suitability for LedgerByte.
- Public provider pages are uneven. Several providers are sales-gated and may have strong APIs that are not public.
- Pricing is mostly not public / requires sales quote.
- Provider API abstractions may hide PINT-AE validation details and create lock-in.
- Inbound AP support is not always obvious and must be explicitly confirmed.
- Webhook signing, retry/idempotency, and archive evidence are critical and often omitted from public marketing pages.
- LedgerByte must keep accounting finalization separate from compliance delivery state.
- No provider should be implemented until sandbox docs and commercial rights are reviewed.

## Final Recommendation

Start outreach with the most API-friendly MoF-listed providers first: Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, and Comarch. Keep TronStride / Aigentrix as a developer-documentation comparator and possible later outreach after deeper security/commercial review. Keep Storecove, Sovos, and OpenText as non-UAE-listed comparators unless current MoF status or an authorized UAE ASP partnership is confirmed.

Do not implement a real provider until sandbox docs and commercial terms are reviewed.
