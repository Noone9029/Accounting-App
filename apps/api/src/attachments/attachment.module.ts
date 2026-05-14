import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageConfigurationService } from "../storage/storage-configuration.service";
import { StorageModule } from "../storage/storage.module";
import { AttachmentController } from "./attachment.controller";
import { AttachmentService } from "./attachment.service";
import { AttachmentStorageService, DatabaseAttachmentStorageService, S3AttachmentStorageService } from "./attachment-storage.service";

@Module({
  imports: [PrismaModule, AuditLogModule, StorageModule],
  controllers: [AttachmentController],
  providers: [
    AttachmentService,
    DatabaseAttachmentStorageService,
    S3AttachmentStorageService,
    {
      provide: AttachmentStorageService,
      useFactory: (
        storageConfig: StorageConfigurationService,
        databaseStorage: DatabaseAttachmentStorageService,
        s3Storage: S3AttachmentStorageService,
      ) => (storageConfig.attachmentProvider === "s3" ? s3Storage : databaseStorage),
      inject: [StorageConfigurationService, DatabaseAttachmentStorageService, S3AttachmentStorageService],
    },
  ],
  exports: [AttachmentService, AttachmentStorageService],
})
export class AttachmentModule {}
