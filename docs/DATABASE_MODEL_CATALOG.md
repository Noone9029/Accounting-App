# Database Model Catalog

Audit date: 2026-05-13

Schema source: `apps/api/prisma/schema.prisma`

## Enums

| Enum | Values | Purpose |
| --- | --- | --- |
| `MembershipStatus` | `ACTIVE`, `INVITED`, `SUSPENDED` | Organization membership state. |
| `AccountType` | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, `COST_OF_SALES` | Chart of accounts classification. |
| `ContactType` | `CUSTOMER`, `SUPPLIER`, `BOTH` | AR/AP contact role. |
| `TaxRateScope` | `SALES`, `PURCHASES`, `BOTH` | Tax rate use area. |
| `TaxRateCategory` | `STANDARD`, `ZERO_RATED`, `EXEMPT`, `OUT_OF_SCOPE`, `REVERSE_CHARGE` | VAT category placeholder. |
| `JournalEntryStatus` | `DRAFT`, `POSTED`, `VOIDED`, `REVERSED` | Journal lifecycle. |
| `ItemType` | `SERVICE`, `PRODUCT` | Item classification. |
| `ItemStatus` | `ACTIVE`, `DISABLED` | Item availability. |
| `SalesInvoiceStatus` | `DRAFT`, `FINALIZED`, `VOIDED` | Invoice lifecycle. |
| `CreditNoteStatus` | `DRAFT`, `FINALIZED`, `VOIDED` | Credit note lifecycle. |
| `PurchaseOrderStatus` | `DRAFT`, `APPROVED`, `SENT`, `PARTIALLY_BILLED`, `BILLED`, `CLOSED`, `VOIDED` | Purchase order lifecycle. |
| `PurchaseBillStatus` | `DRAFT`, `FINALIZED`, `VOIDED` | Purchase bill lifecycle. |
| `CustomerPaymentStatus` | `DRAFT`, `POSTED`, `VOIDED` | Customer payment lifecycle. |
| `SupplierPaymentStatus` | `DRAFT`, `POSTED`, `VOIDED` | Supplier payment lifecycle. |
| `CustomerRefundStatus` | `DRAFT`, `POSTED`, `VOIDED` | Customer refund lifecycle. |
| `CustomerRefundSourceType` | `CUSTOMER_PAYMENT`, `CREDIT_NOTE` | Refund source type. |
| `BankAccountType` | `BANK`, `CASH`, `WALLET`, `CARD`, `OTHER` | Cash/bank profile classification for posting asset accounts. |
| `BankAccountStatus` | `ACTIVE`, `ARCHIVED` | Cash/bank profile availability. |
| `BankTransferStatus` | `POSTED`, `VOIDED` | Bank transfer lifecycle. |
| `DocumentType` | `SALES_INVOICE`, `CREDIT_NOTE`, `CUSTOMER_PAYMENT_RECEIPT`, `CUSTOMER_REFUND`, `CUSTOMER_STATEMENT`, `PURCHASE_ORDER`, `PURCHASE_BILL`, `PURCHASE_DEBIT_NOTE`, `SUPPLIER_PAYMENT_RECEIPT`, `SUPPLIER_REFUND`, `CASH_EXPENSE` | Generated document classification. |
| `GeneratedDocumentStatus` | `GENERATED`, `FAILED`, `SUPERSEDED` | Archive status. |
| `ZatcaEnvironment` | `SANDBOX`, `SIMULATION`, `PRODUCTION` | ZATCA environment marker. |
| `ZatcaRegistrationStatus` | `NOT_CONFIGURED`, `DRAFT`, `READY_FOR_CSR`, `OTP_REQUIRED`, `CERTIFICATE_ISSUED`, `ACTIVE`, `SUSPENDED` | ZATCA profile/EGS state. |
| `ZatcaInvoiceType` | `STANDARD_TAX_INVOICE`, `SIMPLIFIED_TAX_INVOICE`, `CREDIT_NOTE`, `DEBIT_NOTE` | Future ZATCA invoice type. |
| `ZatcaInvoiceStatus` | `NOT_SUBMITTED`, `XML_GENERATED`, `READY_FOR_SUBMISSION`, `SUBMISSION_PENDING`, `CLEARED`, `REPORTED`, `REJECTED`, `FAILED` | Local ZATCA metadata lifecycle. |
| `ZatcaSubmissionType` | `COMPLIANCE_CHECK`, `CLEARANCE`, `REPORTING` | ZATCA submission/log type. |
| `ZatcaSubmissionStatus` | `PENDING`, `SUCCESS`, `REJECTED`, `FAILED` | ZATCA submission/log result. |
| `FiscalPeriodStatus` | `OPEN`, `CLOSED`, `LOCKED` | Fiscal period posting control state. |
| `NumberSequenceScope` | `JOURNAL_ENTRY`, `INVOICE`, `PURCHASE_ORDER`, `BILL`, `PAYMENT`, `CUSTOMER_REFUND`, `CREDIT_NOTE`, `DEBIT_NOTE`, `PURCHASE_DEBIT_NOTE`, `SUPPLIER_REFUND`, `CASH_EXPENSE`, `BANK_TRANSFER`, `CONTACT` | Tenant numbering scopes. |

## Core Tenant And Security Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `User` | Login identity. | `email`, `passwordHash`, `name`. | Memberships, created/posted records, generated documents. | Tracks actors for accounting events. | No explicit status enum. | No password reset/MFA. |
| `Organization` | Tenant root. | `name`, `legalName`, `taxNumber`, `baseCurrency`, `timezone`. | Owns almost every business model. | Tenant boundary for ledgers/journals. | No explicit status enum. | No subscription/billing state. |
| `OrganizationMember` | User-to-org link. | `organizationId`, `userId`, `roleId`, `status`. | User, Organization, Role. | Controls org access and permission lookup. | `MembershipStatus`. | Invite/member lifecycle UI remains limited. |
| `Role` | Stored permission set. | `name`, `permissions` JSON, `isSystem`. | Organization, members. | Runtime API/UI access control. | No lifecycle enum. | System roles are protected; no approval workflow. |
| `AuditLog` | Mutation audit trail. | `action`, `entityType`, `entityId`, `before`, `after`. | Organization, optional actor. | Supports auditability. | Append-only by convention. | Coverage should be verified per mutation. |

## Organization Setup Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `Branch` | Sales/purchase branch. | `name`, `taxNumber`, address, `isDefault`. | Organization, invoices, credit notes, purchase orders, bills. | Branch context for documents and future taxes. | Active flag not present. | Multiple default branches can exist. |
| `Contact` | Customer/supplier master. | `type`, `name`, `displayName`, `taxNumber`, address, `isActive`. | Sales invoices, credit notes, purchase orders, bills, payments, refunds. | AR/AP ledgers are contact-based. | Active boolean. | No bank details or duplicate management. |
| `OrganizationDocumentSettings` | PDF display settings. | titles, colors, visibility flags, template names. | One per organization. | Document presentation only. | No status enum. | Only standard renderer implemented. |
| `GeneratedDocument` | PDF archive. | `documentType`, `sourceType`, `sourceId`, `contentBase64`, `contentHash`, `sizeBytes`. | Organization, generatedBy user. | Audit/archive of issued operational documents. | `GeneratedDocumentStatus`. | Base64 DB storage is not production-scale. |
| `NumberSequence` | Tenant numbering. | `scope`, `prefix`, `nextNumber`, `padding`. | Organization. | Generates accounting document numbers. | No status enum. | No UI for sequence config. |

## Accounting Master Data

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `Account` | Chart of accounts node. | `code`, `name`, `type`, `allowPosting`, `isSystem`, `isActive`, `parentId`. | Journal lines, items, invoice/credit/bill lines, payments/refunds, optional bank account profile. | All postings reference accounts. | Active/system flags. | Descendant cycle guard needs hardening. |
| `BankAccountProfile` | Cash/bank metadata wrapper for a posting asset account. | `accountId`, `type`, `status`, `displayName`, masked account/IBAN, currency, opening balance metadata, `openingBalanceJournalEntryId`, `openingBalancePostedAt`. | Organization, one linked Account, opening-balance journal, incoming/outgoing transfers. | Profile metadata itself does not post; optional opening-balance action posts one guarded journal and ledger balance is derived from posted journal lines. | `BankAccountStatus`. | No statement import, reconciliation, live feed, transfer fees, or FX transfer handling. |
| `BankTransfer` | Posted movement between two active bank/cash profiles. | `transferNumber`, from/to profile and account ids, `transferDate`, `amount`, `journalEntryId`, `voidReversalJournalEntryId`. | Organization, from/to BankAccountProfile, from/to Account, posting/reversal JournalEntry, creator. | Posts Dr destination bank/cash and Cr source bank/cash; void posts the reverse once. | `BankTransferStatus`. | No transfer fee, FX gain/loss, scheduled transfers, or reconciliation matching. |
| `TaxRate` | VAT/tax rate. | `scope`, `category`, `rate`, `isActive`, `isSystem`. | Invoice, credit note, purchase bill lines, items, journal lines. | Calculates tax and links tax lines. | Active/system flags. | VAT reporting not implemented. |
| `Item` | Product/service catalog. | `type`, `status`, `sellingPrice`, `purchaseCost`, account/tax defaults, `inventoryTracking`. | Invoice, credit note, purchase order, purchase bill lines. | Defaults accounts/taxes; no stock accounting yet. | `ItemStatus`. | Inventory tracking is a flag only. |
| `FiscalPeriod` | Accounting posting period. | `name`, `startsOn`, `endsOn`, `status`. | Organization. | Controls posting windows through the fiscal period guard. | `FiscalPeriodStatus`. | No unlock/admin approval, fiscal year wizard, or retained earnings close. |

## Journal Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `JournalEntry` | Header for accounting postings. | `entryNumber`, `status`, `entryDate`, `totalDebit`, `totalCredit`, `reversalOfId`. | Lines, source workflow records, reversal entry. | Source of GL truth. | `JournalEntryStatus`. | No period lock enforcement. |
| `JournalLine` | Debit/credit line. | `accountId`, `debit`, `credit`, `currency`, `exchangeRate`, optional `taxRateId`. | Journal entry, account, tax rate. | GL line-level impact. | Inherits entry lifecycle. | No dimensions beyond account/tax. |

## Sales And AR Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `SalesInvoice` | Customer invoice. | `invoiceNumber`, `customerId`, dates, totals, `balanceDue`, `journalEntryId`, `reversalJournalEntryId`. | Lines, payments, credit notes, ZATCA metadata. | Finalization posts Dr AR, Cr revenue/VAT. | `SalesInvoiceStatus`. | No recurring invoices; no period locks. |
| `SalesInvoiceLine` | Invoice line. | `quantity`, `unitPrice`, `discountRate`, `taxRateId`, calculated amounts. | Invoice, item, account, tax rate. | Revenue and tax basis. | Inherits invoice lifecycle. | No inventory movement. |
| `CustomerPayment` | Customer receipt. | `paymentNumber`, `amountReceived`, `unappliedAmount`, `accountId`, journal/reversal links. | Allocations, unapplied allocations, refunds. | Posts Dr bank/cash, Cr AR. | `CustomerPaymentStatus`. | No gateway/bank reconciliation. |
| `CustomerPaymentAllocation` | Payment-to-invoice match at creation. | `paymentId`, `invoiceId`, `amountApplied`. | Payment, invoice. | Reduces invoice `balanceDue`; payment already posted. | Immutable row. | No reversal except payment void. |
| `CustomerPaymentUnappliedAllocation` | Later overpayment application. | `paymentId`, `invoiceId`, `amountApplied`, `reversedAt`, `reversalReason`. | Payment, invoice, reversedBy. | Matching only; no journal. | Active if `reversedAt` null. | No automatic matching. |
| `CreditNote` | Customer credit note. | `creditNoteNumber`, `customerId`, optional `originalInvoiceId`, totals, `unappliedAmount`, journal/reversal links. | Lines, allocations, refunds. | Finalization posts Dr revenue/VAT, Cr AR. | `CreditNoteStatus`. | ZATCA credit note XML not implemented. |
| `CreditNoteLine` | Credit note line. | Quantity/price/discount/tax/calculated amounts. | Credit note, item, account, tax rate. | Revenue/tax reversal basis. | Inherits credit note lifecycle. | No inventory return. |
| `CreditNoteAllocation` | Credit note-to-invoice match. | `creditNoteId`, `invoiceId`, `amountApplied`, reversal metadata. | Credit note, invoice, reversedBy. | Matching only; no journal. | Active if `reversedAt` null. | No automatic suggestion. |
| `CustomerRefund` | Manual customer refund. | `refundNumber`, `sourceType`, source payment/credit note, `amountRefunded`, account, journal/reversal links. | Contact, source payment or credit note, account. | Posts Dr AR, Cr bank/cash. | `CustomerRefundStatus`. | No payment gateway or bank reconciliation. |

## Purchases And AP Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `PurchaseOrder` | Supplier purchase order. | `purchaseOrderNumber`, `supplierId`, dates, totals, status timestamps, `convertedBillId`. | Lines, supplier, branch, converted bill. | No journal entries; source document for later bill. | `PurchaseOrderStatus`. | No partial receiving, partial billing, approval chain, or stock movement. |
| `PurchaseOrderLine` | Purchase order line. | Optional item/account, quantity/price/discount/tax/calculated amounts. | Purchase order, item, optional account, tax rate. | No posting; account pre-fills converted bill line. | Inherits PO lifecycle. | Account can be missing until conversion, but conversion then requires one. |
| `PurchaseBill` | Supplier bill. | `billNumber`, `supplierId`, optional `purchaseOrderId`, dates, totals, `balanceDue`, journal/reversal links. | Lines, source purchase order, supplier payment allocations. | Finalization posts Dr expense/asset/VAT receivable, Cr AP. | `PurchaseBillStatus`. | No multi-PO or partial matching. |
| `PurchaseBillLine` | Bill line. | Quantity/price/discount/tax/calculated amounts. | Bill, item, account, tax rate. | Expense/asset and VAT basis. | Inherits bill lifecycle. | No stock movement or landed cost. |
| `SupplierPayment` | Supplier payment. | `paymentNumber`, `supplierId`, `amountPaid`, `unappliedAmount`, account, journal/reversal links. | Supplier, paid-through account, allocations. | Posts Dr AP, Cr bank/cash. | `SupplierPaymentStatus`. | No AP overpayment application/refund workflow beyond MVP unapplied storage. |
| `SupplierPaymentAllocation` | Supplier payment-to-bill match. | `paymentId`, `billId`, `amountApplied`. | Supplier payment, purchase bill. | Reduces bill `balanceDue`; payment already posted. | Immutable row. | No separate allocation reversal; payment void restores. |

## ZATCA Models

| Model | Purpose | Important fields | Relationships | Accounting impact | Lifecycle/status | Known limitations |
| --- | --- | --- | --- | --- | --- | --- |
| `ZatcaOrganizationProfile` | Seller profile. | environment, registration status, seller/VAT/address fields. | Organization, EGS units. | Supports invoice compliance metadata. | `ZatcaRegistrationStatus`. | Needs official validation. |
| `ZatcaEgsUnit` | EGS/device record. | device serial, CSR/private key/CSIDs, active flag, last ICV/hash. | Profile, invoice metadata, submission logs. | Tracks local hash-chain state. | `ZatcaRegistrationStatus`. | Private key DB field is dev-only; real keys need KMS. |
| `ZatcaInvoiceMetadata` | Per-invoice ZATCA local metadata. | invoice UUID, status, ICV, previous hash, invoice hash, XML/QR base64. | Sales invoice, EGS, logs. | Does not change GL; compliance metadata only. | `ZatcaInvoiceStatus`. | XML/hash/signing are not official production implementation. |
| `ZatcaSubmissionLog` | Submission/onboarding attempt log. | submission type/status, request/response payloads, response/error codes. | Organization, invoice metadata, EGS. | Audit trail only. | `ZatcaSubmissionStatus`. | Payload logging must continue redacting secrets. |
