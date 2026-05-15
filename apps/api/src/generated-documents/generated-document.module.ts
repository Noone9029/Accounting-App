import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GeneratedDocumentController } from "./generated-document.controller";
import { GeneratedDocumentService } from "./generated-document.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [GeneratedDocumentController],
  providers: [GeneratedDocumentService],
  exports: [GeneratedDocumentService],
})
export class GeneratedDocumentModule {}
