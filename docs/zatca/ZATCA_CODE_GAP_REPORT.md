# ZATCA Code Gap Report

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Current SDK Hash Persistence Update

The local hash-chain gap is reduced but not closed for production:

- SDK `-generateHash` persistence can now be enabled only on a fresh EGS unit with explicit admin confirmation and SDK readiness.
- Metadata generated under SDK mode stores the SDK hash and `hashModeSnapshot=SDK_GENERATED`.
- Existing local deterministic EGS chains are not migrated and remain development-only.
- The remaining production blockers are signing/certificate handling, Phase 2 QR, real CSID onboarding, clearance/reporting, PDF/A-3, repeatable Java/SDK runtime strategy, and key custody.

Scope: compare current LedgerByte ZATCA groundwork with the local official reference files under `reference/`. This report intentionally does not change the real ZATCA adapter, signing, PDF/A-3, clearance, reporting, or production CSID behavior.

## High-Risk Gaps

| Gap | Current code behavior | Official references appear to require | Files to change later | Safe implementation order |
| --- | --- | --- | --- | --- |
| ICV XML placement | Local ICV now emits the official sample-backed `AdditionalDocumentReference` structure. `BR-KSA-33` no longer appears for the local standard/simplified fixtures. | Data dictionary and Schematron show KSA-16 as `cac:AdditionalDocumentReference` with `cbc:ID` = `ICV` and `cbc:UUID`; Schematron BR-KSA-33/34 validates that shape. | Further device/branch sequence policy in `apps/api/src/zatca/zatca.service.ts` if needed later. | Keep the current structure under fixture tests; review ICV sequence boundaries before production. |
| Previous invoice hash XML placement and seed | Local PIH uses the official sample-backed ADR attachment shape and official first-invoice fallback value. The standard local fixture now passes SDK PIH validation. | Data dictionary maps KSA-13 to ADR `PIH`; Schematron includes PIH attachment validation and first-PIH guidance. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts`, fixtures/tests. | Keep the official fallback under tests, then validate generated-invoice hash-chain sequencing before signing. |
| Invoice hash source | Current production-facing hash-chain behavior is still local groundwork. `computeZatcaInvoiceHash` intentionally returns blocked status until SDK `-generateHash` or verified C14N11 is used. The SDK wrapper exposes no-mutation SDK/app hash comparison, confirms existing local-mode generated invoice app hashes can mismatch the SDK hash oracle, and exposes a dry-run metadata/EGS reset plan. Fresh EGS units can now explicitly opt into persisting SDK hashes. | Schematron describes removing extension/QR/signature blocks, C14N11 canonicalization, SHA-256 binary hash, and base64 encoding. SDK also exposes `-generateHash`. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca-sdk`, `apps/api/src/zatca/zatca-hash-mode.ts`, `apps/api/src/zatca/zatca.service.ts`. | Validate fresh-EGS SDK mode repeatedly before signing; keep existing local chains out of production. |
| Supply date | Local XML now emits `cac:Delivery/cbc:ActualDeliveryDate` when `supplyDate` is provided. Generated sales invoice XML currently falls back to issue date because LedgerByte has no dedicated supply date field yet. | Schematron `BR-KSA-15` and data dictionary `KSA-5` require supply date for standard tax invoices. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts`, future sales invoice model/UI if a separate supply date is added. | Keep the fixture passing, then add a real supply/delivery date field only as a separate product/accounting change. |
| `ext:UBLExtensions` and signature structure | Current XML has local TODO placeholders only. | SDK samples include populated `ext:UBLExtensions`/UBL signature structure; Schematron references signature information IDs and XAdES/enveloped method values. | `packages/zatca-core`, future signing module. | Implement only after canonicalization and key custody design. |
| QR in XML | Current QR payload is embedded as an ADR attachment using the local TLV tags 1-5. Simplified fixture still fails SDK QR validation because Phase 2 cryptographic QR tags and signing are not implemented. | Schematron expects QR ADR attachment for simplified invoices, with base64 text/plain. Data dictionary maps KSA-14 similarly. | `packages/zatca-core/src/index.ts`, future signing/QR module. | Replace local TLV-only QR with SDK-verified Phase 2 QR output after signing exists. |
| Phase 2 QR cryptographic tags | Current TLV builder covers basic tags 1-5. | Security docs/SDK imply cryptographic QR data is tied to signing/certificate output. | `packages/zatca-core/src/index.ts`, future signing/QR module. | Use SDK QR output as a fixture oracle after signing exists. |
| Invoice type code `name` flags | Standard and simplified invoice fixtures now use official sample values `0100000` and `0200000`; `BR-KSA-06` no longer appears for those fixtures. | SDK samples show `cbc:InvoiceTypeCode` with numeric code plus a multi-position `name` flag. | `packages/zatca-core/src/index.ts`, docs. | Extend the mapper for credit/debit/scenario flags only from official samples/rules. |
| Tax category and subtotals | Current single-standard-VAT tax total shape now matches official invoice samples closely enough for local XSD/EN/KSA rule pass in the standard fixture. | Data dictionary and Schematron require VAT breakdowns, categories, percentages, taxable amounts, and scenario-specific rules. | `packages/zatca-core/src/index.ts`, tax mapping helpers. | Build category/rate grouping for zero-rated, exempt, out-of-scope, allowances, and charges from official samples. |
| Line item tax structure | Local invoice lines now emit item description/name, classified tax category, price, line extension amount, and tax total shape backed by official samples. | SDK samples use `cac:ClassifiedTaxCategory`, price, item, line extension amount, and tax total patterns. | `packages/zatca-core/src/index.ts`. | Add broader line fixtures for discounts, charges, multiple VAT categories, and credit/debit documents. |
| Seller/buyer identifiers | Local fixtures now include seller `CRN` and a valid standard buyer VAT pattern; related SDK warnings/rules are resolved for the fixtures. | Schematron and data dictionary include VAT, identification scheme IDs, postal/address rules, and buyer requirements that vary by invoice type. | `apps/api/src/zatca`, `packages/zatca-core`. | Add validation only after exact field mapping is documented for all invoice types. |
| CSR/key algorithm/profile | Current CSR generation is local Node groundwork. | SDK CSR config template defines required fields; SDK readme references EC secp256k1 private key handling for signing. API docs require CSR for CSID. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts`. | Compare local CSR output to SDK CSR output before real onboarding. |
| API payload mapping | Adapter request/response types are flexible scaffolding. | API PDFs show endpoint-specific auth, payloads with `invoiceHash`, `uuid`, base64 `invoice`, and endpoint response statuses. | `apps/api/src/zatca/adapters/*`, DTOs/tests. | Implement sandbox-only mapper after signed XML and compliance CSID exist. |
| Error/retry taxonomy | Current errors are safe local blocks. | API docs include endpoint-specific missing/invalid request body, authentication, signature, hash, and already-reported cases. | `apps/api/src/zatca/adapters/zatca-adapter.error.ts`, service tests. | Build official error map from docs plus sandbox responses. |
| PDF/A-3 archive | Current PDFs are operational documents only. | SDK includes PDF/A-3 samples; production archive expectations require manual confirmation. | `packages/pdf-core`, `apps/api/src/generated-documents`. | Inspect PDF/A-3 samples with tooling, then design archive pipeline later. |

## Official SDK Fixture Validation Pass

`OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the first repo-local official fixture validation pass. The SDK command was verified as `fatoora -validate -invoice <filename>` and executed locally with Java 11.0.26 from a no-space temporary SDK copy. No network calls were made.

Official fixture results:

- Official standard invoice: `PASS`.
- Official simplified invoice: `PASS`, with warning `BR-KSA-98` about simplified invoice submission within 24 hours.
- Official standard credit note: `PASS`.
- Official standard debit note: `PASS`.

LedgerByte local fixture results after the supply-date and PIH/hash groundwork pass:

- Standard fixture: `PASS`. `[XSD]`, `[EN]`, `[KSA]`, and `[PIH]` pass, including the prior `BR-KSA-15` and `KSA-13` issues.
- Simplified fixture: `FAIL`, improved. `[XSD]`, `[EN]`, and `[PIH]` pass. Remaining failures are signing/QR/certificate related: `BR-KSA-30`, `BR-KSA-28`, `QRCODE_INVALID`, signature certificate parsing, and expected warnings `BR-KSA-29`, `BR-KSA-60`, and `BR-KSA-98`.

API-generated standard invoice XML now validates locally through the SDK wrapper with SDK exit code `0`, but existing local-mode metadata can return production-quality seller/buyer address and identifier warnings plus `hashComparisonStatus=MISMATCH` because that metadata was generated with the local deterministic hash. A separate no-mutation hash compare endpoint, dry-run reset-plan endpoint, and fresh-EGS SDK hash mode now exist so the replacement can be validated without migrating old local chains.

The next XML work should be driven by these remaining SDK messages, starting with fresh-EGS SDK hash-mode validation, generated XML seller/buyer field polish, and signing/certificate/Phase 2 QR design before any API submission.

## Code That Should Stay Local-Only For Now

- `packages/zatca-core/src/index.ts`: deterministic local XML/QR/hash/CSR helpers are useful scaffolding but not official validation.
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts`: mock CSID and mock compliance-check must remain fake/local.
- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts`: network calls must stay blocked unless explicit sandbox flags, base URL, credentials, and verified payloads are in place.
- `apps/api/src/zatca/zatca.service.ts`: local ICV/hash-chain behavior remains the default; `GET /zatca/hash-chain-reset-plan` exposes dry-run blockers, and SDK hash persistence is active only for fresh explicitly enabled EGS units.
- `apps/api/src/zatca-sdk`: local SDK validation is now feature-flagged and disabled by default. It is an engineering validator only and must not mark invoices compliant or enable ZATCA network calls.

## Safe Implementation Order

1. Use the feature-flagged local SDK validation wrapper with Java 11-14 and official/sample XML fixtures.
2. Copy only license-approved SDK sample XML fixtures into a tracked fixture folder or generate equivalent fixtures from official docs.
3. Keep the corrected UBL ordering, ADR `ICV`/`PIH`/`QR`, supplier/customer, tax total, line, and monetary total structures under tests.
4. Keep validating generated invoice XML through the API with SDK execution enabled in a local-only environment.
5. Validate SDK-generated hash persistence on a fresh EGS unit before signing; do not migrate existing local deterministic chains in place.
6. Design KMS/secrets-manager key custody before signing.
7. Add signing only after canonicalization, certificate handling, and SDK validation are stable.
8. Add compliance-check sandbox calls only after signed XML and compliance CSID are working in a controlled sandbox.
9. Add clearance/reporting only after standard/simplified invoice flows pass official compliance checks.
10. Add PDF/A-3 XML embedding after XML/signing is stable and sample PDF/A-3 metadata has been inspected.

## Explicit Non-Changes In This Pass

- No real ZATCA APIs were called.
- No real network adapter behavior was enabled.
- No production CSID, clearance, reporting, signing, or PDF/A-3 implementation was added.
- No SDK dummy certificate/private-key material was copied into application code.
- Local SDK validation remains disabled unless `ZATCA_SDK_EXECUTION_ENABLED=true` is explicitly configured.
