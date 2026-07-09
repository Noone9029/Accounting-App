import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MigrationToolkitController } from "./migration-toolkit.controller";
import { MigrationToolkitService } from "./migration-toolkit.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MigrationToolkitController],
  providers: [MigrationToolkitService],
  exports: [MigrationToolkitService],
})
export class MigrationToolkitModule {}
