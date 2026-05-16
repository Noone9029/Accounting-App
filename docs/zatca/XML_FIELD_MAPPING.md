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
| Buyer address | `Contact` address fields | `AccountingCustomerParty/PostalAddress` | `IMPLEMENTED_LOCAL` | Yes | Current contact model has partial address coverage, but emitted fields now follow official UBL child ordering. |

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
| Previous invoice hash | `ZatcaInvoiceMetadata.previousInvoiceHash` | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='PIH']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject` | `IMPLEMENTED_LOCAL` | Yes | Official sample-backed structure is emitted, but the value is still local/dev hash-chain groundwork and `KSA-13` remains until canonical hash-chain work is implemented. |
| QR attachment | Local QR TLV output | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='QR']/cac:Attachment/cbc:EmbeddedDocumentBinaryObject` | `IMPLEMENTED_LOCAL` | Yes | Official attachment shape is emitted. Simplified SDK QR validation still fails until Phase 2 cryptographic QR/signature tags are implemented. |
| Invoice hash | Generated from current XML string | Not final | `NEEDS_OFFICIAL_VERIFICATION` | Yes | Current hash is deterministic local SHA-256 over generated XML, not official canonicalized signing hash. |

## Signature Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Cryptographic stamp/signature | Not mapped | `/Invoice/ext:UBLExtensions` and signature nodes | `NOT_STARTED` | Yes | Signing, canonicalization, certificate stamp, and related QR tags are pending. |

## Extensions Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| ZATCA UBL extensions | Not mapped | `/Invoice/ext:UBLExtensions` | `NEEDS_OFFICIAL_VERIFICATION` | Yes | Current XML includes TODO comments only. Official namespaces and extension bodies must be verified. |
