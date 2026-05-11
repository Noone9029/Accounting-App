# ZATCA Engineering Checklists

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

These notes track LedgerByte's local ZATCA Phase 2 groundwork and the manual evidence still needed before any real sandbox or production integration. They are not legal certification and do not enable real ZATCA network calls.

## Files

- `PHASE_2_COMPLIANCE_MAP.md` maps current code to future Phase 2 requirement areas.
- `API_INTEGRATION_CHECKLIST.md` tracks sandbox/simulation/production API verification work.
- `XML_REQUIREMENTS_CHECKLIST.md` tracks UBL, KSA extension, canonicalization, and signing-input work.
- `QR_REQUIREMENTS_CHECKLIST.md` tracks TLV QR requirements.
- `CSR_CSID_ONBOARDING_CHECKLIST.md` tracks OTP, CSR, compliance CSID, and production CSID work.
- `PDF_A3_ARCHIVE_CHECKLIST.md` tracks PDF/A-3 and embedded XML archive requirements.
- `SECURITY_KEY_MANAGEMENT_CHECKLIST.md` tracks key custody, logging, and operational controls.
- `TESTING_AND_VALIDATION_CHECKLIST.md` tracks official validation, fixtures, smoke, and regression work.

## Current Rule

Keep `ZATCA_ADAPTER_MODE=mock` and `ZATCA_ENABLE_REAL_NETWORK=false` until official endpoint URLs, request/response payloads, credentials, signing requirements, and validation expectations are verified.
