import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankingAccountingController } from "./banking-accounting.controller";
import { BankingAccountingService } from "./banking-accounting.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, FiscalPeriodModule],
  controllers: [BankingAccountingController],
  providers: [BankingAccountingService],
  exports: [BankingAccountingService],
})
export class BankingAccountingModule {}
