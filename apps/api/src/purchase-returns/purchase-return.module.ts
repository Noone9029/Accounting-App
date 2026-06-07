import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseReturnController } from "./purchase-return.controller";
import { PurchaseReturnService } from "./purchase-return.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [PurchaseReturnController],
  providers: [PurchaseReturnService],
  exports: [PurchaseReturnService],
})
export class PurchaseReturnModule {}
