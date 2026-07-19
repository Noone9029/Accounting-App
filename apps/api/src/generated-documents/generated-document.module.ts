import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GeneratedDocumentController } from "./generated-document.controller";
import { GeneratedDocumentService } from "./generated-document.service";
import { DatabaseGeneratedDocumentStorageAdapter, GeneratedDocumentStorageAdapter, GeneratedDocumentStorageAdapterRouter, S3GeneratedDocumentStorageAdapter } from "./generated-document-storage";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [PrismaModule, AuditLogModule, StorageModule],
  controllers: [GeneratedDocumentController],
  providers: [
    GeneratedDocumentService,
    DatabaseGeneratedDocumentStorageAdapter,
    S3GeneratedDocumentStorageAdapter,
    GeneratedDocumentStorageAdapterRouter,
    {
      provide: GeneratedDocumentStorageAdapter,
      useExisting: GeneratedDocumentStorageAdapterRouter,
    },
  ],
  exports: [GeneratedDocumentService],
})
export class GeneratedDocumentModule {}
