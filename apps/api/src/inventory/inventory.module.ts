import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryClearingReportService } from "./inventory-clearing-report.service";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryVarianceProposalController } from "./inventory-variance-proposal.controller";
import { InventoryVarianceProposalService } from "./inventory-variance-proposal.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, FiscalPeriodModule],
  controllers: [InventoryController, InventoryVarianceProposalController],
  providers: [InventoryService, InventoryAccountingService, InventoryClearingReportService, InventoryVarianceProposalService],
  exports: [InventoryService, InventoryAccountingService, InventoryClearingReportService, InventoryVarianceProposalService],
})
export class InventoryModule {}
