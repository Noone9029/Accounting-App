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
- Local official UAE PINT-AE serializer/rule-pack foundation with `urn:peppol:pint:billing-1@ae-1`, `urn:peppol:bis:billing`, endpoint scheme `0235`, structured rule results, invoice XML generation, and credit-note reason/original-reference enforcement.
- Source-backed official mappings for commercial invoice type code `380`, predefined endpoint participant identifications, and UAE transaction type flags.
- Source-required guards for unknown or legacy transaction flag mappings. These values are not guessed.
- Local scenario fixture validation suite for standard tax invoice, commercial invoice, tax credit note, predefined endpoint scenarios, negative structured-error scenarios, blocked unsupported scenarios, and a metadata-only local QA summary.
- Compliance-core document lifecycle, validation result, event timeline, transmission state, and XML/evidence archive metadata.
- Provider-neutral ASP adapter contract with normalized provider keys, statuses, and capability flags.
- Disabled ASP adapter that blocks submission, rejects non-mock webhooks, returns no evidence, and never emits sent, FTA-reported, or buyer-delivered states.
- Mock ASP adapter for deterministic local tests only. Mock accepted/rejected submissions require explicit mock mode and never claim real ASP submission, FTA reporting, or buyer delivery.
- Future provider placeholders for Complyance, ClearTax, EDICOM, and generic ASP keys that return safe not-implemented results.
- Redacted provider config summary, arbitrary external URL blocking, and no plaintext secret response behavior.
- Provider-selection research matrix, sandbox contract plan, and outreach template for future UAE ASP evaluation only.
- Provider-specific outreach execution pack with response tracker, first-contact email drafts, and evaluation rubric for collecting provider evidence before adapter coding.
- Read-only API readiness endpoints for sales invoices and sales credit notes.
- API/service surface for provider readiness summary, redacted config test, local/mock transmission preview, explicit mock submit, and provider status timeline.
- Finalized sales invoice and finalized sales credit-note readiness panels with explicit local-only validation actions.
- Settings page showing UAE readiness, buyer endpoint coverage, rollout dates, official references, and prohibited claims.
- Metadata-only validation/archive behavior for local readiness and official local serializer output: status, hashes, warnings/errors, size, filename, and source links where applicable.

## Not Implemented

- Real ASP network integration.
- Real ASP validation.
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
- Provider-specific payload contract and real provider validation/submission behavior.
- Reverse-charge and allowance/discount PINT-AE fixtures until source-backed values and model support exist.

## Runtime Boundaries

- Controlled beta/user-testing only.
- UAE Peppol/PINT-AE readiness only.
- Disabled/mock ASP behavior only.
- No real ASP connection.
- No real ASP validation.
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
- MoF Accreditation of eInvoicing Service Providers: https://mof.gov.ae/en/services/accreditation-of-einvoicing-service-providers/
- Ministerial Decision No. 244 of 2025: https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-No.-244-of-2025-on-the-Implementation-of-the-Electronic-Invoicing-System.pdf
- OpenPeppol PINT-AE v1.0.1: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/
- OpenPeppol BIS Billing 3.0: https://docs.peppol.eu/poacc/billing/3.0/

## Provider Research Docs

- `docs/uae-peppol/UAE_PINT_AE_OFFICIAL_CODE_TODO_REVIEW.md`
- `docs/uae-peppol/UAE_PINT_AE_SCENARIO_FIXTURE_COVERAGE.md`
- `docs/uae-peppol/UAE_ASP_PROVIDER_SELECTION_MATRIX.md`
- `docs/uae-peppol/UAE_ASP_SANDBOX_CONTRACT_PLAN.md`
- `docs/uae-peppol/UAE_ASP_PROVIDER_OUTREACH_TEMPLATE.md`
- `docs/uae-peppol/provider-outreach/README.md`
- `docs/uae-peppol/provider-outreach/PROVIDER_OUTREACH_TRACKER.md`
- `docs/uae-peppol/provider-outreach/PROVIDER_RESPONSE_EVALUATION_RUBRIC.md`
- Provider-specific email drafts under `docs/uae-peppol/provider-outreach/`

Current recommendation: start outreach with the most API-friendly MoF-listed providers first, beginning with Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, and Comarch. Do not implement a real provider until sandbox docs and commercial terms are reviewed.

## Next Engineering Slice

`UAE ASP provider sandbox evidence review`

Scope:

- Collect and review actual provider sandbox docs, sample payloads, status/error schemas, idempotency rules, webhook signing, evidence download, and commercial terms.
- Keep provider-specific payload contracts blocked until provider sandbox docs exist.
- Keep all real ASP network calls disabled until provider selection, sandbox credentials, redaction rules, and explicit approval exist.
- Preserve no FTA reporting, no buyer delivery, and no production compliance claim.
