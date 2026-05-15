import { Injectable } from "@nestjs/common";
import { AttachmentStorageProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageConfigurationService } from "./storage-configuration.service";
import type { ObjectStorageProviderName } from "./storage-provider";

interface StorageReadinessSection {
  activeProvider: ObjectStorageProviderName;
  ready: boolean;
  blockingReasons: string[];
  warnings: string[];
}

@Injectable()
export class StorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageConfig: StorageConfigurationService,
  ) {}

  readiness() {
    const attachmentProvider = this.storageConfig.attachmentProvider;
    const generatedDocumentProvider = this.storageConfig.generatedDocumentProvider;
    return {
      attachmentStorage: {
        ...this.providerReadiness("Attachment storage", attachmentProvider),
        maxSizeMb: this.storageConfig.attachmentMaxSizeMb,
      },
      generatedDocumentStorage: this.providerReadiness("Generated document storage", generatedDocumentProvider),
      s3Config: this.storageConfig.s3Status,
      warnings: ["Database storage is acceptable for local/dev but not production-scale."],
    };
  }

  async migrationPlan(organizationId: string) {
    const attachmentTotals = await this.prisma.attachment.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });
    const generatedDocumentTotals = await this.prisma.generatedDocument.aggregate({
      where: { organizationId },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });
    const attachmentDatabaseCount = await this.prisma.attachment.count({ where: { organizationId, storageProvider: AttachmentStorageProvider.DATABASE } });
    const attachmentS3Count = await this.prisma.attachment.count({ where: { organizationId, storageProvider: AttachmentStorageProvider.S3_PLACEHOLDER } });
    const generatedDocumentDatabaseCount = await this.prisma.generatedDocument.count({ where: { organizationId, storageProvider: "database" } });
    const generatedDocumentS3Count = await this.prisma.generatedDocument.count({ where: { organizationId, storageProvider: "s3" } });

    const databaseStorageCount = attachmentDatabaseCount + generatedDocumentDatabaseCount;
    const s3StorageCount = attachmentS3Count + generatedDocumentS3Count;
    return {
      attachmentCount: attachmentTotals._count._all,
      attachmentTotalBytes: attachmentTotals._sum.sizeBytes ?? 0,
      generatedDocumentCount: generatedDocumentTotals._count._all,
      generatedDocumentTotalBytes: generatedDocumentTotals._sum.sizeBytes ?? 0,
      databaseStorageCount,
      s3StorageCount,
      estimatedMigrationRequired: databaseStorageCount > 0,
      dryRunOnly: true,
      notes: [
        "This endpoint only counts database and placeholder object-storage records.",
        "No objects are copied, deleted, or rewritten by this dry-run plan.",
        "Generated documents and user-uploaded attachments remain separate storage domains.",
      ],
    };
  }

  private providerReadiness(label: string, provider: ObjectStorageProviderName): StorageReadinessSection {
    if (provider === "database") {
      return {
        activeProvider: provider,
        ready: true,
        blockingReasons: [],
        warnings: [`${label} is using database/base64 storage. This is acceptable for local/dev but not production-scale.`],
      };
    }

    return {
      activeProvider: provider,
      ready: false,
      blockingReasons: [
        ...this.storageConfig.s3BlockingReasons(),
        `${label} S3 writes are not enabled in this groundwork build.`,
      ],
      warnings: ["S3-compatible storage is planned but no external upload or migration executor is active yet."],
    };
  }
}
