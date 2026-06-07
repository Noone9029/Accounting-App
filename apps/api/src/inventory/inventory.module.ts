import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryClearingReportService } from "./inventory-clearing-report.service";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryFifoPreviewController } from "./inventory-fifo-preview.controller";
import { InventoryFifoPreviewService } from "./inventory-fifo-preview.service";
import { InventoryLandedCostPreviewController } from "./inventory-landed-cost-preview.controller";
import { InventoryLandedCostPreviewService } from "./inventory-landed-cost-preview.service";
import { InventoryTraceabilityController } from "./inventory-traceability.controller";
import { InventoryTraceabilityService } from "./inventory-traceability.service";
import { InventoryValuationVariancePreviewController } from "./inventory-valuation-variance-preview.controller";
import { InventoryValuationVariancePreviewService } from "./inventory-valuation-variance-preview.service";
import { InventoryVarianceProposalController } from "./inventory-variance-proposal.controller";
import { InventoryVarianceProposalService } from "./inventory-variance-proposal.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, FiscalPeriodModule],
  controllers: [
    InventoryController,
    InventoryFifoPreviewController,
    InventoryLandedCostPreviewController,
    InventoryTraceabilityController,
    InventoryValuationVariancePreviewController,
    InventoryVarianceProposalController,
  ],
  providers: [
    InventoryService,
    InventoryAccountingService,
    InventoryClearingReportService,
    InventoryFifoPreviewService,
    InventoryLandedCostPreviewService,
    InventoryTraceabilityService,
    InventoryValuationVariancePreviewService,
    InventoryVarianceProposalService,
  ],
  exports: [
    InventoryService,
    InventoryAccountingService,
    InventoryClearingReportService,
    InventoryFifoPreviewService,
    InventoryLandedCostPreviewService,
    InventoryTraceabilityService,
    InventoryValuationVariancePreviewService,
    InventoryVarianceProposalService,
  ],
})
export class InventoryModule {}
