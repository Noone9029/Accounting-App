import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecurringTransactionModule } from "../recurring-transactions/recurring-transaction.module";
import { FixedAssetModule } from "../fixed-assets/fixed-asset.module";
import { MigrationToolkitController } from "./migration-toolkit.controller";
import { MigrationToolkitService } from "./migration-toolkit.service";

@Module({
  imports: [PrismaModule, AuditLogModule, RecurringTransactionModule, FixedAssetModule],
  controllers: [MigrationToolkitController],
  providers: [MigrationToolkitService],
  exports: [MigrationToolkitService],
})
export class MigrationToolkitModule {}
