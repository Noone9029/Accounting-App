import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WarehouseTransferController } from "./warehouse-transfer.controller";
import { WarehouseTransferService } from "./warehouse-transfer.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [WarehouseTransferController],
  providers: [WarehouseTransferService],
  exports: [WarehouseTransferService],
})
export class WarehouseTransferModule {}
