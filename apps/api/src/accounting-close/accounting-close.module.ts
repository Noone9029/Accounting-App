import { Module } from "@nestjs/common";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecurringTransactionModule } from "../recurring-transactions/recurring-transaction.module";
import { AccountingCloseController } from "./accounting-close.controller";
import { AccountingCloseService } from "./accounting-close.service";

@Module({
  imports: [PrismaModule, FiscalPeriodModule, RecurringTransactionModule],
  controllers: [AccountingCloseController],
  providers: [AccountingCloseService],
  exports: [AccountingCloseService],
})
export class AccountingCloseModule {}
