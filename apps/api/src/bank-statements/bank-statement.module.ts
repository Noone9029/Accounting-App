import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankAccountStatementController } from "./bank-account-statement.controller";
import { BankStatementImportController } from "./bank-statement-import.controller";
import { BankStatementService } from "./bank-statement.service";
import { BankStatementTransactionController } from "./bank-statement-transaction.controller";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, NumberSequenceModule],
  controllers: [BankAccountStatementController, BankStatementImportController, BankStatementTransactionController],
  providers: [BankStatementService],
  exports: [BankStatementService],
})
export class BankStatementModule {}
