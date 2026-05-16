# ZATCA Phase 2 Compliance Map

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

Status values: `DONE_LOCAL`, `MOCK_ONLY`, `PARTIAL`, `SKELETON`, `NOT_STARTED`, `NEEDS_OFFICIAL_VERIFICATION`, `BLOCKED_RUNTIME`.

Official reference files have now been inventoried under `reference/` and mapped in `OFFICIAL_IMPLEMENTATION_MAP.md`. Treat the table below as LedgerByte's code-status map; use `OFFICIAL_IMPLEMENTATION_MAP.md` and `ZATCA_CODE_GAP_REPORT.md` for reference-backed implementation sequencing.

| Requirement area | Current implementation status | Relevant files | Next engineering step | Manual dependency |
| --- | --- | --- | --- | --- |
| Seller profile data | `DONE_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `apps/web/src/app/(app)/settings/zatca/page.tsx` | Expand validation after official required seller fields are confirmed. | Verify official seller/address/company identifier fields. |
| Buyer/customer data | `SKELETON` | `apps/api/src/zatca/zatca.service.ts`, `packages/zatca-core/src/index.ts` | Map buyer VAT/address rules by invoice type. | Verify standard vs simplified customer requirements. |
| Invoice numbering | `DONE_LOCAL` | `apps/api/src/sales-invoices`, `apps/api/src/number-sequences` | Confirm numbering constraints for ZATCA samples. | Official numbering and branch/device rules. |
| Invoice UUID | `DONE_LOCAL` | `apps/api/prisma/schema.prisma`, `apps/api/src/zatca/zatca.service.ts` | Confirm UUID persistence and regeneration rules. | Official UUID lifecycle rules. |
| ICV | `DONE_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `apps/api/src/zatca/zatca-rules.spec.ts` | Verify official ICV sequence boundaries. | Official EGS/device sequence rules. |
| Previous invoice hash | `PARTIAL_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.controller.ts` | Existing local chains remain local-only; fresh EGS units can opt into SDK-generated hash mode and chain PIH from the previous SDK hash. | Official production hash-chain lifecycle, device/EGS sequencing rules, and signing interactions. |
| Invoice hash | `PARTIAL_LOCAL` | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca-core.spec.ts`, `apps/api/src/zatca-sdk`, `ZatcaEgsUnit.hashMode`, `ZatcaInvoiceMetadata.hashModeSnapshot` | SDK `-generateHash` comparison remains read-only; SDK hash persistence is now available only for a fresh explicitly enabled EGS and does not sign or submit invoices. | Repeatable Java/SDK runtime, verified C14N11 fallback, signing, certificates, and production API behavior. |
| UBL XML | `PARTIAL` | `packages/zatca-core/src/index.ts` | Validate API-generated invoice XML and add signed simplified invoice structure after official validation review. | Official XML implementation standard, SDK samples, and canonicalization/signature docs. |
| Official SDK local XML validation | `PARTIAL` | `apps/api/src/zatca-sdk`, `apps/web/src/app/(app)/settings/zatca/page.tsx`, invoice detail ZATCA panel, `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` | Official SDK samples pass under Java 11; LedgerByte standard fixture now passes globally; simplified fixture passes XSD/EN/PIH but still fails expected signing/QR/certificate production checks; API-generated standard invoice XML validates locally with address/identifier warnings, and the app now exposes no-mutation SDK hash comparison, reset-plan dry-run visibility, and fresh-EGS SDK hash mode controls. | Java 11-14 runtime and verified local SDK paths for repeatable local/CI validation. |
| QR TLV | `SKELETON` | `packages/zatca-core/src/index.ts` | Add Phase 2 cryptographic QR tags after signing exists. | Official QR tag list and byte encoding rules. |
| CSR generation | `DONE_LOCAL` | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts` | Align CSR subject/extensions with official profile. | FATOORA CSR profile requirements. |
| Compliance CSID | `MOCK_ONLY` | `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts` | Implement only after OTP/API contract is verified. | Sandbox access, OTP, endpoint, auth, response fields. |
| Production CSID | `NOT_STARTED` | `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts` | Keep blocked until sandbox validation passes. | Production onboarding approval and official workflow. |
| Standard invoice clearance | `NOT_STARTED` | `apps/api/src/zatca/zatca.service.ts` | Implement after signed XML and official API mapping. | Clearance endpoint, signed XML contract, response mapping. |
| Simplified invoice reporting | `NOT_STARTED` | `apps/api/src/zatca/zatca.service.ts` | Implement after signed XML and official API mapping. | Reporting endpoint, simplified invoice timing rules. |
| Cryptographic stamp/signature | `NOT_STARTED` | `packages/zatca-core/src/index.ts` | Add signing module and test against official samples. | CSID certificate chain, private key custody, signing spec. |
| PDF/A-3 embedding | `NOT_STARTED` | `packages/pdf-core`, `apps/api/src/generated-documents` | Add PDF/A-3 conversion and XML embedding pipeline later. | Official archive expectations and PDF/A-3 validator. |
| Document archive/audit logs | `DONE_LOCAL` | `apps/api/src/generated-documents`, `apps/api/src/zatca/zatca.service.ts` | Add retention/supersede policy and immutable audit review. | Legal retention and audit policy. |
| Error/retry handling | `SKELETON` | `apps/api/src/zatca/zatca.service.ts`, `apps/api/src/zatca/adapters/zatca-adapter.error.ts` | Map official error codes and retry classes. | Official API error catalog and retry guidance. |
| Sandbox/simulation/production environments | `NEEDS_OFFICIAL_VERIFICATION` | `apps/api/src/zatca/zatca.config.ts`, `.env.example` | Verify official URLs and environment semantics before enabling network. | Current official FATOORA endpoint documentation. |

## Reference-backed source files

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`

## 2026-05-16 Fresh EGS Hash-Mode Evidence

Fresh-EGS SDK hash persistence has been validated locally as an engineering milestone:

- Java 11.0.26 and the official SDK launcher were used.
- A fresh EGS with zero metadata was explicitly enabled for `SDK_GENERATED`.
- Two generated standard invoices stored SDK `-generateHash` output in metadata.
- Invoice 1 PIH used the official first seed from `Data/PIH/pih.txt`.
- Invoice 2 PIH used invoice 1's persisted SDK hash.
- Hash compare returned `MATCH` and `noMutation=true` for both invoices.
- Repeated generation did not advance ICV or mutate EGS last hash.

Remaining Phase 2 blockers:

- Generated invoice 2 `KSA-13` is resolved for local fresh-EGS validation after the wrapper supplies an invoice-specific SDK `pihPath` containing metadata `previousInvoiceHash`.
- Generated invoices still show buyer-address quality warning `BR-KSA-63` because customer records do not have a dedicated 4-digit buyer building-number field.
- Signing, certificate/key custody, Phase 2 QR, CSID onboarding, clearance/reporting, and PDF/A-3 remain unimplemented.
- No production compliance is claimed.

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
