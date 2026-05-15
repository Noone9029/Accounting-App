# ZATCA Code Gap Report

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

Scope: compare current LedgerByte ZATCA groundwork with the local official reference files under `reference/`. This report intentionally does not change the real ZATCA adapter, signing, PDF/A-3, clearance, reporting, or production CSID behavior.

## High-Risk Gaps

| Gap | Current code behavior | Official references appear to require | Files to change later | Safe implementation order |
| --- | --- | --- | --- | --- |
| ICV XML placement | Local ICV exists and is included in local XML, but not as the official `AdditionalDocumentReference` structure. | Data dictionary and Schematron show KSA-16 as `cac:AdditionalDocumentReference` with `cbc:ID` = `ICV` and `cbc:UUID`; Schematron BR-KSA-33/34 validates that shape. | `packages/zatca-core/src/index.ts`, `packages/zatca-core/src/xml-mapping.ts`, XML fixtures. | Update XML builder snapshots, then validate against SDK samples. |
| Previous invoice hash XML placement and seed | Local previous hash state exists; initial hash is local groundwork. | Data dictionary maps KSA-13 to ADR `PIH`; Schematron includes PIH attachment validation and first-PIH guidance. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts`, fixtures/tests. | Add official seed fixture, then change only after hash-chain regression coverage. |
| Invoice hash source | Current hash is SHA-256 over local deterministic XML. | Schematron describes removing extension/QR/signature blocks, C14N11 canonicalization, SHA-256 binary hash, and base64 encoding. SDK also exposes `-generateHash`. | `packages/zatca-core/src/index.ts`, future SDK wrapper. | Add SDK hash oracle tests before replacing local hash logic. |
| `ext:UBLExtensions` and signature structure | Current XML has local TODO placeholders only. | SDK samples include populated `ext:UBLExtensions`/UBL signature structure; Schematron references signature information IDs and XAdES/enveloped method values. | `packages/zatca-core`, future signing module. | Implement only after canonicalization and key custody design. |
| QR in XML | Current QR payload exists as metadata/API output, not embedded as XML ADR. | Schematron expects QR ADR attachment for simplified invoices, with base64 text/plain. Data dictionary maps KSA-14 similarly. | `packages/zatca-core/src/index.ts`, invoice metadata flow. | Add ADR output after QR/signing requirements are verified. |
| Phase 2 QR cryptographic tags | Current TLV builder covers basic tags 1-5. | Security docs/SDK imply cryptographic QR data is tied to signing/certificate output. | `packages/zatca-core/src/index.ts`, future signing/QR module. | Use SDK QR output as a fixture oracle after signing exists. |
| Invoice type code `name` flags | Current mapping is local and enum-like. | SDK samples show `cbc:InvoiceTypeCode` with numeric code plus a multi-position `name` flag that must be manually confirmed. | `packages/zatca-core/src/index.ts`, `src/xml-mapping.ts`, docs. | Add verified mapper and tests for standard/simplified and scenario flags. |
| Tax category and subtotals | Current tax output is local skeleton. | Data dictionary and Schematron require VAT breakdowns, categories, percentages, taxable amounts, and scenario-specific rules. | `packages/zatca-core/src/index.ts`, tax mapping helpers. | Build category/rate grouping from official samples. |
| Line item tax structure | Current invoice lines are deterministic but minimal. | SDK samples use `cac:ClassifiedTaxCategory`, price, item, line extension amount, and tax total patterns. | `packages/zatca-core/src/index.ts`. | Add line mapper and fixture tests. |
| Seller/buyer identifiers | Current seller profile covers basic fields. | Schematron and data dictionary include VAT, identification scheme IDs, postal/address rules, and buyer requirements that vary by invoice type. | `apps/api/src/zatca`, `packages/zatca-core`. | Add validation only after exact field mapping is documented. |
| CSR/key algorithm/profile | Current CSR generation is local Node groundwork. | SDK CSR config template defines required fields; SDK readme references EC secp256k1 private key handling for signing. API docs require CSR for CSID. | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts`. | Compare local CSR output to SDK CSR output before real onboarding. |
| API payload mapping | Adapter request/response types are flexible scaffolding. | API PDFs show endpoint-specific auth, payloads with `invoiceHash`, `uuid`, base64 `invoice`, and endpoint response statuses. | `apps/api/src/zatca/adapters/*`, DTOs/tests. | Implement sandbox-only mapper after signed XML and compliance CSID exist. |
| Error/retry taxonomy | Current errors are safe local blocks. | API docs include endpoint-specific missing/invalid request body, authentication, signature, hash, and already-reported cases. | `apps/api/src/zatca/adapters/zatca-adapter.error.ts`, service tests. | Build official error map from docs plus sandbox responses. |
| PDF/A-3 archive | Current PDFs are operational documents only. | SDK includes PDF/A-3 samples; production archive expectations require manual confirmation. | `packages/pdf-core`, `apps/api/src/generated-documents`. | Inspect PDF/A-3 samples with tooling, then design archive pipeline later. |

## Code That Should Stay Local-Only For Now

- `packages/zatca-core/src/index.ts`: deterministic local XML/QR/hash/CSR helpers are useful scaffolding but not official validation.
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts`: mock CSID and mock compliance-check must remain fake/local.
- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts`: network calls must stay blocked unless explicit sandbox flags, base URL, credentials, and verified payloads are in place.
- `apps/api/src/zatca/zatca.service.ts`: local ICV/hash-chain behavior is useful for sequence testing, but official hash-chain semantics remain unverified.
- `apps/api/src/zatca-sdk`: local SDK validation is now feature-flagged and disabled by default. It is an engineering validator only and must not mark invoices compliant or enable ZATCA network calls.

## Safe Implementation Order

1. Use the feature-flagged local SDK validation wrapper with Java 11-14 and official/sample XML fixtures.
2. Copy only license-approved SDK sample XML fixtures into a tracked fixture folder or generate equivalent fixtures from official docs.
3. Replace XML structure incrementally: namespaces/root, header, ADR `ICV`/`PIH`/`QR`, supplier/customer, tax totals, lines, monetary totals.
4. Compare generated XML against XSD/Schematron/SDK validation.
5. Add canonicalization/hash comparison against SDK `-generateHash`.
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
