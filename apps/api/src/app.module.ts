import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountingModule } from "./accounting/accounting.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { BranchModule } from "./branches/branch.module";
import { ChartOfAccountsModule } from "./chart-of-accounts/chart-of-accounts.module";
import { ContactModule } from "./contacts/contact.module";
import { CreditNoteModule } from "./credit-notes/credit-note.module";
import { CustomerPaymentModule } from "./customer-payments/customer-payment.module";
import { GeneratedDocumentModule } from "./generated-documents/generated-document.module";
import { HealthModule } from "./health/health.module";
import { ItemModule } from "./items/item.module";
import { NumberSequenceModule } from "./number-sequences/number-sequence.module";
import { OrganizationDocumentSettingsModule } from "./document-settings/organization-document-settings.module";
import { OrganizationModule } from "./organizations/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SalesInvoiceModule } from "./sales-invoices/sales-invoice.module";
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
    ContactModule,
    CreditNoteModule,
    CustomerPaymentModule,
    GeneratedDocumentModule,
    OrganizationDocumentSettingsModule,
    ItemModule,
    SalesInvoiceModule,
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
