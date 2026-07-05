import { Readable } from "node:stream";
import { NotFoundException } from "@nestjs/common";
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

  it("normalizes path traversal markers out of object-key filenames", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({});

    const saved = await storage.save({
      buffer: Buffer.from("hello"),
      filename: "../../tenant-b/secret.pdf",
      contentHash: "hash-1",
      organizationId: "org-1",
      attachmentId: "attachment-1",
      mimeType: "application/pdf",
    });

    expect(saved.storageKey).toBe("org/org-1/attachments/attachment-1/tenant-b-secret.pdf");
    expect(saved.storageKey).not.toContain("..");
    expect(mockSend.mock.calls[0][0].input.Key).toBe("org/org-1/attachments/attachment-1/tenant-b-secret.pdf");
  });

  it("normalizes organization and attachment id object-key segments", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({});

    const saved = await storage.save({
      buffer: Buffer.from("hello"),
      filename: "invoice.pdf",
      contentHash: "hash-1",
      organizationId: "org 1",
      attachmentId: "attachment 1",
      mimeType: "application/pdf",
    });

    expect(saved.storageKey).toBe("org/org-1/attachments/attachment-1/invoice.pdf");
    expect(mockSend.mock.calls[0][0].input.Key).toBe("org/org-1/attachments/attachment-1/invoice.pdf");
  });

  it("blocks S3 reads before network when the stored key belongs to another tenant", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Buffer.from("tenant-b-file") });

    await expect(
      storage.read({
        storageProvider: "S3" as AttachmentStorageProvider,
        storageKey: "org/org-2/attachments/attachment-2/invoice.pdf",
        organizationId: "org-1",
        attachmentId: "attachment-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("blocks S3 reads before network when the stored key belongs to another attachment", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Buffer.from("other-attachment-file") });

    await expect(
      storage.read({
        storageProvider: "S3" as AttachmentStorageProvider,
        storageKey: "org/org-1/attachments/attachment-2/invoice.pdf",
        organizationId: "org-1",
        attachmentId: "attachment-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mockSend).not.toHaveBeenCalled();
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

  it("blocks the generic getObject path for S3-backed attachments without tenant context", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Buffer.from("hello") });

    await expect(storage.getObject({ storageKey: "org/org-1/attachments/attachment-1/invoice.pdf" })).rejects.toThrow(
      "S3 attachment storage requires authorized organization and attachment identifiers before object reads.",
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("supports the generic getObject path for S3-backed attachments with tenant context", async () => {
    const storage = makeStorage(completeEnv);
    mockSend.mockResolvedValueOnce({ Body: Buffer.from("hello") });

    await expect(
      storage.getObject({
        storageKey: "org/org-1/attachments/attachment-1/invoice.pdf",
        organizationId: "org-1",
        attachmentId: "attachment-1",
      }),
    ).resolves.toEqual(Buffer.from("hello"));
  });

  it("fails closed for attachment signed URL requests", async () => {
    const storage = makeStorage(completeEnv);

    await expect(
      storage.getReadUrl({
        storageKey: "org/org-1/attachments/attachment-1/invoice.pdf",
        organizationId: "org-1",
        attachmentId: "attachment-1",
      }),
    ).rejects.toThrow("Attachment signed URLs are disabled and require separate storage proof before use.");
    expect(mockSend).not.toHaveBeenCalled();
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
