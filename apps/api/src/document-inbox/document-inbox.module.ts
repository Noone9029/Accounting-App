import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentInboxController } from "./document-inbox.controller";
import { DocumentInboxService } from "./document-inbox.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [DocumentInboxController],
  providers: [DocumentInboxService],
  exports: [DocumentInboxService],
})
export class DocumentInboxModule {}
