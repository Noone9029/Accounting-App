import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryClearingReportService } from "./inventory-clearing-report.service";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryAccountingService, InventoryClearingReportService],
  exports: [InventoryService, InventoryAccountingService, InventoryClearingReportService],
})
export class InventoryModule {}
