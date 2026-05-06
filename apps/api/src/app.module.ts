import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountingModule } from "./accounting/accounting.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { AuthModule } from "./auth/auth.module";
import { BranchModule } from "./branches/branch.module";
import { ChartOfAccountsModule } from "./chart-of-accounts/chart-of-accounts.module";
import { ContactModule } from "./contacts/contact.module";
import { HealthModule } from "./health/health.module";
import { NumberSequenceModule } from "./number-sequences/number-sequence.module";
import { OrganizationModule } from "./organizations/organization.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TaxRateModule } from "./tax-rates/tax-rate.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    BranchModule,
    ContactModule,
    AccountingModule,
    ChartOfAccountsModule,
    TaxRateModule,
    AuditLogModule,
    NumberSequenceModule,
    HealthModule,
  ],
})
export class AppModule {}
