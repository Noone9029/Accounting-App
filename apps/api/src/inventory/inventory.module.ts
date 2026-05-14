import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryAccountingService],
  exports: [InventoryService, InventoryAccountingService],
})
export class InventoryModule {}
