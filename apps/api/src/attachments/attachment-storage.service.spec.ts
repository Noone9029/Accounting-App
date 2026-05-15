import { Readable } from "node:stream";
import { AttachmentStorageProvider } from "@prisma/client";
import { StorageConfigurationService } from "../storage/storage-configuration.service";
import { DatabaseAttachmentStorageService, S3AttachmentStorageService } from "./attachment-storage.service";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ command: "PutObjectCommand", input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ command: "GetObjectCommand", input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ command: "DeleteObjectCommand", input })),
}));

describe("S3AttachmentStorageService", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  function makeStorage(env: Record<string, string | undefined> = {}) {
    const config = {
      get: jest.fn((key: string) => env[key]),
    };
    return new S3AttachmentStorageService(new StorageConfigurationService(config as never));
  }

  const completeEnv = {
    S3_ENDPOINT: "https://objects.example.test",
    S3_REGION: "us-east-1",
    S3_BUCKET: "ledgerbyte-test",
    S3_ACCESS_KEY_ID: "access-key",
    S3_SECRET_ACCESS_KEY: "secret-key",
    S3_FORCE_PATH_STYLE: "true",
  };

  it("reports ready when S3 configuration is complete without exposing secrets", () => {
    const storage = makeStorage(completeEnv);

    const readiness = storage.readiness();

    expect(readiness).toMatchObject({
      provider: "s3",
      ready: true,
      blockingReasons: [],
    });
    expect(JSON.stringify(readiness)).not.toContain("access-key");
    expect(JSON.stringify(readiness)).not.toContain("secret-key");
  });

  it("uploads content to an organization-scoped S3 key without storing base64", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({});

    const saved = await storage.save({
      buffer: Buffer.from("hello"),
      filename: "Invoice Copy.pdf",
      contentHash: "hash-1",
      organizationId: "org-1",
      attachmentId: "attachment-1",
      mimeType: "application/pdf",
    });

    expect(saved).toEqual({
      storageProvider: "S3",
      storageKey: "org/org-1/attachments/attachment-1/Invoice-Copy.pdf",
      contentBase64: null,
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "PutObjectCommand",
        input: expect.objectContaining({
          Bucket: "ledgerbyte-test",
          Key: "org/org-1/attachments/attachment-1/Invoice-Copy.pdf",
          Body: Buffer.from("hello"),
          ContentType: "application/pdf",
          Metadata: expect.objectContaining({
            contentHash: "hash-1",
            organizationId: "org-1",
            attachmentId: "attachment-1",
          }),
        }),
      }),
    );
  });

  it("downloads content from S3 storage", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Readable.from([Buffer.from("hello")]) });

    await expect(
      storage.read({
        storageProvider: "S3" as AttachmentStorageProvider,
        storageKey: "org/org-1/attachments/attachment-1/invoice.pdf",
      }),
    ).resolves.toEqual(Buffer.from("hello"));

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "GetObjectCommand",
        input: {
          Bucket: "ledgerbyte-test",
          Key: "org/org-1/attachments/attachment-1/invoice.pdf",
        },
      }),
    );
  });

  it("supports the generic getObject path for S3-backed attachments", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Buffer.from("hello") });

    await expect(storage.getObject({ storageKey: "org/org-1/attachments/attachment-1/invoice.pdf" })).resolves.toEqual(Buffer.from("hello"));
  });

  it("supports the generic saveObject path with S3 attachment identifiers", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({});

    await expect(
      storage.saveObject({
        buffer: Buffer.from("hello"),
        filename: "invoice.pdf",
        contentType: "application/pdf",
        contentHash: "hash-1",
        organizationId: "org-1",
        attachmentId: "attachment-1",
      }),
    ).resolves.toMatchObject({
      provider: "s3",
      storageKey: "org/org-1/attachments/attachment-1/invoice.pdf",
      contentBase64: null,
    });
  });
});

describe("DatabaseAttachmentStorageService", () => {
  it("supports the generic getObject path for database-backed attachments", async () => {
    const storage = new DatabaseAttachmentStorageService();

    await expect(storage.getObject({ contentBase64: Buffer.from("hello").toString("base64") })).resolves.toEqual(Buffer.from("hello"));
  });
});
