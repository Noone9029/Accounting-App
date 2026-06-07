# ZATCA Sandbox Adapter Mock-to-Real Boundary Test Plan

## Purpose and scope

This plan defines the no-network boundary tests that must exist before LedgerByte can consider any future real sandbox adapter execution. The boundary checks are static and metadata-only. They inspect adapter contracts, adapter source surfaces, package scripts, and guard documents without executing the sandbox adapter, mock adapter, request mapper, network code, database code, or custody provider.

This sprint does not call ZATCA, request OTPs, request compliance CSIDs, request production CSIDs, create real CSID request bodies, process real CSID response bodies, store tokens, store certificates, store secrets, sign XML, generate QR payloads, run clearance/reporting, create PDF-A3 output, run migrations, mutate env, or deploy.

## Current state

- Latest inspected pushed commit: `3af5e4ed999a3e0b29ef0b20dfcfbde762d35c7d`.
- Sandbox adapter execution approval remains blocked by `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`.
- Direct adapter execution remains blocked by `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- CSID response custody provider remains disabled.
- Metadata-only custody model exists.
- Legacy raw PEM-capable fields remain present and must not receive real CSID material.
- This boundary check is static-only and does not execute mock or sandbox adapter methods.

## Official references inspected

The boundary plan is constrained to repo-local official references only:

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

Inspection was structural only: file presence/metadata, config key names, CSR property key names, and safe keyword presence. No OTPs, CSID material, binary security tokens, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies were copied.

## Adapter model findings

The adapter contract is represented by `ZatcaOnboardingAdapter` and currently includes high-level onboarding and invoice submission methods. The boundary check treats this as a shape contract only.

The mock adapter is local and mock-only. Static checks can confirm it is separate from the real sandbox adapter and contains mock-only behavior, but mock success must not be treated as real sandbox readiness.

The disabled adapter is a fail-closed path. Static checks must confirm it refuses compliance CSID, production CSID, compliance check, clearance, and reporting methods.

The sandbox adapter contains risky future execution surfaces: real network checks, URL construction, fetch, request body serialization, response text parsing, request plan construction, and response payload handling. Boundary checks may count those markers, but must not execute them.

## Boundary contract

Allowed mocked behavior:

- Static inspection of mock adapter file presence and method names.
- Static inspection that mock-only markers exist.
- Static inspection that the mock adapter does not contain direct real network markers.

Allowed static checks:

- File presence checks.
- Adapter interface/class/method shape checks.
- Safe keyword counts for request creation and response processing markers.
- Env gate references by variable name only.
- Custody provider and metadata model presence checks.
- Disabled adapter fail-closed checks by source keyword count only.

Forbidden real behavior:

- Sandbox adapter execution.
- Mock adapter execution unless a later sprint proves an isolated mock-only path with no network, no request body creation, and no secret bodies.
- Request body creation.
- Response body processing.
- DB connection or write.
- OTP input capture.
- CSID request submission.
- Network calls.
- Source snippet, request body, response body, token, secret, auth header, certificate body, or private-key body output.

## What a mock pass means

A mock pass means the local mock path can exercise a shape-compatible local contract under controlled test inputs. It can help verify application plumbing, status fields, and non-network guard behavior.

## What a mock pass does not mean

A mock pass does not prove ZATCA sandbox readiness, OTP readiness, CSID request correctness, CSID response custody readiness, real endpoint readiness, production compliance, signing readiness, clearance/reporting readiness, or PDF-A3 readiness.

## Required preconditions before real adapter execution

- CSID response custody provider approved and implemented outside normal app tables.
- Key custody boundary approved.
- OTP capture handling approved with no logging or persistence.
- Sandbox base URL configured safely and verified by presence only in guards.
- Real network gate explicitly approved.
- Sandbox adapter execution gate explicitly approved in a separate future sprint.
- Request/response body logging prohibited.
- Metadata-only evidence contract approved.
- No production credentials, no production CSID, no clearance/reporting, no PDF-A3, and no signing enablement.

## Request body boundary

Request body creation remains blocked. Boundary checks may detect request-plan builder or serialization markers by keyword counts only. They must not call request mappers, build request payloads, or print source snippets.

## Response body boundary

Response body processing remains blocked. Boundary checks may detect response text and response mapper markers by keyword counts only. They must not call response mappers, parse response bodies, persist response material, or print response content.

## Custody boundary

CSID response custody must be approved before a real sandbox response can be handled. Real CSID response material must not be stored in normal app tables. The current metadata model can record non-secret metadata only; secrets, binary/security tokens, certificate bodies, and private-key bodies require a future approved secrets/KMS/HSM boundary.

## Env/network gate boundary

Boundary checks report env presence as booleans only. They may report required env variable names from source references, never values. Real network remains blocked until a separate future approval verifies all env gates and custody gates.

## Evidence and redaction policy

Allowed evidence:

- Command name and status.
- Adapter files found.
- Static-only flags.
- Keyword counts and booleans.
- Blockers and warnings.
- Confirmation that no network, adapter execution, request/response body creation, DB write, OTP request, CSID request, or secret exposure occurred.

Forbidden evidence:

- OTPs.
- CSID material.
- Tokens or secrets.
- Auth headers.
- Env values.
- Request bodies.
- Response bodies.
- Certificate bodies.
- Private-key bodies.
- Real URLs or endpoint payloads.

## Test strategy

- Static file presence checks.
- Adapter class/function shape checks.
- Mock-only contract checks by source markers only.
- Disabled adapter fail-closed checks by source markers only.
- No-network interception checks that prevent network, DB, child-process, and adapter module imports.
- No request/response body persistence checks.
- Env presence tests using leak markers that must not appear in output.
- Strict-mode checks for fatal missing boundary files while allowing nonfatal execution-readiness blockers.

## Required future implementation sequence

1. Complete no-network adapter contract tests.
2. Approve and implement CSID response custody.
3. Approve OTP capture handling.
4. Approve sandbox network/env gates.
5. Approve request/response body redaction and metadata-only evidence.
6. Add isolated no-network sandbox adapter tests with fetch fully trapped.
7. Only then consider a separate real sandbox adapter execution approval prompt.

## Recommended next prompt

`ZATCA sandbox adapter no-network contract tests`
