import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesStockIssueController } from "./sales-stock-issue.controller";
import { SalesStockIssueService } from "./sales-stock-issue.service";
import { SalesStockIssueStatusController } from "./sales-stock-issue-status.controller";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [SalesStockIssueController, SalesStockIssueStatusController],
  providers: [SalesStockIssueService],
  exports: [SalesStockIssueService],
})
export class SalesStockIssueModule {}
