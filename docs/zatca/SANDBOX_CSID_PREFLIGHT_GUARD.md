# ZATCA Sandbox CSID Preflight Guard

Date: 2026-06-07

Status: Implemented as a local, no-network, metadata-only guard.

2026-06-07 reconciliation: the latest pushed branch state already included the sandbox OTP/CSID approval plan, runbook, result doc, guard extension, and tests at `90dec971 Plan ZATCA sandbox CSID approval`. The approval artifacts were updated in place; no duplicate approval docs or scripts were created.

## 1. Purpose And Scope

This guard checks whether LedgerByte has enough non-secret local metadata to plan a future sandbox compliance CSID approval path.

It does not request an OTP, request a compliance CSID, request a production CSID, call ZATCA, execute the sandbox adapter, generate production keys, sign XML, generate QR payloads, validate signed XML, run clearance/reporting, implement PDF-A3, migrate, seed, reset, delete, deploy, send email, or change production/beta data.

The command is:

```bash
corepack pnpm zatca:sandbox-csid-preflight -- --plan --no-network --json
```

It refuses to run without `--no-network`.

Approval-plan recognition is now supported with `--approval-phrase <text>` and `--approval-plan`. Recognition is metadata-only: it does not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, process response bodies, or enable signing.

## 2. Current State

- Latest commit inspected before this guard: `06929ad5 Design ZATCA key custody CSID lifecycle`.
- Key custody and CSID lifecycle design exists in `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`.
- CSID lifecycle status tracking exists in `CSID_LIFECYCLE_CHECKLIST.md`.
- Custody options are compared in `KEY_CUSTODY_DECISION_MATRIX.md`.
- Legacy `ZatcaEgsUnit` fields remain raw PEM-capable: `csrPem`, `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem`.
- Metadata-only custody records exist through `ZatcaComplianceCsidCustodyRecord`.
- The real sandbox adapter is present but not executable for compliance CSID HTTP.
- The mock adapter is local/mock-only.
- Production signing and production compliance remain disabled.

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

The guard records file presence and CSR property keys only. It does not copy example OTPs, CSID secrets, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies.

## 4. What The Guard Checks

- Required ZATCA planning docs and local dummy-signing evidence are present.
- Official local reference files are present.
- CSR template/example files are present.
- CSR property keys are present.
- Relevant source files for schema, service, controller, adapter, custody, scripts, shared readiness, and settings UI are present.
- The sandbox adapter is found and still blocked.
- The mock adapter is found and labeled mock-only.
- CSID response custody provider support exists but remains disabled/unapproved.
- Root package scripts for the guard exist.
- Environment variables are detected by presence only, never values.
- Production compliance and signing remain false.

## 5. What The Guard Refuses To Do

- No OTP request or capture.
- No compliance CSID request.
- No production CSID request.
- No real ZATCA network call.
- No sandbox adapter HTTP execution.
- No private key, certificate, CSID, token, secret, auth header, request body, or response body output.
- No signed XML or QR generation/persistence.
- No clearance/reporting.
- No PDF-A3.
- No migrations, seed/reset/delete, deploy, env mutation, email, DB connection, or command execution.

## 6. Required CSR/Seller/EGS Fields

CSR keys from the local SDK templates/examples:

- `csr.common.name`
- `csr.serial.number`
- `csr.organization.identifier`
- `csr.organization.unit.name`
- `csr.organization.name`
- `csr.country.name`
- `csr.invoice.type`
- `csr.location.address`
- `csr.industry.business.category`

Seller profile metadata to review before any future request:

- Seller legal name, VAT number, company ID type/number, national address fields, country code, and business category.

EGS metadata to review before any future request:

- Device serial number, solution name, CSR common name, CSR serial number, organization unit, invoice type, and location address.

## 7. Required Key Custody Prerequisites

- Production private-key custody must not use raw application-table PEM fields.
- A KMS/HSM/external signing service or equivalent production custody boundary must be approved before production signing.
- Local SDK dummy material is test-only and must never become tenant credential material.
- The guard does not generate keys and does not inspect private-key bodies.

## 8. Required CSID Response Custody Prerequisites

- A non-production custody provider plan must be approved before any future sandbox response material is received.
- Token, secret, and certificate response bodies must not be returned by API/UI/logs/docs/evidence.
- Metadata-only fields may record presence booleans, request IDs, certificate request IDs, expiry metadata, redaction booleans, storage mode, custody blocker reason, and production compliance false.
- Current custody provider behavior remains disabled and unapproved.

## 9. OTP Handling Policy

- OTP is a future manual approval gate only.
- The guard detects OTP-like environment variable presence as a boolean only.
- The guard does not request, accept, store, print, validate, or use OTP values.

## 10. Sandbox Adapter Policy

- Real sandbox adapter source exists.
- Compliance CSID HTTP execution remains blocked.
- `ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED` must remain false/absent for this preflight.
- Even if future env gates are present, this guard still performs no network call.

## 11. Mock Adapter Policy

- The mock adapter is local/mock-only.
- Mock behavior is not a sandbox CSID and is not production compliance.
- Mock output must not be treated as credential material.

## 12. Metadata-Only Evidence Policy

Allowed evidence:

- File-presence booleans.
- CSR property key names.
- Environment presence booleans.
- Adapter/custody readiness booleans.
- Blocker/status codes.
- Redaction flags.

Forbidden evidence:

- OTP values.
- CSR bodies.
- CSID response bodies.
- Binary security tokens.
- Secrets.
- Auth headers.
- Request/response bodies.
- Certificate bodies.
- Private-key bodies.
- Signed XML bodies.
- QR payload bodies.
- Customer/vendor payload bodies.

## 13. Status And Blocker Taxonomy

Primary statuses:

- `BLOCKED_NO_NETWORK_REQUIRED`
- `BLOCKED_MISSING_REFERENCE_DOCS`
- `BLOCKED_MISSING_CSR_REFERENCES`
- `BLOCKED_INVALID_APPROVAL_PHRASE`
- `APPROVAL_PHRASE_RECOGNIZED_PLAN_FLAG_REQUIRED`
- `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`
- `PREFLIGHT_BLOCKED`
- `PREFLIGHT_READY_FOR_APPROVAL_PLANNING`

Current expected blockers:

- `BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED`
- `BLOCKED_CSID_RESPONSE_CUSTODY_NOT_APPROVED`
- `BLOCKED_SANDBOX_ADAPTER_DISABLED`
- `BLOCKED_OTP_NOT_APPROVED`
- `BLOCKED_CSID_REQUEST_NOT_APPROVED`
- `BLOCKED_APPROVAL_PLAN_FLAG_REQUIRED`
- `BLOCKED_OTP_REQUEST_NOT_ALLOWED_BY_THIS_GUARD`
- `BLOCKED_CSID_REQUEST_NOT_ALLOWED_BY_THIS_GUARD`
- `BLOCKED_PRODUCTION_SIGNING_DISABLED`

## 14. Approval Gates Before Future Execution

- CSR dry-run approval.
- Sandbox OTP approval.
- Compliance CSID request approval.
- CSID response custody approval.
- Sandbox adapter execution approval.
- Production signing approval.

Each gate must remain separate. Passing this preflight does not approve the next gate.

The approval-plan extension is documented in:

- `SANDBOX_OTP_CSID_APPROVAL_PLAN.md`
- `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`
- `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`

## 15. Recommended Next Prompt

`ZATCA sandbox CSID request execution guard`

## 16. Execution Guard Extension

The same preflight script now includes a guarded execution boundary:

- `--execution-guard` recognizes only the exact sandbox compliance CSID request execution guard phrase.
- `--execute-csid-request` is intentionally blocked with `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- The execution guard still requires `--no-network`.

Docs:

- `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md`
- `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`

The guard reports `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED` without requesting OTP, requesting CSID, creating request bodies, processing response bodies, executing adapters, calling ZATCA, exposing secrets, signing, clearing/reporting, creating PDF-A3, or enabling production compliance.
