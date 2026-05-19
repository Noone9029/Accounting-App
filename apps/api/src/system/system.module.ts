import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BackupReadinessService } from "./backup-readiness.service";
import { SystemController } from "./system.controller";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [SystemController],
  providers: [BackupReadinessService],
})
export class SystemModule {}
