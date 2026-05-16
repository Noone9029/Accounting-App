# ZATCA XML Fixtures Guide

This is a working engineering checklist.
Official ZATCA/FATOORA documentation must be verified before production.
Do not treat current mock implementation as legal compliance.

## Fixture Location

Local development fixtures live in:

`packages/zatca-core/fixtures/`

Current fixtures are deliberately labeled as local dev fixtures:

- `local-standard-tax-invoice.input.json`
- `local-standard-tax-invoice.expected.xml`
- `local-simplified-tax-invoice.input.json`
- `local-simplified-tax-invoice.expected.xml`

## What These Fixtures Are

These fixtures prove that LedgerByte's current XML builder is deterministic, escapes XML-special characters, and preserves Arabic/Unicode text. They are not official ZATCA fixtures and must not be used as evidence of legal compliance.

The expected XML files are compared directly in automated tests. If the XML builder changes intentionally, update the expected fixture and document why the local skeleton changed.

## Official Fixture Registry

Official SDK sample fixture targets are now registered in `apps/api/src/zatca-sdk/zatca-official-fixtures.ts`. The registry references files under the repo-local `reference/` folder and the current LedgerByte local fixtures without copying official sample XML into application code.

The fixture validation passes are documented in `OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md`. Official SDK samples pass under Java 11 and the official launcher. After the supply-date and PIH/hash groundwork pass, LedgerByte's local standard fixture passes SDK XSD/EN/KSA/PIH validation and the global SDK result passes. The local simplified fixture passes SDK XSD/EN/PIH validation but still fails signing, QR, and certificate checks because real signing, certificate, canonical hash-chain sequencing, and Phase 2 QR behavior are not implemented.

SDK `-generateHash` values are now recorded for the official standard/simplified samples and the LedgerByte standard/simplified local fixtures. These values are hash-oracle evidence only; normal unit tests parse recorded output and do not require Java or the SDK.

Before promoting official fixture checks:

1. Obtain current official ZATCA/FATOORA XML, signing, QR, and validation requirements.
2. Confirm whether fixture data may be committed to the repository.
3. Store official fixtures separately from local dev fixtures.
4. Add tests that clearly distinguish local deterministic checks from official SDK or portal validation.
5. Keep real API calls disabled unless explicit sandbox configuration is provided.

## Current Test Behavior

The local tests compare generated XML against the expected local XML text. They also verify:

- deterministic XML output for the same input
- XML escaping for `&`, `<`, `>`, quotes, and apostrophes
- Arabic/Unicode text survives generation
- local validation rejects missing seller VAT and missing invoice lines
- UBL header element order around issue date/time and additional document references
- official sample-backed ICV, PIH, and QR additional document reference shapes
- standard and simplified invoice transaction-code flags
- supply-date `cac:Delivery/cbc:ActualDeliveryDate` mapping for the standard invoice fixture
- official first-invoice PIH fallback and explicit PIH override behavior
- documented hash-input transforms while blocking official C14N11 hash computation until SDK `-generateHash` or verified canonicalization is used
- SDK hash output parsing and read-only hash comparison response shape

These tests are engineering guardrails only. Official ZATCA/FATOORA validation remains a future manual dependency.

## Generated XML PIH Debug Fixture

`corepack pnpm zatca:debug-pih-chain` is the current local regression helper for generated API XML under a fresh `SDK_GENERATED` EGS. It creates two generated standard invoices, runs SDK `-generateHash`, validates XML with the SDK, and checks that invoice 2 PIH equals invoice 1's SDK hash.

The helper also mirrors the API wrapper's invoice-specific PIH validation behavior: when validating an invoice with metadata, it writes a temporary SDK config whose `pihPath` points to that invoice's `previousInvoiceHash`. This is needed because the SDK's default `Data/PIH/pih.txt` contains only the first-invoice seed. Normal unit tests do not require Java or the SDK.

Latest generated XML debug output:

- `INV-000001`: global SDK validation passed with SDK hash `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=`.
- `INV-000002`: global SDK validation passed with SDK hash `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=` and PIH equal to invoice 1's SDK hash.
- Remaining generated XML warning: `BR-KSA-63`, caused by missing buyer building number data in the current contact model.

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
