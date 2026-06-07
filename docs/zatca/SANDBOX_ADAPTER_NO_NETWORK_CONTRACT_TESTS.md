# ZATCA Sandbox Adapter No-Network Contract Tests

## Purpose and Scope

This document defines the no-network adapter contract tests for the LedgerByte ZATCA sandbox onboarding boundary. The tests prove that mock, disabled, and sandbox adapter paths remain fail-closed unless future custody, OTP, CSID, env, network, and adapter approvals are all present.

This is a contract-test sprint only. It does not execute the real sandbox adapter, call ZATCA, request OTPs, request compliance CSIDs, request production CSIDs, create real request bodies, process real response bodies, connect to a database, write records, store secrets, sign XML, generate QR payloads, run clearance/reporting, create PDF-A3 artifacts, mutate env, migrate, seed, reset, deploy, or send email.

## Current State

- Latest reconciled commit for this sprint: `a084fff0 Plan ZATCA adapter boundary tests`.
- Boundary plan, runbook, results, and static check script already exist.
- Sandbox adapter execution approval remains blocked.
- CSID response custody provider remains disabled/unapproved.
- Legacy raw PEM-capable fields remain present and must not receive real CSID material.
- No-network contract script added: `scripts/zatca-sandbox-adapter-no-network-contract.cjs`.
- No-network contract tests added: `scripts/zatca-sandbox-adapter-no-network-contract.test.cjs`.

## Official References Inspected

Only repository-local official ZATCA and SDK references were inspected:

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

Inspection remained structural: file presence, CSR config property names, config key names, and keyword counts only. No OTPs, CSID material, tokens, auth headers, request bodies, response bodies, certificates, private-key bodies, or env values were copied.

## Adapter/Test Infrastructure Inspected

- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts`
- `apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts`
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts`
- `apps/api/src/zatca/adapters/zatca-onboarding.adapter.ts`
- `apps/api/src/zatca/adapters/zatca-adapter.types.ts`
- `apps/api/src/zatca/adapters/compliance-csid-http.mapper.ts`
- `apps/api/src/zatca/zatca.config.ts`
- `apps/api/src/zatca/zatca.service.ts`
- `apps/api/src/zatca/zatca.controller.ts`
- `apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/scripts/zatca-compliance-csid-plan.ts`
- Existing ZATCA guard scripts and Node tests.

The API runtime adapter tests use Jest/Nest specs, while this no-network contract uses a standalone Node test script. That keeps the contract static and avoids importing or executing adapter classes.

## Contract Guarantees

- The disabled adapter is detected and expected to fail closed.
- The mock adapter is detected as mock-only and is not executed.
- The sandbox adapter is detected, but risk markers are counted only.
- Any future network path remains blocked by policy.
- Request body creation remains blocked.
- Response body processing remains blocked.
- Env values are represented by booleans only.
- Secret, token, certificate, private-key, auth-header, request-body, and response-body material is not printed or persisted.
- Test output remains metadata-only.

## Mock Adapter Contract

Mock adapter findings are static-only. A mock pass means the local mock source exists and is separated from the real network path. It does not prove real sandbox readiness, response custody readiness, OTP handling readiness, or official endpoint readiness.

## Disabled Adapter Contract

Disabled adapter refusal is a successful contract finding. It proves the fail-closed adapter path exists and can remain the default when real network approval is absent.

## Sandbox Adapter Contract

The sandbox adapter source exists, but it is not imported or executed. Source markers for network, request planning, and response handling are counted only so the contract can prove those paths remain blocked.

## Network Interception Policy

The contract exposes a no-network interception helper that fails any accidental call routed through the test trap. The guard itself does not import network modules, does not call network APIs, and does not execute adapter code.

## Request/Response Body Prohibition

No real CSID request body may be created. No real CSID response body may be processed. The contract may count request/response-related source markers, but it must not print source snippets, request fields, response fields, body content, or examples.

## Env/Secret Redaction Policy

Env presence is reported as booleans only. The guard must never print env values. It must also never print OTP values, CSID material, tokens, secrets, auth headers, request bodies, response bodies, certificate bodies, or private-key bodies.

## What the Tests Prove

- Contract checks can run locally without network or DB access.
- Adapter source files and contract surfaces are present.
- Disabled adapter fail-closed behavior is detectable by static inspection.
- Mock adapter remains mock-only and unexecuted.
- Sandbox adapter is not executed.
- Request/response body paths remain blocked.
- Env and secret output remains metadata-only.

## What the Tests Do Not Prove

- They do not prove real ZATCA sandbox readiness.
- They do not prove OTP approval or handling readiness.
- They do not prove compliance CSID request approval.
- They do not prove CSID response custody approval.
- They do not prove official endpoint behavior.
- They do not prove production signing, clearance/reporting, or PDF-A3 readiness.

## Required Future Gates Before Real Adapter Execution

- CSID response custody provider implementation and approval.
- Key custody boundary approval.
- OTP capture approval with no logging or persistence.
- CSID request approval.
- Real network approval.
- Sandbox adapter execution approval.
- Safe sandbox base URL/env gate approval with presence-only evidence.
- Request/response body redaction and custody approval.
- DB write approval for metadata only, with rollback on custody failure.
- Explicit exclusion of production credentials, production CSIDs, clearance/reporting, PDF-A3, and signing enablement.

## Test Commands

- `node --test scripts/zatca-sandbox-adapter-no-network-contract.test.cjs`
- `corepack pnpm test:zatca-sandbox-adapter-no-network-contract`
- `corepack pnpm zatca:sandbox-adapter-no-network-contract -- --plan --no-network --json --contract`

## Recommended Next Prompt

`ZATCA sandbox CSID dry-run request body schema plan`
