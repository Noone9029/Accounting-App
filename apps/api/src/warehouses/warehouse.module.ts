import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WarehouseController } from "./warehouse.controller";
import { WarehouseService } from "./warehouse.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
})
export class WarehouseModule {}
