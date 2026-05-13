import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankAccountController } from "./bank-account.controller";
import { BankAccountService } from "./bank-account.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [BankAccountController],
  providers: [BankAccountService],
  exports: [BankAccountService],
})
export class BankAccountModule {}
