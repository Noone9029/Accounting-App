import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { InventoryModule } from "../inventory/inventory.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseReceiptController } from "./purchase-receipt.controller";
import { PurchaseReceiptService } from "./purchase-receipt.service";
import { PurchaseReceivingStatusController } from "./purchase-receiving-status.controller";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, InventoryModule, FiscalPeriodModule],
  controllers: [PurchaseReceiptController, PurchaseReceivingStatusController],
  providers: [PurchaseReceiptService],
  exports: [PurchaseReceiptService],
})
export class PurchaseReceiptModule {}
