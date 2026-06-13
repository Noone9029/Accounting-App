import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CardSettlementController } from "./card-settlement.controller";
import { CardSettlementService } from "./card-settlement.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [CardSettlementController],
  providers: [CardSettlementService],
  exports: [CardSettlementService],
})
export class CardSettlementModule {}
