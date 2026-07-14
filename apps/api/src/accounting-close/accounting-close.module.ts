import { Module } from "@nestjs/common";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecurringTransactionModule } from "../recurring-transactions/recurring-transaction.module";
import { ReportsModule } from "../reports/reports.module";
import { AccountingCloseController } from "./accounting-close.controller";
import { AccountingCloseService } from "./accounting-close.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, RecurringTransactionModule, ReportsModule],
  controllers: [AccountingCloseController],
  providers: [AccountingCloseService],
  exports: [AccountingCloseService],
})
export class AccountingCloseModule {}
