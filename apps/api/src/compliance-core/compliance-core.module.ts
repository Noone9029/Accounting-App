import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ComplianceCoreController } from "./compliance-core.controller";
import { ComplianceCoreService } from "./compliance-core.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ComplianceCoreController],
  providers: [ComplianceCoreService],
  exports: [ComplianceCoreService],
})
export class ComplianceCoreModule {}
