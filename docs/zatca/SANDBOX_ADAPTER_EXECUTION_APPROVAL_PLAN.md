# ZATCA Sandbox Adapter Execution Approval Plan

## 1. Purpose and Scope

This document defines the approval boundary for any future ZATCA sandbox adapter execution. It is planning only. It does not execute the sandbox adapter, call ZATCA, request an OTP, request a compliance CSID, request a production CSID, create a real request body, process a real response body, store secrets, sign XML, generate QR payloads, perform clearance/reporting, or create PDF-A3 artifacts.

The approval goal is to prove that LedgerByte remains fail-closed until adapter execution, OTP handling, CSID response custody, network gates, and metadata-only evidence are all approved in a later sprint.

## 2. Current State

- Latest inspected pushed state before this sprint: `1e7aa3bc229bf2baa05d6a885539667eff49311b` (`Plan ZATCA CSID response custody`).
- CSID response custody planning exists and remains blocked by custody-provider and legacy raw PEM blockers.
- Sandbox CSID request execution guard exists and blocks execution.
- No OTP, CSID, ZATCA network, sandbox adapter, request body, response body, DB write, signing, QR, clearance/reporting, or PDF-A3 action is authorized by this plan.

## 3. Official References Inspected

Only repo-local official references were inspected structurally:

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties`

No unofficial sources were used. No example OTP, CSID secret, binary security token, auth header, request body, response body, certificate body, or private-key body was copied.

## 4. Existing Adapter Model Findings

- `apps/api/src/zatca/zatca.config.ts` supports `mock`, `sandbox-disabled`, and `sandbox` modes.
- Real network readiness is gated by adapter mode, an explicit real-network flag, and sandbox base URL presence.
- `apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts` throws a real-network-disabled error for compliance CSID, production CSID, compliance checks, clearance, and reporting.
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts` is local mock-only and must not be treated as a sandbox adapter execution approval.
- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts` contains future network and response-processing paths. Its compliance CSID method currently builds a request plan before throwing, so this approval guard must not call that adapter or mapper.
- `apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts` remains disabled for real CSID token, secret, and certificate custody.
- `apps/api/prisma/schema.prisma` still contains legacy raw PEM-capable fields: `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem`.

## 5. What Future Approval Would Authorize

A later, separate approval sprint may authorize a controlled sandbox-only adapter execution attempt after all listed preconditions are satisfied. That future approval would only authorize the adapter execution boundary and metadata evidence collection; it would not authorize production onboarding or downstream Phase 2 operations.

## 6. What Approval Does Not Authorize

This planning phrase does not authorize:

- real ZATCA network calls in this sprint
- OTP requests, capture, storage, logging, or reuse
- compliance CSID requests
- production CSID requests
- request body creation
- response body processing
- response body persistence
- DB writes
- production credentials
- production signing
- clearance/reporting
- PDF-A3
- QR generation
- signed XML generation or validation
- secret, token, certificate, private-key, OTP, auth-header, request-body, or response-body exposure

## 7. Exact Future Approval Phrase

`I approve ZATCA sandbox adapter execution planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no request/response body exposure, no secret exposure, and metadata-only evidence.`

This phrase is for planning and guard recognition only. It does not execute the adapter.

## 8. Preconditions Before Adapter Execution Could Be Allowed

- CSID response custody approved and tested with no raw body return to API, UI, logs, or evidence.
- Key custody boundary approved; raw private key and certificate bodies must not be persisted as tenant credentials.
- OTP capture handling approved with no logging, persistence, replay, or evidence exposure.
- Sandbox base URL configured through approved environment management, with guard output showing presence only.
- Real network gate explicitly approved for sandbox only.
- Sandbox adapter execution gate explicitly approved in a separate future prompt.
- Metadata-only evidence contract approved.
- No production credentials present.
- No production CSID.
- No clearance/reporting.
- No PDF-A3.
- No signing enablement.
- No automatic retry behavior.

## 9. Adapter Execution Policy

- Sandbox only.
- Production remains blocked.
- No automatic retries.
- No request or response body logging.
- No raw response storage.
- No adapter execution without exact approval phrase and a separate future prompt.
- Guard scripts must inspect source and env presence only; they must not import or instantiate the adapter.

## 10. Env Handling Policy

- Guard output may report env presence booleans only.
- Env values must not be printed, copied into docs, or included in evidence.
- Required future env presence includes adapter mode, real-network gate, sandbox base URL, and approved CSID custody provider.
- Any missing required env gate must fail closed.
- Any production credential presence must block sandbox approval until removed or isolated from the run context.

## 11. OTP Boundary

OTP handling remains blocked. A future approved flow must use a one-time operator-provided value, pass it only to the approved sandbox request boundary, never persist it, never log it, never return it, never include it in evidence, and clear process-local references after use.

## 12. CSID Response Custody Dependency

Sandbox adapter execution must not be allowed to process real response bodies until CSID response custody is approved. Response fields that structurally represent certificate material, binary/security token material, secret material, and request identifiers must be separated into external custody and metadata-only application records.

## 13. Metadata-Only Evidence Format

Allowed evidence fields:

- command shape
- approval phrase matched true/false
- adapter approval status
- execution status
- env presence booleans
- sandboxAdapterExecuted false/true in future
- networkCallsMade false/true in future
- requestBodyCreated false/true in future
- responseBodyProcessed false/true in future
- custody prerequisite booleans
- blocker and warning codes

Forbidden evidence fields:

- OTP values
- CSID material
- binary/security tokens
- secrets
- auth headers
- request bodies
- response bodies
- certificate bodies
- private-key bodies
- env values

## 14. Audit/Approval Record Requirements

A future execution sprint must record who approved the run, when the run was approved, which non-production EGS unit was in scope, the exact command shape, the metadata-only evidence payload, and the abort decision if any blocker is present. The audit record must not include bodies or secrets.

## 15. Abort Conditions

Abort before adapter execution if any of these are true:

- approval phrase is absent or invalid
- CSID response custody is disabled or unapproved
- legacy raw PEM-capable fields remain in the execution path
- OTP capture policy is missing
- sandbox base URL env presence is absent
- real network gate env presence is absent
- production credential presence is detected
- request/response body logging cannot be proven disabled
- evidence would include any body or secret
- clearance/reporting, signing, QR, or PDF-A3 would be enabled

## 16. What Remains Blocked After Approval

Even after this planning approval is recognized, adapter execution remains blocked. Real sandbox compliance CSID request execution, CSID response body processing, DB writes, production CSID lifecycle, signing, clearance/reporting, QR generation, PDF-A3, retry queue, and signed-artifact storage remain blocked.

## 17. Required Tests Before Future Execution

- no-network approval guard tests
- env presence-only tests
- no secret/body output tests
- adapter import/instantiation prevention tests
- request body creation remains false tests
- response body processing remains false tests
- custody provider approved/disabled branch tests
- OTP non-persistence and non-logging tests
- production credential presence blocker tests
- strict-mode blocked-status tests

## 18. Recommended Next Prompt

`ZATCA sandbox adapter mock-to-real boundary test plan`
