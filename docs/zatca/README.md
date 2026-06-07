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
- `LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD.md` defines the disabled-by-default dummy signing guard command plan and blocker taxonomy.
- `APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md` defines the approval-gated local dummy signing runbook.
- `LOCAL_DUMMY_SIGNING_EXECUTION_RESULTS.md` records the approved local dummy-material SDK run result.
- `DUMMY_SIGNING_RESULT_REVIEW.md` reviews the metadata-only dummy signing evidence and states what the local pass proves and does not prove.
- `PHASE_2_QR_GAP_ANALYSIS.md` maps the remaining Phase 2 QR/signing gaps after local dummy QR generation passed.
- `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md` consolidates key custody, certificate/CSID lifecycle, environment separation, evidence, audit, approval gates, blockers, and implementation sequence.
- `CSID_LIFECYCLE_CHECKLIST.md` tracks local, sandbox, compliance CSID, production CSID, renewal, revocation, audit/evidence, custody, and production gate readiness with conservative status values.
- `KEY_CUSTODY_DECISION_MATRIX.md` compares raw DB PEM, encrypted DB, env vars, secrets manager, KMS-backed signing, HSM/external signing, and local dummy SDK material.
- `SANDBOX_CSID_PREFLIGHT_GUARD.md` documents the no-network sandbox compliance CSID preflight guard and approval blockers.
- `SANDBOX_CSID_PREFLIGHT_RESULTS.md` records the current metadata-only `PREFLIGHT_BLOCKED` result.
- `SANDBOX_OTP_CSID_APPROVAL_PLAN.md` documents the exact future planning approval phrase, preconditions, custody requirements, evidence policy, and blocker taxonomy.
- `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md` documents the future operator/custody/redaction checklist and placeholder command shape without real OTPs, URLs, tokens, or request/response bodies.
- `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md` records the planning-only approval recognition result: `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md` documents the no-network sandbox compliance CSID request execution guard, exact guard phrase, preconditions, refusal boundaries, and status taxonomy.
- `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md` records the current execution guard result: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`; the execute flag remains `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- `CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md` defines the response custody implementation path, safe metadata, provider boundary, redaction rules, failure behavior, and future sequence before any real sandbox response may be processed.
- `CSID_RESPONSE_CUSTODY_GUARD.md` documents the standalone no-network/no-DB response custody guard and blocker taxonomy.
- `CSID_RESPONSE_CUSTODY_RESULTS.md` records the current custody guard result: `CUSTODY_METADATA_SIMULATION_BLOCKED`.
- `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md` defines the planning-only approval gate and preconditions before any future sandbox adapter execution.
- `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md` documents the future operator/custody/OTP/network/redaction checklist with placeholder command shapes only.
- `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md` records the current adapter approval result: `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md` defines the static-only mock-to-real adapter boundary test plan.
- `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md` documents the safe static boundary check workflow and abort conditions.
- `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md` records the current boundary result: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`.
- `evidence/README.md` defines the evidence directory policy and forbids XML bodies, QR payload bodies, keys, OTPs, tokens, headers, and customer payloads.
- `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the current official fixture pass; official samples pass under Java 11, LedgerByte standard fixture passes SDK global validation, and the simplified fixture passes XSD/EN/PIH but remains non-compliant because signing, QR/certificate, CSID, clearance/reporting, and PDF/A-3 are still missing.
- `evidence/generated-xml-fixture-validation-20260606.json` records metadata-only local SDK validation for sanitized generated standard invoice and credit-note fixtures.
- `evidence/local-dummy-signing-execution-20260606.json` records metadata-only local dummy-material SDK sign/QR/signed-validation evidence for the sanitized generated fixtures.
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

The dummy signing guard is blocked by default in plan mode. `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json` reports planned `fatoora -sign`, `-qr`, and `-validate` command shapes without executing them, reads no certificate/private-key bodies, creates no signed XML, and keeps production compliance false.

The approved local dummy signing execution plan is documented in `APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md`. With the exact approval phrase, explicit Java 11-14 through `ZATCA_SDK_JAVA_BIN`, local SDK reference, no-network mode, and sanitized fixture IDs, the guard executed one local dummy-material run. The generated standard invoice and credit-note fixtures passed SDK sign, QR, and signed validation stages under Java 11.0.26. Evidence is metadata-only at `evidence/local-dummy-signing-execution-20260606.json`; production signing, CSID/OTP, network submission, clearance/reporting, PDF/A-3, signed artifact persistence, and production compliance remain disabled.

The follow-up review is now documented in `DUMMY_SIGNING_RESULT_REVIEW.md`, and the QR/signing production gap analysis is documented in `PHASE_2_QR_GAP_ANALYSIS.md`. The local dummy run proves temp-only SDK processing of sanitized fixtures; it does not prove production signing, production Phase 2 QR, CSID lifecycle, clearance/reporting, PDF/A-3, signed artifact storage, or compliance.

The key custody and CSID lifecycle design is now documented in `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`, with `CSID_LIFECYCLE_CHECKLIST.md` and `KEY_CUSTODY_DECISION_MATRIX.md`. Recommended custody direction is KMS/HSM/external signing or equivalent custody for production private keys; secrets manager may be a controlled interim only for non-production/sandbox CSID token/secret/certificate custody after explicit approval. No OTP/CSID/network/signing behavior is enabled by these docs.

The sandbox CSID preflight guard is available through `corepack pnpm zatca:sandbox-csid-preflight -- --plan --no-network --json`. Current base status is `PREFLIGHT_BLOCKED`: references and code surfaces are present, but key custody, CSID response custody, real sandbox adapter execution, OTP approval, CSID request approval, and production signing remain blocked. With the exact planning phrase plus `--approval-plan`, it reports `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`. With the exact execution-guard phrase plus `--execution-guard`, it reports `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`; `--execute-csid-request` reports `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. No OTP/CSID/network/adapter/signing behavior is enabled by the guard.

The CSID response custody guard is available through `corepack pnpm zatca:csid-response-custody-guard -- --plan --no-network --json`. Current approved metadata-only simulation status is `CUSTODY_METADATA_SIMULATION_BLOCKED`: the custody provider and metadata model are present, but provider storage remains disabled, legacy raw PEM-capable fields remain blockers, and no OTP/CSID/network/adapter execution, real response body processing, DB write, token/secret/certificate persistence, env value output, or body exposure occurs.

The sandbox adapter execution approval guard is available through `corepack pnpm zatca:sandbox-adapter-execution-approval -- --plan --no-network --json`. Current approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; the execute-adapter command shape remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. No OTP/CSID/network/adapter execution, request body creation, response body processing, DB write, env value output, or body exposure occurs.

The sandbox adapter mock-to-real boundary check is available through `corepack pnpm zatca:sandbox-adapter-boundary-check -- --plan --no-network --json --static-only`. Current boundary status is `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`; the check detects mock, disabled, and sandbox adapter boundaries by static inspection only. No OTP/CSID/network/adapter execution, mock adapter execution, request body creation, response body processing, DB write, env value output, or body exposure occurs.

Latest recommended ZATCA prompt: `ZATCA sandbox adapter no-network contract tests`.

## Reference Folder Rule

The local official material is currently under `reference/`, not `references/`. Future ZATCA implementation work should start with `OFFICIAL_IMPLEMENTATION_MAP.md` and `ZATCA_CODE_GAP_REPORT.md`, then verify exact sections/pages against the source files before changing application logic.
