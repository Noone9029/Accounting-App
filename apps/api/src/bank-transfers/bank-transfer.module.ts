import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankTransferController } from "./bank-transfer.controller";
import { BankTransferService } from "./bank-transfer.service";

@Module({
  imports: [PrismaModule, AuditLogModule, FiscalPeriodModule, NumberSequenceModule],
  controllers: [BankTransferController],
  providers: [BankTransferService],
  exports: [BankTransferService],
})
export class BankTransferModule {}
