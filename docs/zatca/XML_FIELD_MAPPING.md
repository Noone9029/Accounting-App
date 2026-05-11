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
| Invoice type code | `ZatcaInvoiceMetadata.zatcaInvoiceType` | `/Invoice/cbc:InvoiceTypeCode` | `PLACEHOLDER` | Yes | Current mapping is scaffolding only. Phase 2 invoice-type flags require official docs. |
| Currency | `SalesInvoice.currency` | `/Invoice/cbc:DocumentCurrencyCode`, `/Invoice/cbc:TaxCurrencyCode` | `IMPLEMENTED_LOCAL` | Yes | Local skeleton emits the invoice currency. |

## Seller/Supplier Party

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Seller name | `ZatcaOrganizationProfile.sellerName` | `AccountingSupplierParty/PartyLegalEntity/RegistrationName` | `IMPLEMENTED_LOCAL` | Yes | Escaped and emitted from profile. |
| Seller VAT | `ZatcaOrganizationProfile.vatNumber` | `AccountingSupplierParty/PartyTaxScheme/CompanyID` | `IMPLEMENTED_LOCAL` | Yes | Local validation requires this before XML generation. |
| Seller address | `ZatcaOrganizationProfile` address fields | `AccountingSupplierParty/PostalAddress` | `PLACEHOLDER` | Yes | Optional local fields are emitted when present. Required field rules need official verification. |

## Buyer/Customer Party

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Buyer name | `Contact.displayName` or `Contact.name` | `AccountingCustomerParty/PartyLegalEntity/RegistrationName` | `IMPLEMENTED_LOCAL` | Yes | Escaped and emitted from customer data. |
| Buyer VAT | `Contact.taxNumber` | `AccountingCustomerParty/PartyTaxScheme/CompanyID` | `PLACEHOLDER` | Yes | Emitted when present. Standard vs simplified requirements need official verification. |
| Buyer address | `Contact` address fields | `AccountingCustomerParty/PostalAddress` | `PLACEHOLDER` | Yes | Current contact model has partial address coverage only. |

## Invoice Lines

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Line description | `SalesInvoiceLine.description` | `/Invoice/cac:InvoiceLine/cac:Item/cbc:Name` | `IMPLEMENTED_LOCAL` | Yes | Escaped and deterministic. |
| Quantity and unit price | `SalesInvoiceLine.quantity`, `unitPrice` | `InvoicedQuantity`, `PriceAmount` | `IMPLEMENTED_LOCAL` | Yes | Local two-decimal formatting is not official currency precision validation. |
| Line VAT amount | `SalesInvoiceLine.taxAmount` | `InvoiceLine/cac:TaxTotal/cbc:TaxAmount` | `IMPLEMENTED_LOCAL` | Yes | Multi-category tax line mapping remains incomplete. |

## Tax Totals

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| VAT total | `SalesInvoice.taxTotal` | `/Invoice/cac:TaxTotal` | `IMPLEMENTED_LOCAL` | Yes | Single standard VAT skeleton only. Zero-rated, exempt, and category breakdowns need official mapping. |

## Monetary Totals

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Taxable and payable totals | `SalesInvoice.taxableTotal`, `discountTotal`, `total` | `/Invoice/cac:LegalMonetaryTotal` | `IMPLEMENTED_LOCAL` | Yes | Local values are deterministic. Official rounding and allowance/charge rules remain open. |

## Payment/Settlement Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Payment means | Not mapped | `/Invoice/cac:PaymentMeans` | `NOT_STARTED` | Yes | Do not implement until official requirements are verified. |
| Settlement/allowance details | Not mapped | Official target pending | `NOT_STARTED` | Yes | Needs accounting-model and official XML mapping review. |

## Hash/ICV Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| ICV | `ZatcaInvoiceMetadata.icv` | `/Invoice/cbc:ID[@schemeID='ICV']` | `PLACEHOLDER` | Yes | Local hash-chain groundwork only. |
| Previous invoice hash | `ZatcaInvoiceMetadata.previousInvoiceHash` | `/Invoice/cac:AdditionalDocumentReference[cbc:ID='PIH']` | `PLACEHOLDER` | Yes | Canonical source and official embedding rules need verification. |
| Invoice hash | Generated from current XML string | Not final | `NEEDS_OFFICIAL_VERIFICATION` | Yes | Current hash is deterministic local SHA-256 over generated XML, not official canonicalized signing hash. |

## Signature Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| Cryptographic stamp/signature | Not mapped | `/Invoice/ext:UBLExtensions` and signature nodes | `NOT_STARTED` | Yes | Signing, canonicalization, certificate stamp, and related QR tags are pending. |

## Extensions Placeholders

| Requirement area | LedgerByte source | XML target | Status | Official verification required | Notes |
| --- | --- | --- | --- | --- | --- |
| ZATCA UBL extensions | Not mapped | `/Invoice/ext:UBLExtensions` | `NEEDS_OFFICIAL_VERIFICATION` | Yes | Current XML includes TODO comments only. Official namespaces and extension bodies must be verified. |
