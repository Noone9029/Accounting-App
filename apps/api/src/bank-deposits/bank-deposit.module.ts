import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankDepositController } from "./bank-deposit.controller";
import { BankDepositService } from "./bank-deposit.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [BankDepositController],
  providers: [BankDepositService],
  exports: [BankDepositService],
})
export class BankDepositModule {}
