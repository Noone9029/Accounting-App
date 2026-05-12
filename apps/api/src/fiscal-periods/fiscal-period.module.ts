import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { FiscalPeriodController } from "./fiscal-period.controller";
import { FiscalPeriodGuardService } from "./fiscal-period-guard.service";
import { FiscalPeriodService } from "./fiscal-period.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [FiscalPeriodController],
  providers: [FiscalPeriodService, FiscalPeriodGuardService],
  exports: [FiscalPeriodService, FiscalPeriodGuardService],
})
export class FiscalPeriodModule {}
