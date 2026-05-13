import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StockMovementController } from "./stock-movement.controller";
import { StockMovementService } from "./stock-movement.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [StockMovementController],
  providers: [StockMovementService],
  exports: [StockMovementService],
})
export class StockMovementModule {}
