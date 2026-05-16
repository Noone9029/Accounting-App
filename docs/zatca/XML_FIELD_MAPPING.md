# ZATCA XML Field Mapping

This is a working engineering checklist.
Official ZATCA/FATOORA documentation must be verified before production.
Do not treat current mock implementation as legal compliance.

The table below maps LedgerByte's current local XML skeleton to future Phase 2 work. Status values are `IMPLEMENTED_LOCAL`, `PLACEHOLDER`, `NOT_STARTED`, and `NEEDS_OFFICIAL_VERIFICATION`.

## Invoice Header

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Invoice number | `SalesInvoice.invoiceNumber` | `/Invoice/cbc:ID` | `IMPLEMENTED_LOCAL` | Yes | Local value is escaped and deterministic. Official numbering constraints still need verification. |
| Invoice UUID | `ZatcaInvoiceMetadata.invoiceUuid` | `/Invoice/cbc:UUID` | `IMPLEMENTED_LOCAL` | Yes | UUID is created locally and reused on repeat generation. Official lifecycle rules still need verification. |
| Issue date/time | `SalesInvoice.issueDate` | `/Invoice/cbc:IssueDate`, `/Invoice/cbc:IssueTime` | `IMPLEMENTED_LOCAL` | Yes | UTC formatting is deterministic. Official timezone/source rules need verification. |
| Invoice type code | `ZatcaInvoiceMetadata.zatcaInvoiceType` | `/Invoice/cbc:InvoiceTypeCode` plus `name` transaction flags | `IMPLEMENTED_LOCAL` | Yes | Standard and simplified invoice fixtures use official sample flags `0100000` and `0200000`. Broader scenario flags still need official fixture coverage. |
| Currency | `SalesInvoice.currency` | `/Invoice/cbc:DocumentCurrencyCode`, `/Invoice/cbc:TaxCurrencyCode` | `IMPLEMENTED_LOCAL` | Yes | Local skeleton emits the invoice currency. |

## Delivery/Supply Date

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Supply date | `ZatcaInvoiceInput.supplyDate`; generated sales invoice XML currently falls back to `SalesInvoice.issueDate` | `/Invoice/cac:Delivery/cbc:ActualDeliveryDate` | `IMPLEMENTED_LOCAL` | Yes | Official Schematron rule `BR-KSA-15` and data dictionary field `KSA-5` require the supply date for standard tax invoices. The local standard fixture now clears the previous supply-date warning, but LedgerByte still needs a dedicated supply/delivery date field before production. |

## Seller/Supplier Party

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Seller name | `ZatcaOrganizationProfile.sellerName` | `AccountingSupplierParty/PartyLegalEntity/RegistrationName` | `IMPLEMENTED_LOCAL` | Yes | Escaped and emitted from profile. |
| Seller VAT | `ZatcaOrganizationProfile.vatNumber` | `AccountingSupplierParty/PartyTaxScheme/CompanyID` | `IMPLEMENTED_LOCAL` | Yes | Local validation requires this before XML generation. |
| Seller commercial identifier | `ZatcaOrganizationProfile.companyIdType/companyIdNumber` | `AccountingSupplierParty/PartyIdentification/ID` | `IMPLEMENTED_LOCAL` | Yes | Local fixtures now use official sample-style `schemeID="CRN"` and clear seller identification warnings. |
| Seller address | `ZatcaOrganizationProfile` address fields | `AccountingSupplierParty/PostalAddress` | `IMPLEMENTED_LOCAL` | Yes | Local fields now follow official UBL child ordering. Full required-field rules need official verification. |

## Buyer/Customer Party

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Buyer name | `Contact.displayName` or `Contact.name` | `AccountingCustomerParty/PartyLegalEntity/RegistrationName` | `IMPLEMENTED_LOCAL` | Yes | Escaped and emitted from customer data. |
| Buyer VAT | `Contact.taxNumber` | `AccountingCustomerParty/PartyTaxScheme/CompanyID` | `IMPLEMENTED_LOCAL` | Yes | Emitted when present. The standard fixture now uses an SDK-accepted 15-digit VAT pattern. Standard vs simplified requirements need broader verification. |
| Buyer address | `Contact.addressLine1`, `Contact.addressLine2`, `Contact.city`, `Contact.postalCode`, `Contact.countryCode` | `AccountingCustomerParty/PostalAddress` | `PARTIAL_LOCAL` | Yes | Generated XML maps `addressLine1` to `StreetName` and `addressLine2` to `CitySubdivisionName`, then emits city, postal code, and country in official sample order. `BR-KSA-63` still warns for Saudi buyers because LedgerByte does not yet capture a dedicated 4-digit buyer `BuildingNumber`. Do not hardcode fake building numbers. |

## Invoice Lines

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Line description | `SalesInvoiceLine.description` | `/Invoice/cac:InvoiceLine/cac:Item/cbc:Description` and `cbc:Name` | `IMPLEMENTED_LOCAL` | Yes | Escaped and deterministic; item child order follows official samples. |
| Quantity and unit price | `SalesInvoiceLine.quantity`, `unitPrice` | `InvoicedQuantity`, `PriceAmount` | `IMPLEMENTED_LOCAL` | Yes | Local two-decimal formatting is not official currency precision validation. |
| Line VAT amount | `SalesInvoiceLine.taxAmount` | `InvoiceLine/cac:TaxTotal/cbc:TaxAmount`; `Item/ClassifiedTaxCategory` | `IMPLEMENTED_LOCAL` | Yes | Single standard VAT line mapping follows official samples. Multi-category tax line mapping remains incomplete. |

## Tax Totals

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| VAT total | `SalesInvoice.taxTotal` | `/Invoice/cac:TaxTotal` | `IMPLEMENTED_LOCAL` | Yes | Emits official sample-style summary tax total plus VAT subtotal for a single standard VAT category. Zero-rated, exempt, and multi-category breakdowns need official mapping. |

## Monetary Totals

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Taxable and payable totals | `SalesInvoice.taxableTotal`, `discountTotal`, `total` | `/Invoice/cac:LegalMonetaryTotal` | `IMPLEMENTED_LOCAL` | Yes | Child order now follows official samples and includes `PrepaidAmount`. Official rounding and allowance/charge rules remain open. |

## Payment/Settlement Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Payment means | Not mapped | `/Invoice/cac:PaymentMeans` | `NOT_STARTED` | Yes | Do not implement until official requirements are verified. |
| Settlement/allowance details | Not mapped | Official target pending | `NOT_STARTED` | Yes | Needs accounting-model and official XML mapping review. |

## Hash/ICV Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| ICV | `ZatcaInvoiceMetadata.icv` | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='ICV']/cbc:UUID` | `IMPLEMENTED_LOCAL` | Yes | Official sample-backed structure is emitted and `BR-KSA-33` is resolved for local fixtures. |
| Previous invoice hash | `ZatcaInvoiceMetadata.previousInvoiceHash` or official first-invoice PIH fallback | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='PIH']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject` | `IMPLEMENTED_LOCAL` | Yes | Official sample-backed structure is emitted. Missing PIH values now fall back to the official first-invoice value from SDK Schematron/docs: base64 SHA-256 of `0`. The local standard fixture now passes SDK PIH validation; production hash-chain sequencing still needs generated-invoice and signing-flow review. |
| QR attachment | Local QR TLV output | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='QR']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject` | `IMPLEMENTED_LOCAL` | Yes | Official attachment shape is emitted. Simplified SDK QR validation still fails until Phase 2 cryptographic QR/signature tags are implemented. |
| Invoice hash | `canonicalizeZatcaInvoiceXmlForHash`, `computeZatcaInvoiceHash`, and SDK `fatoora -generateHash -invoice <filename>` | Hash input after removing `ext:UBLExtensions`, QR `AdditionalDocumentReference`, and `cac:Signature` | `NEEDS_OFFICIAL_VERIFICATION` | Yes | LedgerByte now exposes documented transform groundwork but intentionally blocks official hash output until SDK `-generateHash` or a verified C14N11 implementation is used. Local SDK hash outputs are recorded for fixtures; app hash-chain behavior remains non-production. |

## Signature Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Cryptographic stamp/signature | Not mapped | `/Invoice/ext:UBLExtensions` and signature nodes | `NOT_STARTED` | Yes | Signing, canonicalization, certificate stamp, and related QR tags are pending. |

## Extensions Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| ZATCA UBL extensions | Not mapped | `/Invoice/ext:UBLExtensions` | `NEEDS_OFFICIAL_VERIFICATION` | Yes | Current XML includes TODO comments only. Official namespaces and extension bodies must be verified. |

## 2026-05-16 Generated XML PIH And Address Update

The fresh-EGS `SDK_GENERATED` pass now validates two generated standard invoices globally with the official local SDK when the wrapper points SDK `pihPath` at each invoice metadata `previousInvoiceHash`. This resolves the invoice 2 `KSA-13` failure without changing invoice metadata, EGS state, signing, CSID, or network behavior.

Buyer-address warnings have been reduced but not fully closed. The current safe generated mapping is:

- `Contact.addressLine1` -> `AccountingCustomerParty/Party/PostalAddress/cbc:StreetName`
- `Contact.addressLine2` -> `AccountingCustomerParty/Party/PostalAddress/cbc:CitySubdivisionName`
- `Contact.city` -> `cbc:CityName`
- `Contact.postalCode` -> `cbc:PostalZone`
- `Contact.countryCode` -> `cac:Country/cbc:IdentificationCode`

The remaining `BR-KSA-63` warning requires buyer `cbc:BuildingNumber` for Saudi buyers. LedgerByte needs a real customer address-field expansion before that can be emitted safely.

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
