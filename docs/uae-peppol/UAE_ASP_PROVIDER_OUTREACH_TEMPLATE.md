# UAE ASP Provider Outreach Template

Audit date: 2026-06-15

Use this template for first-contact provider outreach. Keep wording conservative: LedgerByte is preparing UAE Peppol/PINT-AE readiness and future ASP orchestration. LedgerByte is not claiming to be FTA certified, Peppol certified, an official UAE provider, an accredited ASP, or production UAE eInvoicing compliant.

## Email Template

Subject: UAE eInvoicing ASP API sandbox and SaaS/ISV integration inquiry

Hello [Provider team],

I am contacting you on behalf of LedgerByte, a bookkeeping/accounting SaaS preparing UAE Peppol/PINT-AE readiness workflows for controlled beta/user-testing customers.

LedgerByte's intended architecture is to remain the bookkeeping system, data-capture layer, local readiness validator, audit trail, and orchestration layer. We are looking for a future accredited UAE ASP API partner to handle final Peppol/PINT-AE validation, transmission, exchange, buyer delivery, and FTA reporting.

We are not looking to make production submissions yet. We are evaluating sandbox API contracts, commercial terms, and implementation requirements before deciding whether to build a provider-specific adapter.

Could you please share whether you can support the following?

1. UAE ASP status and evidence
   - Current UAE MoF pre-approved/accredited status.
   - Exact legal entity name on the MoF list.
   - Whether final accreditation is complete or still subject to testing.

2. Sandbox API access
   - Sandbox API documentation.
   - Sandbox base URL and production base URL separation.
   - Sandbox credentials process.
   - Sample invoice and credit-note payloads.
   - Sample accepted, rejected, validation-failed, duplicate, and pending responses.

3. API capabilities
   - Validation-only endpoint.
   - Invoice submission endpoint.
   - Credit-note submission endpoint.
   - Status polling endpoint.
   - Webhook/callback support.
   - Webhook signing method.
   - Inbound invoice support.
   - Evidence/receipt/archive download support.
   - Participant onboarding or lookup support.
   - Rate limits, idempotency behavior, and retry policy.

4. Commercial API terms
   - Whether LedgerByte can integrate as a SaaS/ISV serving multiple SMB tenants.
   - Reseller, white-label, referral, or embedded partnership options, if available.
   - Pricing model per tenant, legal entity, document, API call, support tier, or minimum commit.
   - Sandbox duration and cost.
   - Production onboarding process and expected timeline.

5. Security, data, and support
   - Data hosting and data residency commitments.
   - Data processing agreement.
   - Security certifications and current audit reports available under NDA.
   - Encryption, secret rotation, and access-control model.
   - SLA/support terms.
   - Incident response and breach-notification terms.
   - API/schema/regulatory change-notice period.

We would also appreciate any recommended integration guide for accounting SaaS platforms and any constraints around multi-tenant submission, Peppol participant registration, buyer onboarding, and inbound invoice delivery.

Please let us know the right technical and commercial contact for sandbox evaluation.

Regards,

[Name]
[Role]
LedgerByte
[Email]
[Phone]

## Follow-Up Checklist

Record each provider response against these gates:

- MoF status evidence received.
- SaaS/ISV eligibility confirmed.
- Sandbox docs received.
- Sandbox credentials process confirmed.
- Auth method documented.
- Validation endpoint documented.
- Submit endpoints documented.
- Status polling documented.
- Webhooks and signing documented.
- Inbound AP documented.
- Evidence/archive download documented.
- Rate limits documented.
- Idempotency documented.
- Retry policy documented.
- Pricing received or marked not public / requires sales quote.
- Data residency/security documents received.
- Production onboarding process documented.
- Support/SLA documented.

## Conservative Reply If Provider Pushes Production Claims

Thank you. For our current phase we need to keep LedgerByte positioned as controlled beta/user-testing only, focused on UAE Peppol/PINT-AE readiness and future ASP orchestration. We cannot claim production UAE eInvoicing compliance, FTA certification, Peppol certification, official UAE provider status, or accredited ASP status for LedgerByte. Please frame any shared material around your provider status and the sandbox/contract requirements needed before LedgerByte builds a provider-specific adapter.
