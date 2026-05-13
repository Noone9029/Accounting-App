import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountingModule } from "./accounting/accounting.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { BankAccountModule } from "./bank-accounts/bank-account.module";
import { BankReconciliationModule } from "./bank-reconciliations/bank-reconciliation.module";
import { BankStatementModule } from "./bank-statements/bank-statement.module";
import { BankTransferModule } from "./bank-transfers/bank-transfer.module";
import { BranchModule } from "./branches/branch.module";
import { CashExpenseModule } from "./cash-expenses/cash-expense.module";
import { ChartOfAccountsModule } from "./chart-of-accounts/chart-of-accounts.module";
import { ContactModule } from "./contacts/contact.module";
import { CreditNoteModule } from "./credit-notes/credit-note.module";
import { CustomerPaymentModule } from "./customer-payments/customer-payment.module";
import { CustomerRefundModule } from "./customer-refunds/customer-refund.module";
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
import { PurchaseOrderModule } from "./purchase-orders/purchase-order.module";
import { ReportsModule } from "./reports/reports.module";
import { RoleModule } from "./roles/role.module";
import { SalesInvoiceModule } from "./sales-invoices/sales-invoice.module";
import { SupplierRefundModule } from "./supplier-refunds/supplier-refund.module";
import { SupplierPaymentModule } from "./supplier-payments/supplier-payment.module";
import { TaxRateModule } from "./tax-rates/tax-rate.module";
import { StockMovementModule } from "./stock-movements/stock-movement.module";
import { WarehouseTransferModule } from "./warehouse-transfers/warehouse-transfer.module";
import { WarehouseModule } from "./warehouses/warehouse.module";
import { ZatcaModule } from "./zatca/zatca.module";
import { ZatcaSdkModule } from "./zatca-sdk/zatca-sdk.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BankAccountModule,
    BankReconciliationModule,
    BankStatementModule,
    BankTransferModule,
    OrganizationModule,
    BranchModule,
    CashExpenseModule,
    ContactModule,
    CreditNoteModule,
    CustomerPaymentModule,
    CustomerRefundModule,
    GeneratedDocumentModule,
    FiscalPeriodModule,
    OrganizationMemberModule,
    OrganizationDocumentSettingsModule,
    ItemModule,
    WarehouseModule,
    StockMovementModule,
    InventoryAdjustmentModule,
    WarehouseTransferModule,
    InventoryModule,
    SalesInvoiceModule,
    PurchaseOrderModule,
    PurchaseBillModule,
    PurchaseDebitNoteModule,
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
