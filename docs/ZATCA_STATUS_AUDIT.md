# ZATCA Status Audit

Audit date: 2026-05-12

## Required Warnings

- Current system is not production ZATCA compliant.
- Real ZATCA calls are disabled by default.
- Mock CSID is not legal certificate issuance.
- Official SDK/API validation still required.

## Current ZATCA Implementation

Implemented local/scaffold pieces:

- Organization ZATCA profile with seller name, VAT number, Saudi address fields, environment, and registration status.
- EGS unit records with device serial, solution name, local CSR/private-key placeholders, compliance/production CSID placeholders, active flag, last ICV, and last invoice hash.
- CSR generation and CSR download endpoints.
- Mock compliance CSID flow behind adapter architecture.
- Adapter modes: `mock`, `sandbox-disabled`, `sandbox`.
- Real network safety gate: network calls require `ZATCA_ADAPTER_MODE=sandbox`, `ZATCA_ENABLE_REAL_NETWORK=true`, and `ZATCA_SANDBOX_BASE_URL`.
- Local invoice metadata with invoice UUID, local status, ICV, previous hash, invoice hash, XML base64, QR base64, and submission logs.
- Local XML skeleton builder, QR TLV base64, invoice hash, local validation, field mapping constants, fixtures, and checklist constants in `packages/zatca-core`.
- Compliance checklist endpoint and readiness endpoint.
- Official references inventory, implementation map, SDK usage plan, and code gap report in `docs/zatca`.
- SDK readiness and dry-run command planning in `apps/api/src/zatca-sdk`.

## Local-Only Behavior

- `POST /sales-invoices/:id/zatca/generate` creates local XML/QR/hash metadata only.
- ICV/hash-chain behavior is local and idempotent for repeated generation of the same invoice.
- `GET /sales-invoices/:id/zatca/xml-validation` is local structural validation only and returns `officialValidation=false`.
- PDF display of ZATCA metadata is a local placeholder and does not embed XML.
- Private key PEM can exist in the database only as development placeholder storage; normal EGS responses redact it.

## Mock-Only Behavior

- Compliance CSID request defaults to mock mode and accepts local OTP test values such as `000000`.
- Mock compliance check can move local invoice metadata to `READY_FOR_SUBMISSION`.
- Mock flows write local logs but do not produce legal certificates and do not call ZATCA.
- Clearance/reporting endpoints return safe blocked responses in mock mode.

## Official Reference Usage

Reference files live under local `reference/` and have been inventoried in `docs/zatca/REFERENCES_INVENTORY.md`.

Reference-backed docs:

- `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md`
- `docs/zatca/ZATCA_CODE_GAP_REPORT.md`
- `docs/zatca/SDK_USAGE_PLAN.md`
- `docs/zatca/SDK_VALIDATION_WRAPPER.md`
- `docs/zatca/XML_FIELD_MAPPING.md`
- `docs/zatca/*_CHECKLIST.md`

Current code has comments and checklist references, but it has not replaced the local XML/hash/signing scaffolding with SDK-verified official behavior.

## Needs Official Verification

- CSR subject/profile fields and extension requirements.
- UBL namespaces and full invoice XML structure.
- Invoice type code and subtype flags.
- Tax category codes and exemption reason handling.
- ICV and previous invoice hash placement.
- Official invoice hash canonicalization source.
- QR fields for Phase 2, including signature/public-key/certificate data.
- Cryptographic stamp and XAdES signature block.
- API endpoint URLs, request bodies, response bodies, auth headers, error formats.
- Clearance/reporting/compliance-check behavior and retry semantics.
- PDF/A-3 XML embedding requirements.

## Needs Manual FATOORA Access

- ZATCA/FATOORA sandbox portal access.
- OTP generation for onboarding.
- Valid sandbox credentials and endpoint confirmation.
- Compliance CSID issuance.
- Compliance invoice submissions.
- Production CSID request after sandbox checks.

## Needs OTP

- Current OTP is mock-only.
- Real OTP must be generated from the FATOORA portal by an authorized user.
- OTP handling must be verified against current onboarding documentation before live sandbox calls.

## Needs CSID

- Compliance CSID is not real.
- Production CSID is not implemented.
- Certificate chain storage, refresh/renewal, and secure custody are not production-ready.

## Needs SDK Validation

- Java SDK files exist locally in `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- The app can discover SDK readiness and build dry-run command plans.
- SDK execution is disabled by default through `ZATCA_SDK_EXECUTION_ENABLED=false`.
- Previous local notes identify Java/version and Windows path-with-spaces concerns.
- Next safe step is a controlled test-only SDK validation wrapper after command format and Java version are verified.

## Needs Signing

- Invoice signing is not implemented.
- XAdES signature, certificate digest, public key fields, cryptographic stamp, and signed properties are missing.
- No signing should be added until SDK samples and official documentation are mapped to tests.

## Needs XML Canonicalization

- Current invoice hash is a local SHA-256 over generated XML.
- Official C14N/canonicalization behavior is not implemented.
- Hash output must be compared against SDK `generateHash` behavior before real use.

## Needs PDF/A-3

- Current PDFs are simple operational PDFs.
- XML is not embedded.
- PDF/A-3 conformance is not implemented.
- Official samples exist in the SDK reference folder and should drive future work.

## Needs Clearance And Reporting

- Standard invoice clearance is not implemented.
- Simplified invoice reporting is not implemented.
- Compliance-check API integration is not implemented.
- Existing endpoints are safe placeholders and must remain disabled until official API mapping and signing are complete.

## Needs Production Security/KMS

- Real private keys must not be stored in ordinary database text fields.
- A KMS/secrets-manager decision is required before real CSID/private-key handling.
- Logs must continue redacting CSR private keys, CSIDs, certificates, and auth headers.
- Production environment should separate sandbox/simulation/production credentials and enforce change control.

## Current Safe Env Defaults

- `ZATCA_ADAPTER_MODE=mock`
- `ZATCA_ENABLE_REAL_NETWORK=false`
- `ZATCA_SANDBOX_BASE_URL=` empty by default
- `ZATCA_SDK_EXECUTION_ENABLED=false`

These defaults are appropriate for the current non-compliant foundation.
