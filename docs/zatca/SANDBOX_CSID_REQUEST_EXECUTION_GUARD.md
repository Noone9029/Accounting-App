# ZATCA Sandbox CSID Request Execution Guard

## 1. Purpose And Scope

This guard defines a no-network execution boundary for a future ZATCA sandbox compliance CSID request. It proves LedgerByte can recognize a narrowly scoped execution-guard approval while still refusing CSID request execution by default.

This sprint does not request OTPs, request compliance CSIDs, request production CSIDs, call ZATCA, execute the sandbox adapter, sign invoices, generate QR payloads, validate signed XML, perform clearance/reporting, create PDF/A-3, mutate env, run migrations, or persist secrets.

## 2. Current State

- Existing preflight script extended: `scripts/zatca-sandbox-csid-preflight.cjs`.
- Existing preflight tests extended: `scripts/zatca-sandbox-csid-preflight.test.cjs`.
- Base status remains `PREFLIGHT_BLOCKED`.
- Execution guard status with the exact guard phrase and `--execution-guard`: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- Execution attempt flag `--execute-csid-request` remains blocked as `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- Reconciliation result: required baseline ZATCA docs/scripts were present at `6e486f3c Plan ZATCA sandbox CSID approval`; no prior execution guard docs/scripts existed.

## 3. Official References Inspected

Only repo-local official ZATCA references were inspected:

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

The inspection was structural only: SDK command surfaces, CSR key names, config path metadata, document presence, page counts/keyword presence, and spreadsheet sheet metadata. No OTPs, CSID material, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies were copied.

## 4. What The Guard Checks

- `--no-network` is present.
- Exact approval phrase matching for execution-guard recognition.
- Required repository baseline docs and scripts exist.
- Required official reference files exist.
- Official CSR config keys exist in repo-local SDK inputs.
- Package scripts for the existing preflight guard exist.
- Code surfaces for Prisma schema, ZATCA service/controller/config, adapters, custody provider, CSR scripts, shared readiness, and web settings exist.
- Sandbox adapter file exists but is not executed.
- Mock adapter boundary exists but is not executed.
- CSID response custody provider exists but remains disabled/unapproved.
- Environment variable presence is reported as booleans only.

## 5. What The Guard Refuses To Do

- Request or capture an OTP.
- Request a compliance CSID or production CSID.
- Execute the sandbox adapter or mock adapter.
- Create a CSID request body.
- Process or persist a CSID response body.
- Print env values, OTPs, CSR bodies, CSID bodies, tokens, secrets, auth headers, request bodies, response bodies, certificate bodies, private-key bodies, signed XML, QR payloads, or customer data.
- Enable production signing, production compliance, clearance/reporting, PDF-A3, migrations, seed/reset/delete, deploys, or email.

## 6. Approval Phrase

Exact future execution-guard phrase:

`I approve ZATCA sandbox compliance CSID request execution guard only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, no adapter execution, and metadata-only evidence.`

This phrase recognizes the guard only. It does not approve OTP capture, adapter execution, request body creation, response body processing, response custody, or CSID request execution.

## 7. Required Future Execution Preconditions

Future execution remains blocked until all of these are approved and tested in separate controlled work:

- Key custody implementation.
- CSID response custody implementation.
- Exact OTP capture approval and handling procedure.
- Approved CSR config review and generated CSR custody path.
- Explicit sandbox adapter execution approval.
- Official endpoint and request/response behavior verification from repo-local official references only.
- Metadata-only evidence plan.
- Redaction tests for all sensitive fields.
- No production credentials or customer data.
- Separate compliance invoice checks after sandbox CSID response custody is ready.

## 8. OTP Handling Boundary

The guard never asks for an OTP and never accepts an OTP value as execution input. OTP-like environment variable presence is detected as a boolean only and values are never read into output, logged, stored, or used.

## 9. Sandbox Adapter Execution Boundary

The guard detects `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts` and reports that sandbox adapter execution remains blocked. It never imports, instantiates, or calls the adapter, and it never calls service methods that could create request bodies or invoke mock/real adapter flows.

## 10. CSID Response Custody Boundary

The guard detects the CSID custody provider source but reports custody as disabled/unapproved:

- `csidResponseCustodyApproved: false`
- `tokenStorageReady: false`
- `secretStorageReady: false`
- `certificateStorageReady: false`
- `bodyStorageAllowed: false`
- `csidResponseBodyProcessed: false`
- `csidResponsePersisted: false`

## 11. Env And Secret Handling Policy

Environment handling is presence-only. The output can report that an env key is configured, but it must never print the value. Secret-like values, auth headers, request bodies, response bodies, certificate bodies, private-key bodies, binary security tokens, and OTPs are forbidden from evidence and logs.

## 12. Metadata-Only Evidence Policy

Allowed evidence:

- Command name and flags.
- Status codes and blocker names.
- Boolean safety flags.
- Reference file paths inspected.
- Code surface paths inspected.
- Package script presence.
- Test command outcomes.

Forbidden evidence:

- OTP values.
- CSR bodies.
- CSID response bodies.
- Binary security token values.
- Secret values.
- Auth header values.
- Request/response bodies.
- Certificate/private-key bodies.
- Signed XML or QR payload bodies.

## 13. Status And Blocker Taxonomy

Execution-guard statuses:

- `BLOCKED_NO_NETWORK_REQUIRED`
- `BLOCKED_INVALID_APPROVAL_PHRASE`
- `EXECUTION_GUARD_BLOCKED_APPROVAL_REQUIRED`
- `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`
- `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`

Current blockers:

- `BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED`
- `BLOCKED_CSID_RESPONSE_CUSTODY_NOT_APPROVED`
- `BLOCKED_SANDBOX_ADAPTER_DISABLED`
- `BLOCKED_OTP_NOT_APPROVED`
- `BLOCKED_CSID_REQUEST_NOT_APPROVED`
- `BLOCKED_PRODUCTION_SIGNING_DISABLED`

## 14. Test Coverage

`scripts/zatca-sandbox-csid-preflight.test.cjs` covers:

- Missing `--no-network` refusal.
- Missing execution-guard approval phrase.
- Invalid execution-guard approval phrase without echoing input.
- Exact phrase with `--execution-guard`.
- Exact phrase with `--execute-csid-request`.
- No OTP/CSID/production CSID/network/sandbox adapter execution.
- No production signing, production compliance, clearance/reporting, or PDF-A3 enablement.
- Env values detected by booleans only.
- No CSID request body creation, response body processing, or response persistence.
- Strict mode exits nonzero for blocked execution-guard statuses.

## 15. Recommended Next Prompt

`ZATCA CSID response custody implementation plan`
