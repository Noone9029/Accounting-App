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

## Fresh EGS SDK Hash-Mode Validation Pass

The fresh-EGS SDK hash-mode pass was completed locally with Java 11.0.26, SDK execution enabled only for the temporary API process, and no ZATCA network calls.

Results:

- A new local organization and zero-metadata EGS were created for the run.
- `POST /zatca/egs-units/:id/enable-sdk-hash-mode` switched the EGS to `SDK_GENERATED` and wrote `ZATCA_SDK_HASH_MODE_ENABLED`.
- `INV-000001` stored SDK hash `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=` with the official first PIH seed.
- `INV-000002` stored SDK hash `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=` with invoice 1's SDK hash as PIH.
- Direct SDK `-generateHash` matched both persisted hashes.
- `POST /sales-invoices/:id/zatca/hash-compare` returned `MATCH` and `noMutation=true` for both invoices.
- Repeated generation left ICV and EGS last hash unchanged.
- Historical result: SDK XML validation passed globally for invoice 1 with buyer-address warnings, but invoice 2 failed official PIH validation with `KSA-13`. This is superseded by the PIH-chain follow-up below.

Wrapper correction:

- The SDK can exit `0` while printing `GLOBAL VALIDATION RESULT = FAILED`.
- The wrapper now parses official output and reports `success=false` for explicit global or rule validation failures.

Updated gap:

- SDK hash persistence is proven for a fresh local EGS, but the second generated XML's official PIH validation failure must be resolved before signing or sandbox submission work.

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

## Fresh EGS PIH Chain Follow-Up

The previous fresh-EGS pass proved SDK hash persistence and idempotent PIH chaining, but invoice 2 failed official SDK XML validation with `KSA-13`. The follow-up debug pass confirmed the cause: local SDK `-validate` uses the configured `pihPath` file as the expected previous invoice hash. The default SDK file `Data/PIH/pih.txt` contains the first-invoice seed, so invoice 2 was being validated against the wrong previous hash even though LedgerByte's metadata and XML contained invoice 1's SDK hash.

Implemented fix:

- `apps/api/src/zatca-sdk/zatca-sdk.service.ts` now creates a temporary SDK config with `pihPath` pointed at the invoice metadata `previousInvoiceHash` when running local validation.
- `scripts/validate-zatca-sdk-hash-mode.cjs` and `scripts/debug-zatca-pih-chain.cjs` use the same invoice-specific PIH validation path.
- The wrapper keeps the operation local-only, uses temp files, sanitizes output, and does not mutate invoice metadata or EGS state.

Latest generated standard invoice evidence:

- `INV-000001`: SDK hash `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=`, PIH first seed, global SDK validation passed.
- `INV-000002`: SDK hash `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=`, PIH equals invoice 1 SDK hash, global SDK validation passed.
- Hash compare returned `MATCH` and `noMutation=true` for both invoices.
- `KSA-13` is resolved for this local fresh-EGS generated standard-invoice path.

Remaining generated XML gap:

- `BR-KSA-63` still appears because the generated buyer address lacks `cbc:BuildingNumber`.
- The API now maps `Contact.addressLine1` to buyer `StreetName` and `Contact.addressLine2` to buyer `CitySubdivisionName`, but the `Contact` model does not have a dedicated 4-digit building-number field.
- Do not hardcode fake buyer building numbers; add proper address fields later as a data-model/product change.

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.

## 2026-05-16 - ZATCA CSR local generation gate

Official local references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only behavior:
- Added a disabled-by-default CSR local generation gate at `POST /zatca/egs-units/:id/csr-local-generate` and `corepack pnpm zatca:csr-local-generate`.
- The gate requires `ZATCA_SDK_CSR_EXECUTION_ENABLED=true`, a non-production EGS unit, an `APPROVED` CSR config review, a current preview hash matching the approved review, no missing CSR fields, and no preview blockers.
- When the flag is false, no SDK process runs, no temp private key is generated, no CSR is generated, and the response reports `executionEnabled=false`, `executionAttempted=false`, and `executionSkipped=true`.
- When the flag is true and all prerequisites pass, the app writes only a temp CSR config file, runs the official SDK CSR command plan with temp private-key and generated-CSR paths, summarizes sanitized stdout/stderr, and deletes the temp directory by default.
- Responses, logs, reviews, smoke output, and UI do not expose private key PEM, generated CSR body, certificate bodies, CSID token material, OTP values, or production credentials.
- The gate does not request compliance CSIDs, does not request production CSIDs, does not call ZATCA network endpoints, does not sign invoices, does not perform clearance/reporting, does not implement PDF/A-3, and keeps `productionCompliance=false`.

UI and validation notes:
- ZATCA settings now shows that local SDK CSR generation requires an approved review and the disabled-by-default env gate.
- Default smoke calls the local generation endpoint with the default disabled flag and verifies no SDK execution, no secret content, no EGS ICV/hash mutation, and no submission-log creation.
- Normal tests mock SDK execution and do not require Java or the official SDK.

Recommended next step:
- Add a controlled non-production operator flow to intentionally enable the CSR gate in a local sandbox session, run the SDK CSR command once with temp files, and manually inspect only sanitized metadata before any future CSID onboarding design.

## 2026-05-16 - Local ZATCA signing dry-run and Phase 2 QR gate

- Official sources inspected: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, official simplified/standard invoice samples, official standard credit/debit samples, SDK certificate/private-key fixture paths, BR-KSA Schematron rules, UBL XAdES/XMLDSig schemas, XML implementation standard PDF, security features implementation standard PDF, and EInvoice_Data_Dictionary.xlsx.
- Added local-only signing dry-run groundwork through `POST /sales-invoices/:id/zatca/local-signing-dry-run` and `corepack pnpm zatca:local-signing-dry-run`.
- `ZATCA_SDK_SIGNING_EXECUTION_ENABLED` defaults to `false`. With the default setting, no SDK signing execution, no QR generation, no temp private-key usage, no signed XML output, no CSID request, no ZATCA network call, and no persistence occurs.
- If explicitly enabled for local/non-production work, the planned path writes unsigned XML to temporary files, attempts the official SDK `-sign` command, plans/runs the SDK `-qr` step only after a signed XML is detected, sanitizes stdout/stderr, and cleans temporary files by default.
- Redaction guarantees: responses and logs must not include private key PEM, certificate bodies, CSID tokens, OTPs, full signed XML bodies, generated CSR bodies, or QR payload bodies.
- Phase 2 QR status: blocked until signed XML, certificate, hash, and signature artifacts are available. The current UI/API exposes the dependency chain instead of fabricating cryptographic QR tags.
- Production limitations remain: no compliance CSID request, no production CSID request, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: run a controlled non-production SDK signing experiment only after approved CSR/test certificate material exists and the operator explicitly enables the local execution gate.

## 2026-05-16 - Controlled local ZATCA signing experiment

Scope: local SDK signing/Phase 2 QR experiment only. No CSID request, no ZATCA network call, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed from official references:
- The SDK documents local `fatoora -sign -invoice <file> -signedInvoice <file>` and `fatoora -qr -invoice <file>` commands.
- Simplified invoices require the cryptographic stamp/UBL signature structures and Phase 2 QR path; BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60 remain expected until valid signing material and QR generation are in place.
- The official samples contain the required signature IDs `urn:oasis:names:specification:ubl:signature:1`, `urn:oasis:names:specification:ubl:signature:Invoice`, and signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- The bundled SDK certificate/private key files are treated as SDK dummy/test material only and must not be used as production credentials.

Implementation updates:
- Hardened `POST /sales-invoices/:id/zatca/local-signing-dry-run` so `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` still requires a generated XML, invoice metadata, active EGS, writable temp directory, Java SDK readiness, SDK launcher/config readiness, explicit SDK dummy certificate/private key availability, no production credentials, no network-like command plan, and no persistence.
- Rewrites SDK config into a temp directory for any future local signing attempt so official config keys point at repo-local SDK paths and dummy test material without returning certificate/private-key content.
- Response now distinguishes `executionStatus`, `signingExecuted`, `qrExecuted`, dummy material readiness, temp SDK config writing, signed XML detection, QR detection, SDK exit codes, sanitized stdout/stderr, blockers, warnings, and cleanup.
- UI now surfaces local signing execution status plus whether SDK signing or QR commands actually executed.
- Default smoke remains safe with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false` and verifies execution is skipped.

Controlled local experiment result:
- Experiment invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`, generated locally as `SIMPLIFIED_TAX_INVOICE` with ICV 33 for this test.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` set only for that command.
- Java observed: OpenJDK 17.0.16.
- SDK path: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- Result: `executionEnabled=true`, `executionAttempted=false`, `executionSkipped=true`, `executionStatus=SKIPPED`.
- Blocker: detected Java 17.0.16 is outside the SDK-supported range `>=11 <15`.
- SDK exit code: not applicable because execution was correctly blocked before SDK invocation.
- `signedXmlDetected=false`; `qrDetected=false`; `sdkExitCode=null`; `qrSdkExitCode=null`.
- Temp files written: unsigned XML false, SDK config false, signed XML false.
- Cleanup: no temp files required; cleanup reported success.
- Optional local validation of signed temp XML was skipped because no signed XML was produced.

Security and redaction guarantees:
- No private key PEM, certificate body, CSID token, OTP, generated CSR body, signed XML body, or QR payload body is returned or stored.
- No invoice metadata is marked signed.
- No signed XML or QR is persisted to the database.
- The dry-run path does not request CSIDs, does not call ZATCA, and does not submit invoices.
- The path remains a local engineering experiment and does not prove production compliance.

Remaining blockers and next step:
- Install/use an officially supported Java runtime for the SDK experiment, preferably Java 11, then rerun the gated local experiment with SDK dummy/test material only.
- Even if local dummy signing succeeds later, production signing remains blocked until proper compliance/production CSID onboarding, key custody, certificate handling, clearance/reporting design, and production validation are implemented.

## 2026-05-16 - Java 11 controlled ZATCA SDK signing experiment

Scope: local-only SDK signing and QR experiment with SDK dummy/test material. No CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed official behavior:
- The SDK readme requires Java versions `>=11` and `<15`.
- The documented local signing command is `fatoora -sign -invoice <filename> -signedInvoice <filename>`.
- The documented QR command is `fatoora -qr -invoice <filename>`.
- SDK bundled `cert.pem` and `ec-secp256k1-priv-key.pem` are dummy/testing material only and are not production credentials.
- Simplified invoices require the signature/cryptographic stamp structure and QR flow; official rules include BR-KSA-27, BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60.
- The official simplified sample includes `ext:UBLExtensions`, `sac:SignatureInformation`, signature ID `urn:oasis:names:specification:ubl:signature:1`, referenced signature/signature ID `urn:oasis:names:specification:ubl:signature:Invoice`, signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`, and a `QR` additional document reference.

Java runtime configuration:
- Default Java remains OpenJDK `17.0.16` from `C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe`.
- Supported local Java used for the experiment: `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`.
- Java 11 version output: OpenJDK `11.0.26` Microsoft build `11.0.26+4-LTS`.
- No global Java change was made; the command used `ZATCA_SDK_JAVA_BIN` only for the local experiment process.

Wrapper hardening added:
- The official Windows `fatoora.bat` expands `FATOORA_HOME` without quotes, so the repo path `E:\Accounting App` broke the launcher under Java 11.
- The local signing wrapper now stages the SDK launcher, JAR, `jq`, and `global.json` into the existing no-space temp directory before execution.
- The temp SDK config is still rewritten only in temp storage and points at SDK dummy/test certificate/private-key material.
- `tempFilesWritten.sdkRuntime` reports whether the temporary SDK runtime staging occurred.
- The sales invoice ZATCA panel displays whether the temp SDK runtime was staged.
- `corepack pnpm zatca:local-signing-dry-run -- --help` now documents `ZATCA_SDK_JAVA_BIN`.

Controlled signing/QR experiment result:
- Invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`.
- Invoice type: `SIMPLIFIED_TAX_INVOICE`.
- Local ICV: `33` from the previously generated unsigned XML.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` and `ZATCA_SDK_JAVA_BIN` set to Java 11 for that command only.
- Result: `executionEnabled=true`, `executionAttempted=true`, `executionSkipped=false`, `executionStatus=SUCCEEDED_LOCALLY`.
- `signingExecuted=true`; `qrExecuted=true`.
- `sdkExitCode=0`; `qrSdkExitCode=0`.
- `signedXmlDetected=true`; `qrDetected=true`.
- `tempFilesWritten`: unsigned XML true, SDK config true, SDK runtime true, signed XML true, files retained false.
- Cleanup: performed true, success true, temp files removed by default.
- Sanitized SDK output: signing reported `InvoiceSigningService - invoice has been signed successfully`; QR reported `QrGenerationService - Qr has been generated successfully`; QR payload body was redacted.

Optional local validation of signed temp XML:
- A second keep-temp run was used only long enough to validate `signed.xml` locally, then the temp directory was deleted.
- Validation command used the temp staged SDK launcher/config and Java 11, with no ZATCA network call and no CSID request.
- Validation exit code: `0`.
- XSD: PASSED.
- EN: PASSED.
- KSA: PASSED.
- QR: PASSED.
- SIGNATURE: PASSED.
- PIH: FAILED.
- GLOBAL: FAILED.
- Remaining warning: `BR-KSA-08` seller identification warning in the local demo data.
- Remaining error: `KSA-13` PIH invalid. This is expected for the isolated dummy signing experiment because the signed temp artifact is not persisted and the hash chain/PIH is not mutated or promoted as an official signed invoice.

Redaction and no-mutation guarantees:
- No private key PEM, certificate body, CSID token, OTP, signed XML body, generated CSR body, or QR payload body is returned or stored.
- Signed XML is temp-only and deleted by default.
- The validation temp directory from the keep-temp run was manually deleted after validation.
- No invoice metadata is marked signed.
- No signed XML or QR payload is persisted to the database.
- No ICV, PIH, invoice hash, previous hash, EGS last hash, or submission log is mutated by the local signing dry-run path.

Remaining limitations and next step:
- This proves the local SDK dummy-material signing/QR path can execute under Java 11 only; it does not prove production compliance.
- Production signing remains blocked until real compliance/production CSID onboarding, secure key custody, certificate lifecycle handling, official clearance/reporting behavior, PDF-A3, and production validation are implemented.
- Recommended next step: add an explicit local signed-XML validation dry-run endpoint/script that keeps signed XML temp-only, returns only sanitized validation categories, and continues to block all CSID/network/persistence behavior.

### ZATCA local signed XML validation dry-run update (2026-05-16)

- Added a local-only signed XML validation dry-run path for generated invoices: `POST /sales-invoices/:id/zatca/local-signed-xml-validation-dry-run` and `corepack pnpm zatca:local-signed-xml-validate -- --invoice-id <id>`.
- Official references inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/PIH/pih.txt`, SDK dummy `Data/Certificates/cert.pem`, SDK dummy `Data/Certificates/ec-secp256k1-priv-key.pem`, standard/simplified SDK invoice samples, ZATCA Schematron rules, XML Implementation Standard PDF, Security Features Implementation Standards PDF, and `EInvoice_Data_Dictionary.xlsx`.
- Behavior: when `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false`, signing, QR, and signed XML validation are skipped and the response stays dry-run/no-mutation. When explicitly enabled in local/dev only, the service signs and QR-generates temp XML with SDK dummy/test material, rewrites the temp SDK `pihPath` to invoice metadata `previousInvoiceHash`, validates the signed temp XML, sanitizes XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL output, then cleans temp files by default.
- PIH/KSA-13 finding: the earlier signed-temp validation PIH failure was caused by SDK validation reading the default configured PIH file instead of an invoice-specific previous hash. The new temp `pihPath` override fixed the controlled local validation for demo invoice `INV-000163`: XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL all passed with validation exit code `0`.
- Seller identification: BR-KSA-08 readiness now reports missing or invalid seller ID scheme/number, and XML emits seller `cac:PartyIdentification` only when the seller ID scheme is one of `CRN`, `MOM`, `MLS`, `SAG`, `OTH`, or `700` and the value is alphanumeric. Existing generated XML must be regenerated after adding valid seller ID data to clear an existing BR-KSA-08 warning.
- Safety guarantees: no CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF/A-3, no production credentials, no signed XML/QR persistence, no ICV/PIH/hash-chain mutation, and no production compliance claim.
- Recommended next step: add controlled seller profile data repair/regeneration guidance for demo invoices, then design a signed XML promotion workflow separately from this dry-run path.

## ZATCA signed XML promotion planning update (2026-05-16)

- Added a safe signed XML promotion architecture boundary in `docs/zatca/SIGNED_XML_PROMOTION_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-xml-promotion-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact promotion readiness blockers for dummy/test material, missing real certificate/CSID, missing production key custody, missing persistence workflow, missing clearance/reporting, and missing PDF/A-3.
- Updated invoice/settings UI readiness to show that local signed XML validation success is not persisted signed invoice state and cannot be promoted from SDK dummy material.
- No signed XML, QR payload, private key, certificate body, CSID token, OTP, generated CSR body, production credential, ZATCA network call, CSID request, clearance/reporting, PDF/A-3, or production compliance claim is introduced.
