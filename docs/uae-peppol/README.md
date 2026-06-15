# UAE Peppol/PINT-AE Readiness

LedgerByte now has a controlled-beta UAE eInvoicing readiness foundation over the neutral compliance core.

## Current Positioning

Safe wording:

- UAE eInvoicing-ready accounting software.
- Built for UAE Peppol/PINT-AE readiness.
- ASP connectivity foundation is disabled by default.

Do not claim:

- FTA certified.
- Peppol certified.
- Official UAE eInvoicing provider.
- Accredited ASP.
- Production UAE eInvoicing compliance.

## Implemented In This Branch

- Nullable UAE organization/contact readiness fields.
- UAE TIN/TRN validation helpers.
- Peppol participant ID derivation from 10-digit TIN as `0235{TIN}`.
- Local readiness checklist for organization and buyer endpoint data.
- Fixture-tested PINT-AE-like invoice and credit-note XML generation.
- Compliance-core document lifecycle, validation result, event timeline, transmission state, and XML/evidence archive metadata.
- Read-only settings page showing UAE readiness, buyer endpoint coverage, rollout dates, official references, and prohibited claims.

## Not Implemented

- Real ASP network integration.
- Provider-specific payload contract.
- EmaraTax onboarding automation.
- FTA confirmation handling from a real provider.
- Production archive retention guarantees.
- Legal/certification guarantee.
- PDF treatment as a UAE compliance artifact.

## Official Sources To Re-Verify Before Provider Work

- MoF UAE Electronic Invoicing Guidelines: https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoicing-Guidelines_V-1.0-23Feb2026.pdf
- MoF pre-approved eInvoicing service providers: https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/
- Ministerial Decision No. 244 of 2025: https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-No.-244-of-2025-on-the-Implementation-of-the-Electronic-Invoicing-System.pdf
- OpenPeppol PINT-AE v1.0.1: https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/

## Next Engineering Slice

`UAE Peppol/PINT-AE data-entry UX and invoice validation panels`

Scope:

- Add editable UAE fields to organization/contact forms.
- Add invoice and credit-note detail validation panels.
- Add document timeline and archive metadata panels.
- Keep ASP send buttons disabled until a provider is selected and explicitly approved.
