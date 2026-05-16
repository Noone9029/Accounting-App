# ZATCA Hash Chain And PIH Plan

Audit date: 2026-05-16

Latest pass context: after `3ed2568 Add ZATCA hash-chain replacement groundwork`, this pass adds explicit opt-in SDK hash persistence for fresh EGS units only. The default remains local deterministic hashing, and SDK persistence is blocked unless local SDK execution/readiness is explicitly enabled.

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
- `apps/api/src/zatca/zatca.service.ts` stores the active-mode hash in `ZatcaInvoiceMetadata.invoiceHash` and `xmlHash`.
- `ZatcaEgsUnit.hashMode` defaults to `LOCAL_DETERMINISTIC`; `ZatcaInvoiceMetadata.hashModeSnapshot` records the mode used for each generated metadata row.
- In `LOCAL_DETERMINISTIC` mode, `apps/api/src/zatca/zatca.service.ts` updates `ZatcaEgsUnit.lastInvoiceHash` with the local deterministic hash after XML generation.
- In `SDK_GENERATED` mode, enabled only on a fresh EGS unit, metadata generation runs the local SDK `-generateHash` command and persists the SDK hash as the invoice hash/XML hash before advancing EGS ICV/last-hash state.
- Subsequent generated invoices use `activeEgs.lastInvoiceHash` as `previousInvoiceHash`, so SDK mode chains use previous SDK hashes while local mode chains remain development-only.
- Repeating generation for an existing generated invoice returns the existing metadata and does not consume another ICV or mutate `ZatcaEgsUnit.lastInvoiceHash`.
- `POST /sales-invoices/:id/zatca/hash-compare` now compares the stored app hash to SDK `-generateHash` output when SDK execution is enabled. The endpoint is explicitly read-only and returns `noMutation=true`.
- `GET /zatca/hash-chain-reset-plan` now returns active EGS state, hash mode, metadata counts, SDK readiness blockers, per-EGS enablement eligibility, reset risks, and recommended next steps as a dry run only.
- `packages/zatca-core/src/index.ts` exposes canonicalization/hash groundwork helpers but intentionally blocks official hash output until SDK `-generateHash` or a verified C14N11 implementation is wired in.

## Hash Mode Configuration

LedgerByte exposes both an environment planning flag and persistent per-EGS hash mode state:

```env
ZATCA_HASH_MODE=local
```

Supported values:

- `local`: default. Existing deterministic app hash storage remains active for EGS units whose persistent `hashMode` is `LOCAL_DETERMINISTIC`.
- `sdk`: env request only. SDK persistence still requires `ZATCA_SDK_EXECUTION_ENABLED=true`, Java 11-14, SDK/config/work-dir readiness, and explicit per-EGS enablement.

Persistent fields added:

- `ZatcaEgsUnit.hashMode`: `LOCAL_DETERMINISTIC` by default, optionally `SDK_GENERATED` after explicit enablement.
- `ZatcaEgsUnit.hashModeEnabledAt`, `hashModeEnabledById`, `hashModeResetReason`, and `sdkHashChainStartedAt`: administrative traceability for enabling SDK mode.
- `ZatcaInvoiceMetadata.hashModeSnapshot`: records the active hash mode used when invoice metadata was generated.

SDK mode is not enabled automatically and is blocked on EGS units that already have ZATCA invoice metadata. Existing local hash chains are not migrated.

## Read-Only Hash Comparison Endpoint

`POST /sales-invoices/:id/zatca/hash-compare`:

- Requires auth, `x-organization-id`, and `zatca.runChecks` or `zatca.manage`.
- Generates no new accounting records.
- Reads existing generated XML metadata only.
- Runs SDK `fatoora -generateHash -invoice <filename>` only when `ZATCA_SDK_EXECUTION_ENABLED=true` and readiness passes.
- Returns `appHash`, `sdkHash`, `hashMatches`, `hashComparisonStatus`, env `hashMode`, `egsHashMode`, `metadataHashModeSnapshot`, `blockingReasons`, `warnings`, and `noMutation=true`.
- Does not update `ZatcaInvoiceMetadata.invoiceHash`, `ZatcaInvoiceMetadata.previousInvoiceHash`, `ZatcaEgsUnit.lastIcv`, or `ZatcaEgsUnit.lastInvoiceHash`.

With the default disabled SDK setting, this endpoint returns `hashComparisonStatus=BLOCKED` and still confirms the current stored app hash.

## Dry-Run Reset Strategy

`GET /zatca/hash-chain-reset-plan`:

- Requires auth, `x-organization-id`, and `zatca.manage`.
- Returns active EGS unit count, current ICV, current last hash, latest generated invoice metadata, per-EGS metadata counts, hash mode, SDK readiness blockers, `canEnableSdkHashMode`, reset risks, and recommended next steps.
- Always returns `dryRunOnly=true`, `localOnly=true`, and `noMutation=true`.
- Does not reset or delete metadata.

Recommended reset approach before any future official SDK hash persistence:

1. Treat all current `ZatcaInvoiceMetadata.invoiceHash` and `ZatcaEgsUnit.lastInvoiceHash` values as local-development-only.
2. For non-production testing, create a fresh EGS unit and enable `SDK_GENERATED` before generating invoices.
3. If an EGS already has invoice metadata, do not migrate it in place; create a new EGS unit for SDK hash mode.
4. Before any production CSID flow, decide whether to archive local metadata, regenerate local XML, or start a new official chain from the ZATCA first-invoice PIH seed.
5. Never reset an EGS unit used for real submission without a formally approved ZATCA recovery procedure.

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

This mismatch is expected for local-mode metadata because the app stores the local deterministic hash. Fresh EGS units explicitly enabled for `SDK_GENERATED` mode store the SDK hash for future generated metadata; signing and submission remain disabled.

## Fresh EGS SDK Hash-Mode Validation

Validation date: 2026-05-16.

Commit context: current working tree after `da6540f Add ZATCA SDK hash mode persistence groundwork`.

Official files inspected for this pass:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Runtime used:

- Java: `11.0.26` from `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`
- SDK copy: `E:\Work\Temp\ledgerbyte-zatca-sdk-238-R3.4.8`
- Work dir: `E:\Work\Temp\ledgerbyte-zatca-sdk-hash-mode`
- Commands: `fatoora -generateHash -invoice <filename>` and `fatoora -validate -invoice <filename>`
- Network: none

Fresh local validation setup:

- Test organization: `SDK Hash Validation 20260516075536` (`31160055-0d77-44ad-8578-743e0f9b5f57`)
- Fresh EGS: `SDK Hash EGS 20260516075536` (`81e1ade0-dfb8-4c64-bf1a-1719dd0774f9`)
- Metadata count before enablement: `0`
- SDK hash mode enablement: `SDK_GENERATED`
- Audit event: `ZATCA_SDK_HASH_MODE_ENABLED` found

Invoice hash-chain results:

| Invoice | ICV | Persisted hash | Direct SDK hash | PIH | Hash compare |
| --- | ---: | --- | --- | --- | --- |
| `INV-000001` | 1 | `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=` | `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=` | Official first PIH seed from `Data/PIH/pih.txt` | `MATCH` |
| `INV-000002` | 2 | `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=` | `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=` | `INV-000001` SDK hash | `MATCH` |

Idempotency result:

- Re-running XML/metadata generation for both invoices returned existing metadata.
- `ZatcaEgsUnit.lastIcv` remained `2`.
- `ZatcaEgsUnit.lastInvoiceHash` remained `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=`.
- No metadata, ICV, or EGS last-hash mutation occurred during hash comparison.

SDK XML validation result:

- `INV-000001`: XSD/EN/KSA/PIH passed and global validation passed. Remaining warnings were buyer-address data quality rules: `BR-KSA-F-06-C23`, `BR-KSA-63`, `BR-KSA-10`, and `BR-KSA-F-06-C28`.
- `INV-000002`: XSD/EN/KSA passed and hash comparison matched, but SDK PIH validation failed with `KSA-13` and global validation failed. The API wrapper now reports `success=false` when official SDK output says global validation failed, even if the SDK process exits `0`.

This confirms SDK hash persistence and LedgerByte's stored PIH chain behave as designed for a fresh EGS. The remaining SDK PIH validator failure on the second generated XML must be investigated against official hash-chain/signing expectations before any production compliance claim.

## Migration Impact

Changing LedgerByte from the local hash to the official SDK/C14N11 hash is not a simple field swap:

- Existing local `ZatcaInvoiceMetadata.invoiceHash` values are not production-grade.
- Existing local `ZatcaEgsUnit.lastInvoiceHash` values are not production-grade.
- Existing dev PIH chains should not be reused for a real CSID or production reporting chain.
- SDK mode enablement is blocked when an EGS already has metadata; use a fresh EGS unit rather than migrating a local chain in place.
- Once official hashes are used, generated XML, signed XML, QR tag 6, PIH, ICV, and metadata persistence must agree.

## Recommended Implementation Order

1. Keep local deterministic mode as the default for existing EGS units and existing metadata.
2. Use `POST /zatca/egs-units/:id/enable-sdk-hash-mode` only for fresh non-production EGS units after SDK readiness passes.
3. Continue comparing stored/app hashes to SDK `-generateHash` output when investigating XML changes.
4. Decide whether production uses SDK `-generateHash` directly or a verified in-process C14N11 implementation.
5. Implement signing and Phase 2 QR only after SDK-mode hash-chain behavior is verified on fresh test EGS units.
6. Keep real clearance/reporting blocked until signed XML passes local SDK and official sandbox checks.

## Non-Goals For This Pass

- No signed XML was generated.
- No certificate or private-key custody model was implemented.
- No ZATCA API call was made.
- No CSID was requested.
- No generated metadata was mutated by SDK validation.
- No production compliance is claimed.

## 2026-05-16 PIH Validator Configuration Fix

Fresh-EGS SDK hash-mode validation exposed a local SDK validation issue, not a stored hash-chain issue. `INV-000002` embedded `INV-000001`'s SDK `-generateHash` output as PIH and hash compare returned `MATCH`, but the standalone SDK `-validate` command still failed `KSA-13`. The confirmed cause was the SDK validator reading `pihPath` from `Configuration/config.json`; the default file `Data/PIH/pih.txt` contains the first-invoice PIH seed, so validating invoice 2 against that default file compared the XML PIH against the wrong previous hash.

The wrapper and debug runner now create an invoice-specific temporary SDK config for validation when metadata includes `previousInvoiceHash`. That temporary config points `pihPath` at a temp `pih.txt` containing the invoice metadata previous hash. No invoice metadata, EGS ICV, EGS last hash, SDK bundle, committed config, or production setting is mutated.

Latest fresh-EGS evidence after the fix:

| Invoice | ICV | PIH used | Persisted/direct SDK hash | SDK XML validation |
| --- | ---: | --- | --- | --- |
| `INV-000001` | 1 | Official first PIH seed | `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=` | Global `PASSED`; buyer-address warning remains |
| `INV-000002` | 2 | `INV-000001` SDK hash | `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=` | Global `PASSED`; `KSA-13` resolved; buyer-address warning remains |

Buyer address warnings are now narrowed to data quality rather than PIH/hash-chain correctness. Generated XML maps `Contact.addressLine1` to buyer `cbc:StreetName` and `Contact.addressLine2` to buyer `cbc:CitySubdivisionName`, matching the official sample order. `BR-KSA-63` remains because the current `Contact` model does not have a dedicated 4-digit buyer building-number field. Do not hardcode fake buyer building numbers in production XML.

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
