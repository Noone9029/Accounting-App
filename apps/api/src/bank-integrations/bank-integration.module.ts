import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BankIntegrationController } from "./bank-integration.controller";
import { BankIntegrationService } from "./bank-integration.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [BankIntegrationController],
  providers: [BankIntegrationService],
  exports: [BankIntegrationService],
})
export class BankIntegrationModule {}
