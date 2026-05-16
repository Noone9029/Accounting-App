# ZATCA Hash Chain And PIH Plan

Audit date: 2026-05-16

Latest pass context: API-generated invoice XML was validated locally through the SDK wrapper after `f350999 Validate API generated ZATCA XML and hash`; this pass adds read-only SDK hash-chain replacement planning and dry-run reset visibility.

This document is local engineering planning only. It does not enable ZATCA network calls, invoice signing, CSID onboarding, clearance/reporting, PDF/A-3, or production compliance.

## Official Sources Used

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

The SDK readme documents the local hash oracle command:

```powershell
fatoora -generateHash -invoice <filename>
```

The Schematron and XML implementation standard describe PIH/hash input handling: remove `ext:UBLExtensions`, remove the `cac:AdditionalDocumentReference` where `cbc:ID = QR`, remove `cac:Signature`, canonicalize using C14N11, SHA-256 hash the canonical bytes, then base64 encode the hash. The same source gives the first-invoice PIH value:

```text
NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==
```

## Current App Behavior

- `packages/zatca-core/src/index.ts` emits official sample-backed PIH structure and uses the official first-invoice PIH fallback when no previous hash is supplied.
- `packages/zatca-core/src/index.ts` still computes `invoiceHash` using local SHA-256 over generated XML. This is deterministic, but it is not the official SDK/C14N11 hash.
- `apps/api/src/zatca/zatca.service.ts` stores that local hash in `ZatcaInvoiceMetadata.invoiceHash`.
- `apps/api/src/zatca/zatca.service.ts` updates `ZatcaEgsUnit.lastInvoiceHash` with that local hash after XML generation.
- Subsequent generated invoices use `activeEgs.lastInvoiceHash` as `previousInvoiceHash`, so today's generated local chain is a development chain, not a production ZATCA chain.
- Repeating generation for an existing generated invoice returns the existing metadata and does not consume another ICV or mutate `ZatcaEgsUnit.lastInvoiceHash`.
- `POST /sales-invoices/:id/zatca/hash-compare` now compares the stored app hash to SDK `-generateHash` output when SDK execution is enabled. The endpoint is explicitly read-only and returns `noMutation=true`.
- `GET /zatca/hash-chain-reset-plan` now returns active EGS state, latest generated invoice metadata, reset risks, and recommended next steps as a dry run only.
- `packages/zatca-core/src/index.ts` exposes canonicalization/hash groundwork helpers but intentionally blocks official hash output until SDK `-generateHash` or a verified C14N11 implementation is wired in.

## Hash Mode Configuration

LedgerByte now exposes a non-persistent planning flag:

```env
ZATCA_HASH_MODE=local
```

Supported values:

- `local`: default. Existing deterministic app hash storage remains active.
- `sdk`: planning-only. Readiness surfaces that SDK-generated hash mode was requested, but LedgerByte still does not store SDK hashes as official metadata. This mode must remain blocked for production until SDK execution, Java 11-14, signing, CSID onboarding, clearance/reporting, and an EGS reset plan are approved.

No database schema change was made in this pass. The flag is intentionally operational guidance only; it does not change invoice generation behavior.

## Read-Only Hash Comparison Endpoint

`POST /sales-invoices/:id/zatca/hash-compare`:

- Requires auth, `x-organization-id`, and `zatca.runChecks` or `zatca.manage`.
- Generates no new accounting records.
- Reads existing generated XML metadata only.
- Runs SDK `fatoora -generateHash -invoice <filename>` only when `ZATCA_SDK_EXECUTION_ENABLED=true` and readiness passes.
- Returns `appHash`, `sdkHash`, `hashMatches`, `hashComparisonStatus`, `hashMode`, `blockingReasons`, `warnings`, and `noMutation=true`.
- Does not update `ZatcaInvoiceMetadata.invoiceHash`, `ZatcaInvoiceMetadata.previousInvoiceHash`, `ZatcaEgsUnit.lastIcv`, or `ZatcaEgsUnit.lastInvoiceHash`.

With the default disabled SDK setting, this endpoint returns `hashComparisonStatus=BLOCKED` and still confirms the current stored app hash.

## Dry-Run Reset Strategy

`GET /zatca/hash-chain-reset-plan`:

- Requires auth, `x-organization-id`, and `zatca.manage`.
- Returns active EGS unit count, current ICV, current last hash, latest generated invoice metadata, reset risks, and recommended next steps.
- Always returns `dryRunOnly=true`, `localOnly=true`, and `noMutation=true`.
- Does not reset or delete metadata.

Recommended reset approach before any future official SDK hash persistence:

1. Treat all current `ZatcaInvoiceMetadata.invoiceHash` and `ZatcaEgsUnit.lastInvoiceHash` values as local-development-only.
2. For non-production testing, prefer a fresh database seed or a fresh EGS unit before testing SDK hash persistence.
3. Before any production CSID flow, decide whether to archive local metadata, regenerate local XML, or start a new official chain from the ZATCA first-invoice PIH seed.
4. Never reset an EGS unit used for real submission without a formally approved ZATCA recovery procedure.

## SDK Hash Oracle Results

The official SDK was run with Java 11.0.26 from a no-space temporary SDK copy. No network calls were made.

| XML | SDK validation | SDK `-generateHash` |
| --- | --- | --- |
| Official standard invoice sample | PASS | `V4U5qlZ3yXQ/Si1AC/R8SLc3F+iNy27wdVe8IWRqFAQ=` |
| Official simplified invoice sample | PASS with `BR-KSA-98` warning | `z5F9qsS6oWyDhehD8u8S0DaxV+2CUiUz9Y+UsR61JgQ=` |
| LedgerByte standard fixture | PASS | `Lt2QoJTH0yk6yJYK7vtb59zfyYwFOb8RsWWrpMdGCVg=` |
| LedgerByte simplified fixture | FAIL only on expected signing/certificate/Phase 2 QR gaps; XSD/EN/PIH pass | `5Ikqk68Pa1SveBTWh+K5tF55LUoj+GhLzj/Ib78Bpfw=` |

## API-Generated Invoice Result

Generated invoice used:

- Invoice id: `9c08f3ce-e9e9-4ec9-a79c-5e6842de5e4b`
- Invoice number: `INV-000072`
- Organization id: `00000000-0000-0000-0000-000000000001`
- Command path: `POST /sales-invoices/:id/zatca/sdk-validate`
- Local execution: `ZATCA_SDK_EXECUTION_ENABLED=true` with Java 11 and the official SDK launcher.

Result:

- SDK validation attempted: yes.
- SDK exit code: `0`.
- Wrapper `success`: `true`.
- Main validation message: `[XSD] validation result : PASSED`.
- Remaining messages are warnings about production-quality seller/buyer address and identifier fields, including `BR-KSA-08`, `BR-KSA-F-06-C23`, `BR-KSA-09`, `BR-KSA-81`, `BR-KSA-F-06-C25`, `BR-KSA-63`, `BR-KSA-10`, `BR-KSA-66`, and `BR-KSA-67`.
- App stored hash: `X8UbEeT1oEdrpx2lMCNRUljZtcylcMoj1HSnaCWSDb8=`.
- SDK hash: `ZVhjW6kwGeZ58ZYw1l9+9dBPm+m2CIWxKX4pDXVzTsU=`.
- Hash comparison: `MISMATCH`.

This mismatch is expected for the current code because app metadata still stores the local deterministic hash, not the SDK/C14N11 hash oracle output.

## Migration Impact

Changing LedgerByte from the local hash to the official SDK/C14N11 hash is not a simple field swap:

- Existing local `ZatcaInvoiceMetadata.invoiceHash` values are not production-grade.
- Existing `ZatcaEgsUnit.lastInvoiceHash` values are not production-grade.
- Existing dev PIH chains should not be reused for a real CSID or production reporting chain.
- A future migration or reset strategy must define whether to reset test EGS hash state, re-generate XML, or archive local-only metadata before enabling signing.
- Once official hashes are used, generated XML, signed XML, QR tag 6, PIH, ICV, and metadata persistence must agree.

## Recommended Implementation Order

1. Keep SDK hash comparison available but read-only.
2. Add unit tests around recorded SDK hash oracle output and parser behavior.
3. Introduce a feature-flagged SDK hash oracle path for local validation only.
4. Decide whether production uses SDK `-generateHash` directly or a verified in-process C14N11 implementation.
5. Add a controlled migration/reset plan for `ZatcaInvoiceMetadata.invoiceHash` and `ZatcaEgsUnit.lastInvoiceHash`.
6. Implement signing and Phase 2 QR only after hash-chain behavior is verified.
7. Keep real clearance/reporting blocked until signed XML passes local SDK and official sandbox checks.

## Non-Goals For This Pass

- No signed XML was generated.
- No certificate or private-key custody model was implemented.
- No ZATCA API call was made.
- No CSID was requested.
- No generated metadata was mutated by SDK validation.
- No production compliance is claimed.
