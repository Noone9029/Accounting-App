import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AttachmentController } from "./attachment.controller";
import { AttachmentService } from "./attachment.service";
import { AttachmentStorageService, DatabaseAttachmentStorageService } from "./attachment-storage.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [AttachmentController],
  providers: [
    AttachmentService,
    {
      provide: AttachmentStorageService,
      useClass: DatabaseAttachmentStorageService,
    },
  ],
  exports: [AttachmentService, AttachmentStorageService],
})
export class AttachmentModule {}
