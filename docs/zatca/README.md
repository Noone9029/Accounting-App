# ZATCA Engineering Checklists

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

These notes track LedgerByte's local ZATCA Phase 2 groundwork and the manual evidence still needed before any real sandbox or production integration. They are not legal certification and do not enable real ZATCA network calls.

## Files

- `PHASE_2_COMPLIANCE_MAP.md` maps current code to future Phase 2 requirement areas.
- `API_INTEGRATION_CHECKLIST.md` tracks sandbox/simulation/production API verification work.
- `XML_REQUIREMENTS_CHECKLIST.md` tracks UBL, KSA extension, canonicalization, and signing-input work.
- `XML_FIELD_MAPPING.md` maps LedgerByte fields to the current local XML skeleton and future official targets.
- `XML_FIXTURES_GUIDE.md` explains local dev XML fixtures and how to add official fixtures later.
- `REFERENCES_INVENTORY.md` inventories the local `reference/` folder and classifies docs, SDK tooling, schemas, samples, and non-ZATCA artifacts.
- `OFFICIAL_IMPLEMENTATION_MAP.md` maps official reference files to future implementation areas and risk levels.
- `SDK_USAGE_PLAN.md` documents how the Java SDK should be evaluated safely before integration.
- `SDK_VALIDATION_WRAPPER.md` documents the test-only readiness and dry-run wrapper endpoints.
- `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the current official fixture pass; official samples pass under Java 11, and LedgerByte local fixtures now clear first structural SDK checks but remain non-compliant because PIH/hash-chain, signing, QR, CSID, clearance/reporting, and PDF/A-3 are still missing.
- `ZATCA_CODE_GAP_REPORT.md` compares current LedgerByte code to the inspected official references and lists safe implementation order.
- `QR_REQUIREMENTS_CHECKLIST.md` tracks TLV QR requirements.
- `CSR_CSID_ONBOARDING_CHECKLIST.md` tracks OTP, CSR, compliance CSID, and production CSID work.
- `PDF_A3_ARCHIVE_CHECKLIST.md` tracks PDF/A-3 and embedded XML archive requirements.
- `SECURITY_KEY_MANAGEMENT_CHECKLIST.md` tracks key custody, logging, and operational controls.
- `TESTING_AND_VALIDATION_CHECKLIST.md` tracks official validation, fixtures, smoke, and regression work.

## Current Rule

Keep `ZATCA_ADAPTER_MODE=mock` and `ZATCA_ENABLE_REAL_NETWORK=false` until official endpoint URLs, request/response payloads, credentials, signing requirements, and validation expectations are verified.

## Reference Folder Rule

The local official material is currently under `reference/`, not `references/`. Future ZATCA implementation work should start with `OFFICIAL_IMPLEMENTATION_MAP.md` and `ZATCA_CODE_GAP_REPORT.md`, then verify exact sections/pages against the source files before changing application logic.
