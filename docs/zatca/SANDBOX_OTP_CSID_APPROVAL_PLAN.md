# ZATCA Sandbox OTP And Compliance CSID Approval Plan

## 2026-06-07 CSID Response Custody Guard Update

Follow-up custody planning is now documented in `CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `CSID_RESPONSE_CUSTODY_GUARD.md`, and `CSID_RESPONSE_CUSTODY_RESULTS.md`. The custody guard status is `CUSTODY_METADATA_SIMULATION_BLOCKED`; it did not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, process real response bodies, attempt DB writes, persist token/secret/certificate bodies, print env values, or expose bodies.

The OTP/CSID approval plan remains planning-only. Custody approval does not yet exist, so request execution remains blocked.

2026-06-07 adapter approval follow-up: `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, and `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md` now document the sandbox adapter approval gate. Current adapter approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. Recommended next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.

Date: 2026-06-07

Status: Approval design only. No OTP, CSID, ZATCA network call, sandbox adapter execution, signing, clearance/reporting, PDF-A3, or production compliance is enabled.

## 1. Purpose And Scope

This plan defines the future approval phrase, preconditions, evidence contract, custody requirements, sandbox adapter gates, and failure behavior for a later sandbox OTP and compliance CSID request sprint.

This task prepares the permission slip only. It does not request an OTP, accept an OTP, request a compliance CSID, request a production CSID, call ZATCA, execute the sandbox adapter, expose secrets, store response bodies, sign XML, generate QR payloads, run clearance/reporting, implement PDF-A3, or change production/beta data.

## 2. Current State

- Latest approved guard commit before this plan: `68f94334 Guard ZATCA sandbox CSID preflight`.
- Reconciliation on 2026-06-07 found the latest pushed branch state at `90dec971 Plan ZATCA sandbox CSID approval`; this approval plan, runbook, result doc, guard extension, and guard tests already existed and were updated in place instead of duplicated.
- Preflight guard exists at `scripts/zatca-sandbox-csid-preflight.cjs`.
- Preflight tests exist at `scripts/zatca-sandbox-csid-preflight.test.cjs`.
- Package scripts exist: `zatca:sandbox-csid-preflight` and `test:zatca-sandbox-csid-preflight`.
- Current preflight without approval remains `PREFLIGHT_BLOCKED`.
- Approval recognition with the exact phrase and `--approval-plan` returns `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- Legacy `ZatcaEgsUnit` raw PEM-capable fields remain present.
- `ZatcaComplianceCsidCustodyRecord` exists for metadata-only custody records.
- CSID response custody provider exists but remains disabled/unapproved.
- Sandbox adapter exists but compliance CSID execution remains blocked.
- Mock adapter exists and is mock-only.
- Production signing and production compliance remain disabled.

## Reconciliation Result

- Required baseline ZATCA docs, scripts, package scripts, and handoff files were present.
- Existing approval docs were found:
  - `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`
  - `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`
  - `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`
- Existing approval handling was found in `scripts/zatca-sandbox-csid-preflight.cjs` and `scripts/zatca-sandbox-csid-preflight.test.cjs`.
- The branch was aligned with its upstream at the time of reconciliation.
- The worktree also contained unrelated dirty inventory, AP, marketing, and graph output files; they are out of scope for this plan and must not be staged with ZATCA approval changes.
- No approval evidence was invented; the observed result comes from the no-network planning guard only.

## 3. Official References Inspected

Only repo-local official references under `reference/` were inspected.

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Inspection was structural. CSR files were used for property keys only. PDF and spreadsheet inspection recorded presence, page/sheet structure, and topic coverage only. No example OTPs, CSID secrets, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies were copied.

## 4. What The Previous Preflight Proved

- Required planning docs exist.
- Official local reference files exist.
- CSR template/example files exist.
- Required CSR property keys are present:
  - `csr.common.name`
  - `csr.serial.number`
  - `csr.organization.identifier`
  - `csr.organization.unit.name`
  - `csr.organization.name`
  - `csr.country.name`
  - `csr.invoice.type`
  - `csr.location.address`
  - `csr.industry.business.category`
- Relevant source files exist.
- Environment variables are inspected by presence only.
- Sandbox adapter execution is blocked.
- CSID response custody is blocked.
- Production signing and production compliance remain false.

The preflight did not prove OTP readiness, CSID issuance, compliance invoice checks, production CSID lifecycle, production signing, Phase 2 QR, clearance/reporting, PDF-A3, signed artifact storage, retry/error handling, or legal/accounting review.

## 5. What Approval Would Authorize In A Future Separate Sprint

The approval phrase authorizes a later sprint to prepare for a sandbox-only compliance CSID request execution guard. It can be used by tooling to recognize that the operator approved planning for a future sandbox OTP and compliance CSID request path.

It may authorize only:

- Planning-only recognition of the exact phrase.
- Verification that required non-secret metadata and custody gates are present.
- A future execution guard design that still requires separate implementation and verification.
- Metadata-only evidence collection.
- Manual operator checklist preparation.

## 6. What Approval Does Not Authorize

The phrase does not authorize:

- Requesting or obtaining an OTP.
- Accepting, logging, echoing, storing, or committing an OTP.
- Requesting a compliance CSID.
- Requesting a production CSID.
- Calling any ZATCA endpoint.
- Executing the sandbox adapter.
- Creating request bodies or processing response bodies.
- Storing CSID response bodies in docs, logs, normal DB tables, or evidence.
- Enabling signing, clearance, reporting, PDF-A3, or production compliance.
- Using customer/vendor data.
- Changing Vercel, Supabase, env vars, migrations, seed/reset/delete state, deploys, or email.

## 7. Exact Future Approval Phrase

```text
I approve ZATCA sandbox OTP and compliance CSID request planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, and metadata-only evidence.
```

This phrase is for future planning/approval recognition only. It must not be treated as permission to request an OTP, request a CSID, call ZATCA, execute the sandbox adapter, expose secrets, or enable signing.

## 8. Preconditions Before Approval Can Be Used

- Key custody design must be accepted.
- CSID response custody must be approved before any response body can exist.
- Sandbox adapter execution must be explicitly enabled by a separate future execution guard.
- Sandbox base URL must be configured safely by presence only in preflight evidence.
- OTP must be supplied manually and ephemerally only in a future approved execution path.
- No production credentials may be configured or used.
- Production signing must remain disabled.
- Clearance/reporting must remain disabled.
- PDF-A3 must remain disabled.
- Evidence must remain metadata-only.
- No customer or vendor data may be used.

## 9. OTP Handling Policy

- OTP entry is manual only.
- OTP values must never be committed.
- OTP values must never be logged.
- OTP values must never be persisted.
- OTP values must never be echoed in stdout, stderr, API responses, UI success/error copy, docs, evidence, audit event payloads, or test output.
- OTP values must not be placed in normal env files.
- OTP presence may be represented as a boolean only.
- Redaction flags are required in evidence.
- Any accidental OTP exposure is an abort condition and incident trigger.

## 10. Compliance CSID Request Policy

- Scope is sandbox/compliance only.
- Production CSID request remains prohibited.
- Clearance/reporting remains prohibited.
- PDF-A3 remains prohibited.
- Signing enablement remains prohibited.
- CSID response body custody must be approved before execution.
- Request/response body printing and persistence remain prohibited.
- The future request path must fail closed if custody, adapter, redaction, or approval gates are incomplete.

## 11. CSID Response Custody Policy

Official onboarding and compliance CSID material indicates that response handling is part of the onboarding lifecycle. LedgerByte must treat any future response as sensitive until a provider-backed custody design is approved.

Structurally, future response custody must account for:

- Non-secret identifiers and timestamps that may be recorded as metadata.
- Certificate-related material that must not be printed in evidence.
- Token/secret credential material that must not be printed in evidence.
- Expiry/renewal/revocation metadata.
- Request outcome metadata and redacted error categories.

Forbidden from docs, logs, API/UI responses, evidence, and normal DB fields:

- CSID body material.
- Binary security token bodies.
- Secret values.
- Certificate bodies.
- Private-key bodies.
- OTP values.
- Auth headers.
- Request bodies.
- Response bodies.

Allowed metadata:

- `requestAttemptId`
- `environment`
- `egsUnitId`
- `csrConfigHash`
- `csrBodyRedacted: true`
- `otpProvided: true`
- `otpValueRedacted: true`
- `networkCallsMade`
- `complianceCsidRequested`
- `responseReceived`
- `requestIdPresent`
- `certificateRequestIdPresent`
- `tokenPresent`
- `secretPresent`
- `certificatePresent`
- `tokenBodyStoredInProvider`
- `secretBodyStoredInProvider`
- `certificateBodyStoredInProvider`
- `bodyFieldsRedacted: true`
- `productionComplianceEnabled: false`

The provider must be a secrets manager, KMS/HSM-backed custody service, or external signing/custody service approved for this sandbox purpose. Normal application tables must store metadata only.

## 12. Sandbox Adapter Execution Policy

- Current guard recognition does not execute the adapter.
- Future execution requires a separate guard named by the next prompt.
- The future guard must verify official endpoint details from repo-local official references before any implementation.
- Adapter execution must require explicit no-production checks.
- Adapter execution must fail closed if real network enablement, sandbox base URL, custody provider, approval phrase, redaction, or evidence schema gates are missing.
- Adapter execution must not log request/response bodies.

## 13. Metadata-Only Evidence Format

Suggested future evidence record:

```json
{
  "status": "PLANNED_OR_BLOCKED",
  "environment": "SANDBOX_ONLY",
  "approvalPhraseMatched": true,
  "approvalPhrasePrinted": false,
  "operatorApprovedAt": "ISO-8601 timestamp",
  "otpRequested": false,
  "otpProvided": false,
  "otpValueRedacted": true,
  "complianceCsidRequested": false,
  "productionCsidRequested": false,
  "networkCallsMade": false,
  "sandboxAdapterExecuted": false,
  "productionSigningEnabled": false,
  "productionComplianceEnabled": false,
  "clearanceReportingEnabled": false,
  "pdfA3Enabled": false,
  "requestBodyPrinted": false,
  "responseBodyPrinted": false,
  "tokenBodyExposed": false,
  "secretBodyExposed": false,
  "certificateBodyExposed": false,
  "privateKeyBodyExposed": false,
  "evidencePolicy": "metadata-only"
}
```

Any later execution evidence must retain the same body redaction booleans and must not include secrets or payload bodies.

## 14. Audit/Approval Record Requirements

Future audit records must capture:

- Who approved the planning gate.
- Approval timestamp.
- Exact approval scope label.
- Approval phrase match boolean.
- Approval phrase echo boolean set to false.
- Sandbox-only environment.
- Whether custody was approved.
- Whether adapter execution was approved.
- Whether OTP was requested, provided, stored, logged, or redacted.
- Whether CSID was requested.
- Whether network calls were made.
- Whether any body/secret exposure occurred.

Audit payloads must not include OTP values, CSID bodies, token bodies, secret values, auth headers, certificate bodies, private-key bodies, request bodies, response bodies, XML bodies, or QR payload bodies.

## 15. Failure/Rollback Behavior

Abort immediately if:

- Approval phrase is missing or incorrect.
- `--approval-plan` is missing.
- Key custody is not approved.
- CSID response custody is not approved.
- Sandbox adapter execution is not explicitly enabled by the future guard.
- Sandbox base URL is absent or unverified.
- Production credential-like configuration is present.
- OTP value would be logged, echoed, persisted, or committed.
- Request/response body capture is enabled.
- Any production signing, clearance/reporting, PDF-A3, or production compliance flag is true.

Rollback after an abort:

- Do not retry automatically.
- Do not preserve OTP values.
- Do not write response bodies.
- Revoke or mark any metadata-only attempt as aborted.
- Record only redacted failure category, timestamp, operator, and booleans.
- Re-run preflight after fixing custody and configuration blockers.

## 16. What Remains Blocked After Successful Compliance CSID

Even after a future successful sandbox compliance CSID request, these remain blocked:

- Compliance invoice checks.
- Production CSID request.
- Production certificate lifecycle.
- Production signing.
- Production Phase 2 QR proof.
- Clearance/reporting.
- PDF-A3.
- Signed artifact storage.
- Retry/error queue.
- Legal/accounting review.
- Official production readiness review.

## 17. Required Tests Before Future Execution

- Exact approval phrase recognition.
- Invalid phrase rejection without echo.
- OTP presence-only and redaction tests.
- CSID response body redaction tests.
- Provider custody disabled test.
- Provider custody enabled-without-body-output test.
- Sandbox adapter execution disabled test.
- Production credential blocker test.
- Production signing/clearance/reporting/PDF-A3 false tests.
- Network call only possible under the future explicit execution guard.
- No request/response body output tests.
- Strict mode exits nonzero for blocked states.

## 18. Readiness Metadata Decision

No shared API/UI/schema readiness metadata fields were added in this continuation. The existing guard output already reports the safe planning metadata booleans for `otpRequested`, `complianceCsidRequested`, `sandboxAdapterExecuted`, approval recognition, custody approval, production compliance, and `metadata-only` evidence; adding broader runtime fields would risk implying execution support that does not exist.

## 19. Recommended Next Prompt

Completed follow-ups: `ZATCA sandbox CSID request execution guard`, `ZATCA CSID response custody implementation plan`, and `ZATCA sandbox adapter execution approval plan`.

Next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`

## 20. Sandbox CSID Request Execution Guard Result

The next guard is now documented in `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md`, with observed metadata in `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.

Execution guard approval recognition returns `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`. `--execute-csid-request` returns `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. No OTP, CSID request, network call, sandbox adapter execution, request body creation, response body processing, secret persistence, signing, clearance/reporting, PDF-A3, or production compliance behavior was performed.

Recommended next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.
