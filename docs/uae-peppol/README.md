# UAE Peppol/PINT-AE Readiness

LedgerByte now has a controlled-beta UAE eInvoicing readiness foundation over the neutral compliance core.

## Current Positioning

Safe wording:

- UAE eInvoicing-ready accounting software.
- Built for UAE Peppol/PINT-AE readiness.
- UAE eInvoicing readiness.
- Peppol/PINT-AE readiness.
- ASP connectivity preparation.
- Local validation/readiness only.
- ASP connectivity foundation is disabled by default.
- Provider-backed architecture is planned through a future accredited UAE ASP API.
- Disabled/mock ASP connector contracts for local testing only.

Do not claim:

- FTA certified.
- Peppol certified.
- Official UAE eInvoicing provider.
- Accredited ASP.
- Production UAE eInvoicing compliance.

## Implemented In This Branch

- Nullable UAE organization/contact readiness fields.
- Editable UAE organization readiness fields in Compliance settings for legal name, trade license number, TRN, TIN, VAT registration status, UAE address, emirate, business activity, Peppol participant ID, ASP selected, and ASP onboarding status.
- UAE readiness checklist for TIN/TRN presence and validity, participant ID presence or derivation, UAE address completeness, VAT status, ASP selection, and ASP onboarding status.
- Optional UAE eInvoicing fields on contact creation, shared contact detail/edit, and customer/supplier detail pages.
- UAE TIN/TRN validation helpers.
- Peppol participant ID derivation from 10-digit TIN as `0235{TIN}`.
- Local readiness checklist for organization, buyer endpoint, invoice field, credit-note reference, tax identity, and Peppol participant data.
- Fixture-tested PINT-AE-like invoice and credit-note XML generation.
- Compliance-core document lifecycle, validation result, event timeline, transmission state, and XML/evidence archive metadata.
- Provider-neutral ASP adapter contract with normalized provider keys, statuses, and capability flags.
- Disabled ASP adapter that blocks submission, rejects non-mock webhooks, returns no evidence, and never emits sent, FTA-reported, or buyer-delivered states.
- Mock ASP adapter for deterministic local tests only. Mock accepted/rejected submissions require explicit mock mode and never claim real ASP submission, FTA reporting, or buyer delivery.
- Future provider placeholders for Complyance, ClearTax, EDICOM, and generic ASP keys that return safe not-implemented results.
- Redacted provider config summary, arbitrary external URL blocking, and no plaintext secret response behavior.
- Read-only API readiness endpoints for sales invoices and sales credit notes.
- API/service surface for provider readiness summary, redacted config test, local/mock transmission preview, explicit mock submit, and provider status timeline.
- Finalized sales invoice and finalized sales credit-note readiness panels with explicit local-only validation actions.
- Settings page showing UAE readiness, buyer endpoint coverage, rollout dates, official references, and prohibited claims.
- Metadata-only validation/archive behavior for local readiness output: status, hashes, warnings/errors, size, filename, and source links where applicable.

## Not Implemented

- Real ASP network integration.
- Provider-specific payload contract.
- Provider-specific credentials.
- Provider-specific base URLs.
- Real webhooks.
- Real Peppol transmission.
- EmaraTax onboarding automation.
- FTA confirmation handling from a real provider.
- FTA reporting.
- Production archive retention guarantees.
- Legal/certification guarantee.
- PDF treatment as a UAE compliance artifact.
- Hosted/customer-data proof.
- Broad E2E/smoke/full-test coverage.

## Runtime Boundaries

- Controlled beta/user-testing only.
- UAE Peppol/PINT-AE readiness only.
- Disabled/mock ASP behavior only.
- No real ASP connection.
- No real ASP network call.
- No FTA reporting.
- No real Peppol transmission.
- No production compliance claim.
- No Vercel/Supabase or production infrastructure change.
- No ZATCA production behavior. ZATCA remains parked and blocked by default.
- Accounting finalization remains separate from compliance delivery state.

## Official Sources To Re-Verify Before Provider Work

- MoF UAE Electronic Invoicing Guidelines: https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoicing-Guidelines_V-1.0-23Feb2026.pdf
- MoF pre-approved eInvoicing service providers: https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/
- Ministerial Decision No. 244 of 2025: https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-No.-244-of-2025-on-the-Implementation-of-the-Electronic-Invoicing-System.pdf
- OpenPeppol PINT-AE v1.0.1: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/

## Next Engineering Slice

`UAE ASP provider selection research and provider-specific sandbox contract plan`

Scope:

- Compare likely commercial ASP provider paths from current official and provider documentation.
- Select one candidate path for a provider-specific sandbox contract plan.
- Keep all real ASP network calls disabled until provider selection, sandbox credentials, redaction rules, and explicit approval exist.
- Preserve no FTA reporting, no buyer delivery, and no production compliance claim.
