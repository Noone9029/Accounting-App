import { StorageConfigurationService } from "./storage-configuration.service";
import { StorageService } from "./storage.service";

describe("StorageService", () => {
  function makeService(env: Record<string, string | undefined> = {}, prismaOverrides: Record<string, unknown> = {}) {
    const config = { get: jest.fn((key: string) => env[key]) };
    const prisma = {
      attachment: {
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 2 }, _sum: { sizeBytes: 1024 } }),
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0),
      },
      generatedDocument: {
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 1 }, _sum: { sizeBytes: 2048 } }),
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
      },
      ...prismaOverrides,
    };
    const storageConfig = new StorageConfigurationService(config as never);
    return { service: new StorageService(prisma as never, storageConfig), prisma, config };
  }

  it("reports database storage as ready by default", () => {
    const { service } = makeService();

    expect(service.readiness()).toMatchObject({
      attachmentStorage: {
        activeProvider: "database",
        ready: true,
        maxSizeMb: 10,
      },
      generatedDocumentStorage: {
        activeProvider: "database",
        ready: true,
      },
      s3Config: {
        endpointConfigured: false,
        accessKeyConfigured: false,
        secretConfigured: false,
      },
    });
  });

  it("reports S3 storage as not ready when required config is missing", () => {
    const { service } = makeService({
      ATTACHMENT_STORAGE_PROVIDER: "s3",
      GENERATED_DOCUMENT_STORAGE_PROVIDER: "s3",
    });

    const readiness = service.readiness();
    expect(readiness.attachmentStorage.ready).toBe(false);
    expect(readiness.generatedDocumentStorage.ready).toBe(false);
    expect(readiness.attachmentStorage.blockingReasons).toContain("S3_BUCKET is not configured.");
    expect(readiness.generatedDocumentStorage.blockingReasons).toContain("Generated document storage S3 writes are not enabled in this groundwork build.");
  });

  it("does not expose secret values in readiness output", () => {
    const { service } = makeService({
      ATTACHMENT_STORAGE_PROVIDER: "s3",
      S3_ACCESS_KEY_ID: "do-not-return",
      S3_SECRET_ACCESS_KEY: "super-secret",
      S3_ENDPOINT: "https://objects.example.test",
      S3_REGION: "us-east-1",
      S3_BUCKET: "ledgerbyte",
    });

    const serialized = JSON.stringify(service.readiness());
    expect(serialized).not.toContain("do-not-return");
    expect(serialized).not.toContain("super-secret");
    expect(service.readiness().s3Config).toMatchObject({
      accessKeyConfigured: true,
      secretConfigured: true,
    });
  });

  it("reports S3 attachment storage as ready when configuration is complete", () => {
    const { service } = makeService({
      ATTACHMENT_STORAGE_PROVIDER: "s3",
      S3_ACCESS_KEY_ID: "do-not-return",
      S3_SECRET_ACCESS_KEY: "super-secret",
      S3_ENDPOINT: "https://objects.example.test",
      S3_REGION: "us-east-1",
      S3_BUCKET: "ledgerbyte",
    });

    const readiness = service.readiness();

    expect(readiness.attachmentStorage).toMatchObject({
      activeProvider: "s3",
      ready: true,
      blockingReasons: [],
    });
    expect(JSON.stringify(readiness)).not.toContain("do-not-return");
    expect(JSON.stringify(readiness)).not.toContain("super-secret");
  });

  it("returns dry-run migration counts for attachments and generated documents", async () => {
    const { service, prisma } = makeService();

    await expect(service.migrationPlan("org-1")).resolves.toMatchObject({
      attachmentCount: 2,
      attachmentTotalBytes: 1024,
      generatedDocumentCount: 1,
      generatedDocumentTotalBytes: 2048,
      databaseStorageCount: 3,
      s3StorageCount: 0,
      migrationRequired: true,
      targetProvider: "database",
      estimatedMigrationRequired: true,
      dryRunOnly: true,
    });
    expect(prisma.attachment.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(prisma.generatedDocument.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
  });
});
