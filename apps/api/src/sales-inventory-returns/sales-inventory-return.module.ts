import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesInventoryReturnController } from "./sales-inventory-return.controller";
import { SalesInventoryReturnService } from "./sales-inventory-return.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [SalesInventoryReturnController],
  providers: [SalesInventoryReturnService],
  exports: [SalesInventoryReturnService],
})
export class SalesInventoryReturnModule {}
