import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseMatchingController } from "./purchase-matching.controller";
import { PurchaseMatchingService } from "./purchase-matching.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PurchaseMatchingController],
  providers: [PurchaseMatchingService],
  exports: [PurchaseMatchingService],
})
export class PurchaseMatchingModule {}
