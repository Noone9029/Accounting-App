import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountingModule } from "./accounting/accounting.module";
import { AttachmentModule } from "./attachments/attachment.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { BankAccountModule } from "./bank-accounts/bank-account.module";
import { BankDepositModule } from "./bank-deposits/bank-deposit.module";
import { BankReconciliationModule } from "./bank-reconciliations/bank-reconciliation.module";
import { BankRulesModule } from "./bank-rules/bank-rules.module";
import { BankStatementModule } from "./bank-statements/bank-statement.module";
import { BankTransferModule } from "./bank-transfers/bank-transfer.module";
import { CardSettlementModule } from "./card-settlements/card-settlement.module";
import { BranchModule } from "./branches/branch.module";
import { CashExpenseModule } from "./cash-expenses/cash-expense.module";
import { ChartOfAccountsModule } from "./chart-of-accounts/chart-of-accounts.module";
import { CollectionModule } from "./collections/collection.module";
import { ContactModule } from "./contacts/contact.module";
import { CreditNoteModule } from "./credit-notes/credit-note.module";
import { CustomerPaymentModule } from "./customer-payments/customer-payment.module";
import { CustomerRefundModule } from "./customer-refunds/customer-refund.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DeliveryNoteModule } from "./delivery-notes/delivery-note.module";
import { EmailModule } from "./email/email.module";
import { GeneratedDocumentModule } from "./generated-documents/generated-document.module";
import { HealthModule } from "./health/health.module";
import { InventoryAdjustmentModule } from "./inventory-adjustments/inventory-adjustment.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ItemModule } from "./items/item.module";
import { FiscalPeriodModule } from "./fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "./number-sequences/number-sequence.module";
import { OrganizationMemberModule } from "./organization-members/organization-member.module";
import { OrganizationDocumentSettingsModule } from "./document-settings/organization-document-settings.module";
import { OrganizationModule } from "./organizations/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PurchaseBillModule } from "./purchase-bills/purchase-bill.module";
import { PurchaseDebitNoteModule } from "./purchase-debit-notes/purchase-debit-note.module";
import { PurchaseMatchingModule } from "./purchase-matching/purchase-matching.module";
import { PurchaseOrderModule } from "./purchase-orders/purchase-order.module";
import { PurchaseReceiptModule } from "./purchase-receipts/purchase-receipt.module";
import { PurchaseReturnModule } from "./purchase-returns/purchase-return.module";
import { RecurringInvoiceModule } from "./recurring-invoices/recurring-invoice.module";
import { ReportsModule } from "./reports/reports.module";
import { RoleModule } from "./roles/role.module";
import { SalesInvoiceModule } from "./sales-invoices/sales-invoice.module";
import { SalesInventoryReturnModule } from "./sales-inventory-returns/sales-inventory-return.module";
import { SalesQuoteModule } from "./sales-quotes/sales-quote.module";
import { SalesStockIssueModule } from "./sales-stock-issues/sales-stock-issue.module";
import { SearchModule } from "./search/search.module";
import { SupplierRefundModule } from "./supplier-refunds/supplier-refund.module";
import { SupplierPaymentModule } from "./supplier-payments/supplier-payment.module";
import { TaxRateModule } from "./tax-rates/tax-rate.module";
import { StockMovementModule } from "./stock-movements/stock-movement.module";
import { StorageModule } from "./storage/storage.module";
import { SystemModule } from "./system/system.module";
import { WarehouseTransferModule } from "./warehouse-transfers/warehouse-transfer.module";
import { WarehouseModule } from "./warehouses/warehouse.module";
import { ZatcaModule } from "./zatca/zatca.module";
import { ZatcaSdkModule } from "./zatca-sdk/zatca-sdk.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AttachmentModule,
    EmailModule,
    AuthModule,
    BankAccountModule,
    BankDepositModule,
    BankReconciliationModule,
    BankRulesModule,
    BankStatementModule,
    BankTransferModule,
    CardSettlementModule,
    OrganizationModule,
    BranchModule,
    CashExpenseModule,
    CollectionModule,
    ContactModule,
    CreditNoteModule,
    CustomerPaymentModule,
    CustomerRefundModule,
    DashboardModule,
    DeliveryNoteModule,
    GeneratedDocumentModule,
    FiscalPeriodModule,
    OrganizationMemberModule,
    OrganizationDocumentSettingsModule,
    ItemModule,
    WarehouseModule,
    StockMovementModule,
    StorageModule,
    SystemModule,
    InventoryAdjustmentModule,
    WarehouseTransferModule,
    InventoryModule,
    SalesInvoiceModule,
    SalesInventoryReturnModule,
    SalesQuoteModule,
    SearchModule,
    PurchaseOrderModule,
    PurchaseBillModule,
    PurchaseMatchingModule,
    PurchaseReceiptModule,
    PurchaseReturnModule,
    RecurringInvoiceModule,
    PurchaseDebitNoteModule,
    SalesStockIssueModule,
    ReportsModule,
    RoleModule,
    SupplierPaymentModule,
    SupplierRefundModule,
    AccountingModule,
    ChartOfAccountsModule,
    TaxRateModule,
    AuditLogModule,
    NumberSequenceModule,
    HealthModule,
    ZatcaModule,
    ZatcaSdkModule,
  ],
})
export class AppModule {}
