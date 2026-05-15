import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { ReportsModule } from "../reports/reports.module";
import { StorageModule } from "../storage/storage.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [InventoryModule, ReportsModule, StorageModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
