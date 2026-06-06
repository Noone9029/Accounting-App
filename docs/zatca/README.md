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
- `OFFICIAL_SDK_VALIDATION_READINESS.md` documents local no-network SDK validation prerequisites, evidence, and blockers.
- `ZATCA_SDK_FIXTURE_REGISTRY.md` registers official and LedgerByte local fixture IDs for the repeatable local SDK validation wrapper.
- `ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md` defines the metadata-only evidence JSON format and redaction flags.
- `ZATCA_SDK_CI_RUNNER_PLAN.md` documents the no-network SDK CI readiness posture, blocker status, runner options, and documentation-only workflow sketch.
- `LOCAL_SIGNED_XML_VALIDATION_PLAN.md` defines the next local signed XML guardrails before any future dummy-material signing experiment.
- `evidence/README.md` defines the evidence directory policy and forbids XML bodies, QR payload bodies, keys, OTPs, tokens, headers, and customer payloads.
- `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the current official fixture pass; official samples pass under Java 11, LedgerByte standard fixture passes SDK global validation, and the simplified fixture passes XSD/EN/PIH but remains non-compliant because signing, QR/certificate, CSID, clearance/reporting, and PDF/A-3 are still missing.
- `evidence/generated-xml-fixture-validation-20260606.json` records metadata-only local SDK validation for sanitized generated standard invoice and credit-note fixtures.
- `ZATCA_CODE_GAP_REPORT.md` compares current LedgerByte code to the inspected official references and lists safe implementation order.
- `QR_REQUIREMENTS_CHECKLIST.md` tracks TLV QR requirements.
- `CSR_CSID_ONBOARDING_CHECKLIST.md` tracks OTP, CSR, compliance CSID, and production CSID work.
- `SANDBOX_CSID_ONBOARDING_RUNBOOK.md` defines the future sandbox onboarding gate without requesting OTP or making network calls.
- `PDF_A3_ARCHIVE_CHECKLIST.md` tracks PDF/A-3 and embedded XML archive requirements.
- `SECURITY_KEY_MANAGEMENT_CHECKLIST.md` tracks key custody, logging, and operational controls.
- `ZATCA_ENVIRONMENT_SEPARATION_POLICY.md` documents local mock, local SDK, sandbox, simulation, and production separation rules.
- `ZATCA_KEY_CUSTODY_DECISION_DRAFT.md` records private-key and CSID custody options and production blockers.
- `ZATCA_INVOICE_ELIGIBILITY_MATRIX.md` maps current LedgerByte documents to ZATCA relevance.
- `ZATCA_AUDIT_EVIDENCE_STANDARD.md` defines allowed evidence and forbidden secret/body logging.
- `TESTING_AND_VALIDATION_CHECKLIST.md` tracks official validation, fixtures, smoke, and regression work.

## Current Rule

Keep `ZATCA_ADAPTER_MODE=mock` and `ZATCA_ENABLE_REAL_NETWORK=false` until official endpoint URLs, request/response payloads, credentials, signing requirements, and validation expectations are verified.

Preparation gates are documentation/readiness gates only. They do not enable production compliance, real network calls, OTP submission, CSID requests, signing, clearance/reporting, PDF/A-3, or production credentials.

The SDK validation pipeline is local/no-network only. `corepack pnpm zatca:sdk-validate-local -- --all --no-network --json` may produce metadata-only evidence, but it must not be used as production compliance proof.

Generated LedgerByte XML fixture validation is also local/no-network only. The generated standard invoice and credit note fixtures passed the local official SDK wrapper under Java 11.0.26, while default Java 17 remains a safe blocker. This does not enable signing, CSID onboarding, clearance/reporting, PDF/A-3, real network calls, production credentials, or production compliance.

SDK CI validation is not enabled. `corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json` currently reports `CI_BLOCKED_MISSING_SDK_REFERENCE` because the local SDK reference is ignored and not reproducible from a fresh checkout; default Java 17 is also unsupported. PR CI remains non-ZATCA.

Local signed XML validation is planning-only. `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json` reports metadata-only blockers and does not execute signing, QR, hash, validation, OTP/CSID, network, clearance/reporting, PDF/A-3, deploy, migration, seed, reset, delete, or email behavior.

## Reference Folder Rule

The local official material is currently under `reference/`, not `references/`. Future ZATCA implementation work should start with `OFFICIAL_IMPLEMENTATION_MAP.md` and `ZATCA_CODE_GAP_REPORT.md`, then verify exact sections/pages against the source files before changing application logic.
