import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankAccountReconciliationController } from "./bank-account-reconciliation.controller";
import { BankReconciliationController } from "./bank-reconciliation.controller";
import { BankReconciliationService } from "./bank-reconciliation.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [BankAccountReconciliationController, BankReconciliationController],
  providers: [BankReconciliationService],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
