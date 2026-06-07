# ZATCA CSID Response Custody Guard

## Purpose And Scope

`scripts/zatca-csid-response-custody-guard.cjs` is a no-network, no-DB, metadata-only guard for the CSID response custody implementation path. It proves LedgerByte refuses response custody execution until provider, metadata, redaction, and approval prerequisites are satisfied.

It does not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, accept real response body input, process real response bodies, create real secret records, write to the database, store tokens, store secrets, store certificates, sign XML, generate QR payloads, run clearance/reporting, create PDF-A3, mutate env, deploy, seed, reset, delete, or send email.

## 2026-06-07 Sandbox Adapter Approval Follow-Up

The next guard layer is documented in `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, and `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`; the script is `scripts/zatca-sandbox-adapter-execution-approval.cjs`.

Current adapter approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`, and `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. The custody guard remains a dependency: real response body handling is still blocked until approved custody exists. Recommended next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## Official References Inspected

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

Inspection is structural only. The guard never copies example OTPs, CSID secrets, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies.

## Guard Behavior

Required command shape:

```bash
corepack pnpm zatca:csid-response-custody-guard -- --plan --no-network --json
```

The guard refuses to run without `--no-network`. It supports `--json`, `--plan`, `--strict`, `--approval-phrase <text>`, and `--simulate-metadata-only-response`.

Approval phrase for simulated metadata-only custody planning:

```text
I approve ZATCA CSID response custody metadata-only planning. No real OTP, no real CSID, no real ZATCA network, no real response body, no secret storage, no body exposure, and metadata-only evidence.
```

Without the phrase, status is `CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED`. With an incorrect phrase, status is `BLOCKED_INVALID_APPROVAL_PHRASE`. With the exact phrase and `--simulate-metadata-only-response`, current status is `CUSTODY_METADATA_SIMULATION_BLOCKED` because provider custody is disabled and legacy raw PEM-capable fields remain.

## What It Checks

- Official reference files exist under `reference/`.
- Policy docs and package scripts exist.
- Custody provider source exists.
- Metadata-only `ZatcaComplianceCsidCustodyRecord` model exists.
- Metadata fields such as request IDs, certificate request IDs, presence flags, storage modes, expiry, renewal, and production-compliance false markers exist.
- Legacy PEM-capable fields are present and reported as blockers.
- Sandbox adapter and disabled adapter surfaces exist but are not executed.
- Env presence is detected as booleans only.

## What It Refuses

- Network calls.
- DB connections or writes.
- OTP requests or storage.
- Compliance or production CSID requests.
- Sandbox adapter execution.
- Real response body input or processing.
- Synthetic response body processing.
- Token, secret, or certificate body persistence.
- Env value printing.
- Request or response body printing.
- Signing, QR, clearance/reporting, PDF-A3, migrations, seed/reset/delete, deploys, and email.

## Simulated Metadata-Only Policy

The simulation flag does not create a fake response body. It only evaluates metadata surfaces and emits booleans. `simulatedResponseBodyProcessed=false` and `realResponseBodyProcessed=false` must remain true statements in the result.

## Legacy Raw PEM Field Blocker

The current schema still contains `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem`. These are reported through `legacyPemFieldsFound=true` and block real response custody. They must not receive real CSID response material.

## Provider Boundary Requirements

Future custody requires an approved secrets-manager/KMS/HSM/external provider boundary. Normal app tables may store metadata and redacted references only. Provider operations must not return raw body material to API, UI, logs, audit events, evidence, or ordinary service responses.

## Metadata-Only Evidence Policy

Allowed evidence includes statuses, booleans, file paths inspected, code-surface booleans, blocker names, warning names, and next approval gates. Forbidden evidence includes OTPs, CSID material, binary/security tokens, secrets, auth headers, request bodies, response bodies, certificate bodies, private-key bodies, signed XML bodies, QR payload bodies, env values, and customer data.

## Blocker Taxonomy

- `BLOCKED_NO_NETWORK_REQUIRED`
- `CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED`
- `BLOCKED_INVALID_APPROVAL_PHRASE`
- `CUSTODY_GUARD_BLOCKED_SIMULATION_FLAG_REQUIRED`
- `CUSTODY_METADATA_SIMULATION_BLOCKED`
- `BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_DISABLED`
- `BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT`
- `BLOCKED_REAL_RESPONSE_BODY_PROCESSING_NOT_APPROVED`
- `BLOCKED_DB_WRITES_NOT_APPROVED`
- `BLOCKED_CSID_REQUEST_NOT_APPROVED`

## Recommended Next Prompt

Completed follow-up: `ZATCA sandbox adapter execution approval plan`

Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`

Boundary artifacts: `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md` and `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`.

Boundary status: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`. No OTP/CSID/network call, sandbox adapter execution, mock adapter execution, request body creation, response body processing, DB write, env value output, or secret/body exposure occurred.

Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

Contract artifacts: `SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md` and `SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`.

Contract status: `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`. No OTP/CSID/network call, sandbox adapter execution, mock adapter execution, disabled adapter execution, request body creation, response body processing, DB write, env value output, or secret/body exposure occurred.

`ZATCA sandbox CSID dry-run request body schema plan`
