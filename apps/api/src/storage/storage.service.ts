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
    const warnings = new Set<string>();
    if (attachmentProvider === "database" || generatedDocumentProvider === "database") {
      warnings.add("Database storage is acceptable for local/dev but not production-scale.");
    }
    if (attachmentProvider === "s3" && this.storageConfig.s3BlockingReasons().length > 0) {
      warnings.add("S3 attachment storage is selected but required configuration is incomplete.");
    }
    if (generatedDocumentProvider === "s3") {
      warnings.add("Generated document S3 storage is not implemented yet; generated documents remain database-backed.");
    }
    return {
      attachmentStorage: {
        ...this.providerReadiness("Attachment storage", attachmentProvider),
        maxSizeMb: this.storageConfig.attachmentMaxSizeMb,
      },
      generatedDocumentStorage: this.providerReadiness("Generated document storage", generatedDocumentProvider),
      s3Config: this.storageConfig.s3Status,
      warnings: Array.from(warnings),
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
    const attachmentS3Count = await this.prisma.attachment.count({
      where: { organizationId, storageProvider: { in: [AttachmentStorageProvider.S3, AttachmentStorageProvider.S3_PLACEHOLDER] } },
    });
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
      migrationRequired: databaseStorageCount > 0,
      targetProvider: this.storageConfig.attachmentProvider,
      estimatedMigrationRequired: databaseStorageCount > 0,
      dryRunOnly: true,
      notes: [
        "This endpoint only counts database and object-storage records.",
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

    const blockingReasons = this.storageConfig.s3BlockingReasons();
    const isGeneratedDocumentStorage = label.toLowerCase().startsWith("generated document");
    const activeBlockingReasons = isGeneratedDocumentStorage
      ? [...blockingReasons, `${label} S3 writes are not enabled in this groundwork build.`]
      : blockingReasons;

    return {
      activeProvider: provider,
      ready: activeBlockingReasons.length === 0,
      blockingReasons: activeBlockingReasons,
      warnings: isGeneratedDocumentStorage
        ? ["S3-compatible generated document storage is planned but generated documents remain database-backed in this phase."]
        : ["S3-compatible attachment storage is configured. Migration remains dry-run only; database attachments are not moved automatically."],
    };
  }
}
