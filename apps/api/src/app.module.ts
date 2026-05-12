import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountingModule } from "./accounting/accounting.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { BranchModule } from "./branches/branch.module";
import { CashExpenseModule } from "./cash-expenses/cash-expense.module";
import { ChartOfAccountsModule } from "./chart-of-accounts/chart-of-accounts.module";
import { ContactModule } from "./contacts/contact.module";
import { CreditNoteModule } from "./credit-notes/credit-note.module";
import { CustomerPaymentModule } from "./customer-payments/customer-payment.module";
import { CustomerRefundModule } from "./customer-refunds/customer-refund.module";
import { GeneratedDocumentModule } from "./generated-documents/generated-document.module";
import { HealthModule } from "./health/health.module";
import { ItemModule } from "./items/item.module";
import { FiscalPeriodModule } from "./fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "./number-sequences/number-sequence.module";
import { OrganizationDocumentSettingsModule } from "./document-settings/organization-document-settings.module";
import { OrganizationModule } from "./organizations/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PurchaseBillModule } from "./purchase-bills/purchase-bill.module";
import { PurchaseDebitNoteModule } from "./purchase-debit-notes/purchase-debit-note.module";
import { ReportsModule } from "./reports/reports.module";
import { RoleModule } from "./roles/role.module";
import { SalesInvoiceModule } from "./sales-invoices/sales-invoice.module";
import { SupplierRefundModule } from "./supplier-refunds/supplier-refund.module";
import { SupplierPaymentModule } from "./supplier-payments/supplier-payment.module";
import { TaxRateModule } from "./tax-rates/tax-rate.module";
import { ZatcaModule } from "./zatca/zatca.module";
import { ZatcaSdkModule } from "./zatca-sdk/zatca-sdk.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    BranchModule,
    CashExpenseModule,
    ContactModule,
    CreditNoteModule,
    CustomerPaymentModule,
    CustomerRefundModule,
    GeneratedDocumentModule,
    FiscalPeriodModule,
    OrganizationDocumentSettingsModule,
    ItemModule,
    SalesInvoiceModule,
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
