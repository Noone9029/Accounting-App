import { ConflictException, NotFoundException } from "@nestjs/common";
import {
  createGeneratedDocumentStorageAdapter,
  DatabaseGeneratedDocumentStorageAdapter,
  DisabledGeneratedDocumentObjectStorageAdapter,
  FakeLocalGeneratedDocumentObjectStorageAdapter,
  GeneratedDocumentStorageAdapterRouter,
  S3GeneratedDocumentStorageAdapter,
} from "./generated-document-storage";

describe("generated document storage adapters", () => {
  it("keeps database storage as the default generated-document content adapter", async () => {
    const adapter = new DatabaseGeneratedDocumentStorageAdapter();
    const buffer = Buffer.from("%PDF generated document");

    const saved = await adapter.writeGeneratedDocumentContent({
      organizationId: "org-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer,
    });

    expect(adapter.getStorageBackendName()).toBe("database");
    expect(saved).toMatchObject({
      storageProvider: "database",
      storageKey: null,
      contentBase64: buffer.toString("base64"),
      contentHash: expect.any(String),
      sizeBytes: buffer.byteLength,
    });
    await expect(adapter.readGeneratedDocumentContent(saved)).resolves.toEqual(buffer);
    expect(adapter.verifyGeneratedDocumentContentHash(buffer, saved.contentHash)).toBe(true);
  });

  it("fails closed for database-backed generated-document read URL requests", async () => {
    const adapter = new DatabaseGeneratedDocumentStorageAdapter();

    await expect(
      adapter.getGeneratedDocumentReadUrl({
        organizationId: "org-1",
        generatedDocumentId: "doc-1",
        storageProvider: "database",
        storageKey: null,
        contentBase64: Buffer.from("%PDF generated document").toString("base64"),
        contentHash: "hash",
      }),
    ).rejects.toThrow("Generated-document signed URLs are disabled and require separate storage proof before use.");
  });

  it("fails closed when database-backed content is missing", async () => {
    const adapter = new DatabaseGeneratedDocumentStorageAdapter();

    await expect(
      adapter.readGeneratedDocumentContent({
        storageProvider: "database",
        storageKey: null,
        contentBase64: null,
        contentHash: "",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("derives generated-document-id anchored object keys for local fake tests", () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();

    expect(
      adapter.deriveGeneratedDocumentObjectKey({
        organizationId: "org 1",
        generatedDocumentId: "generated document 1",
        filename: "../../Invoice Copy (proof).pdf",
      }),
    ).toBe("org/org-1/generated-documents/generated-document-1/Invoice-Copy-proof-.pdf");
  });

  it("rejects traversal keys in the local fake object adapter", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();

    await expect(
      adapter.writeGeneratedDocumentContent({
        organizationId: "org-1",
        generatedDocumentId: "../doc-1",
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF generated document"),
      }),
    ).rejects.toThrow("Generated document object keys must not contain traversal segments.");
  });

  it("keeps fake local object adapter content in memory and verifies hashes", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const buffer = Buffer.from("%PDF generated document");

    const saved = await adapter.writeGeneratedDocumentContent({
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer,
    });

    expect(adapter.getStorageBackendName()).toBe("local-test-object");
    expect(saved).toMatchObject({
      storageProvider: "local-test-object",
      storageKey: "org/org-1/generated-documents/doc-1/invoice.pdf",
      contentBase64: null,
      contentHash: expect.any(String),
      sizeBytes: buffer.byteLength,
    });
    await expect(adapter.readGeneratedDocumentContent(saved)).resolves.toEqual(buffer);
    expect(adapter.verifyGeneratedDocumentContentHash(buffer, saved.contentHash)).toBe(true);
    expect("getReadUrl" in adapter).toBe(false);
  });

  it("fails closed for fake local generated-document read URL requests", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const saved = await adapter.writeGeneratedDocumentContent({
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF generated document"),
    });

    await expect(
      adapter.getGeneratedDocumentReadUrl({
        organizationId: "org-1",
        generatedDocumentId: "doc-1",
        ...saved,
      }),
    ).rejects.toThrow("Generated-document signed URLs are disabled and require separate storage proof before use.");
  });

  it("fails safely when fake local object content is missing", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();

    await expect(
      adapter.readGeneratedDocumentContent({
        organizationId: "org-1",
        storageProvider: "local-test-object",
        storageKey: "org/org-1/generated-documents/missing/invoice.pdf",
        contentBase64: null,
        contentHash: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("blocks fake local object reads when the tenant context does not match the stored object", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const saved = await adapter.writeGeneratedDocumentContent({
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF generated document"),
    });

    await expect(
      adapter.readGeneratedDocumentContent({
        organizationId: "org-2",
        ...saved,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("verifies fake local object size and hash metadata before returning content", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const buffer = Buffer.from("%PDF generated document");
    const saved = await adapter.writeGeneratedDocumentContent({
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer,
    });

    await expect(adapter.readGeneratedDocumentContent({ ...saved, sizeBytes: buffer.byteLength + 1 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(adapter.readGeneratedDocumentContent({ ...saved, contentHash: "bad-hash" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("handles duplicate fake local object writes deterministically", async () => {
    const adapter = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const buffer = Buffer.from("%PDF generated document");
    const input = {
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer,
    };

    const first = await adapter.writeGeneratedDocumentContent(input);
    const second = await adapter.writeGeneratedDocumentContent(input);

    expect(second).toEqual(first);
    await expect(
      adapter.writeGeneratedDocumentContent({
        ...input,
        buffer: Buffer.from("%PDF changed document"),
      }),
    ).rejects.toThrow("Fake local generated-document object already exists with different content.");
  });

  it("keeps the generated-document adapter selector database-backed by default", () => {
    const adapter = createGeneratedDocumentStorageAdapter();

    expect(adapter).toBeInstanceOf(DatabaseGeneratedDocumentStorageAdapter);
    expect(adapter.getStorageBackendName()).toBe("database");
  });

  it("selects the disabled object adapter for explicit object-storage modes", async () => {
    const adapter = createGeneratedDocumentStorageAdapter({ mode: "object" });

    expect(adapter).toBeInstanceOf(DisabledGeneratedDocumentObjectStorageAdapter);
    expect(adapter.getStorageBackendName()).toBe("object-storage-unavailable");
    await expect(
      adapter.writeGeneratedDocumentContent({
        organizationId: "org-1",
        generatedDocumentId: "doc-1",
        filename: "invoice.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF generated document"),
      }),
    ).rejects.toThrow("Generated-document object storage is disabled and has no configured runtime adapter.");
    await expect(
      adapter.readGeneratedDocumentContent({
        storageProvider: "object-storage-unavailable",
        storageKey: "org/org-1/generated-documents/doc-1/invoice.pdf",
        contentBase64: null,
        contentHash: "",
      }),
    ).rejects.toThrow("Generated-document object storage is disabled and has no configured runtime adapter.");
    expect("getReadUrl" in adapter).toBe(false);
    await expect(
      adapter.getGeneratedDocumentReadUrl({
        storageProvider: "object-storage-unavailable",
        storageKey: "org/org-1/generated-documents/doc-1/invoice.pdf",
        contentBase64: null,
        contentHash: "",
      }),
    ).rejects.toThrow("Generated-document signed URLs are disabled and require separate storage proof before use.");
  });

  it("does not allow the fake local object adapter unless explicitly marked local-test-only", () => {
    expect(() => createGeneratedDocumentStorageAdapter({ mode: "local-test-object" })).toThrow(
      "Fake generated-document object storage is available only for explicit local tests.",
    );

    const adapter = createGeneratedDocumentStorageAdapter({
      mode: "local-test-object",
      allowLocalTestObjectAdapter: true,
      environment: "test",
    });

    expect(adapter).toBeInstanceOf(FakeLocalGeneratedDocumentObjectStorageAdapter);
    expect(adapter.getStorageBackendName()).toBe("local-test-object");
  });

  it("refuses fake local object adapter selection in production-looking environments", () => {
    expect(() =>
      createGeneratedDocumentStorageAdapter({
        mode: "local-test-object",
        allowLocalTestObjectAdapter: true,
        environment: "production",
      }),
    ).toThrow("Fake generated-document object storage is refused for production-looking environments.");
  });

  it("fails closed for unknown generated-document storage modes", () => {
    expect(() => createGeneratedDocumentStorageAdapter({ mode: "hosted-s3" })).toThrow(
      "Unsupported generated-document storage adapter mode: hosted-s3",
    );
  });

  it("keeps S3 objects immutable while allowing deterministic duplicate writes", async () => {
    const objects = new Map<string, { buffer: Buffer; metadata: Record<string, string> }>();
    const send = jest.fn(async (command: { constructor: { name: string }; input: { Key: string; Body?: Buffer; Metadata?: Record<string, string> } }) => {
      if (command.constructor.name === "HeadObjectCommand") {
        const stored = objects.get(command.input.Key);
        if (!stored) throw { name: "NotFound" };
        return { ContentLength: stored.buffer.byteLength, Metadata: stored.metadata };
      }
      if (command.constructor.name === "PutObjectCommand") {
        objects.set(command.input.Key, { buffer: command.input.Body!, metadata: command.input.Metadata! });
        return {};
      }
      throw new Error(`Unexpected command ${command.constructor.name}`);
    });
    const adapter = s3AdapterWithSend(send);
    const input = {
      organizationId: "org-1",
      generatedDocumentId: "doc-1",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF immutable document"),
    };

    const first = await adapter.writeGeneratedDocumentContent(input);
    const second = await adapter.writeGeneratedDocumentContent(input);

    expect(second).toEqual(first);
    expect(send.mock.calls.filter(([command]) => command.constructor.name === "PutObjectCommand")).toHaveLength(1);
    await expect(adapter.writeGeneratedDocumentContent({ ...input, buffer: Buffer.from("%PDF changed") })).rejects.toBeInstanceOf(ConflictException);
  });

  it("fails closed before S3 access for wrong-tenant object metadata", async () => {
    const send = jest.fn();
    const adapter = s3AdapterWithSend(send);

    await expect(
      adapter.readGeneratedDocumentContent({
        organizationId: "org-2",
        generatedDocumentId: "doc-1",
        storageProvider: "s3",
        storageKey: "org/org-1/generated-documents/doc-1/invoice.pdf",
        contentBase64: null,
        contentHash: "hash",
        sizeBytes: 4,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(send).not.toHaveBeenCalled();
  });

  it("uses the stored provider for reads so database rollback does not strand S3 records", async () => {
    const database = new DatabaseGeneratedDocumentStorageAdapter();
    const s3 = {
      getStorageBackendName: () => "s3",
      writeGeneratedDocumentContent: jest.fn(),
      readGeneratedDocumentContent: jest.fn().mockResolvedValue(Buffer.from("S3 archived bytes")),
      getGeneratedDocumentReadUrl: jest.fn(),
      verifyGeneratedDocumentContentHash: jest.fn(),
      deriveGeneratedDocumentObjectKey: jest.fn(),
    } as unknown as S3GeneratedDocumentStorageAdapter;
    const router = new GeneratedDocumentStorageAdapterRouter(
      { generatedDocumentProvider: "database" } as never,
      database,
      s3,
    );
    const databaseSaved = await database.writeGeneratedDocumentContent({
      organizationId: "org-1",
      generatedDocumentId: "database-doc",
      filename: "database.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("database archived bytes"),
    });

    await expect(router.readGeneratedDocumentContent(databaseSaved)).resolves.toEqual(Buffer.from("database archived bytes"));
    await expect(
      router.readGeneratedDocumentContent({
        organizationId: "org-1",
        generatedDocumentId: "s3-doc",
        storageProvider: "s3",
        storageKey: "org/org-1/generated-documents/s3-doc/s3.pdf",
        contentBase64: null,
        contentHash: "hash",
        sizeBytes: 17,
      }),
    ).resolves.toEqual(Buffer.from("S3 archived bytes"));
    expect(s3.readGeneratedDocumentContent).toHaveBeenCalledTimes(1);
  });
});

function s3AdapterWithSend(send: jest.Mock): S3GeneratedDocumentStorageAdapter {
  const config = {
    s3BlockingReasons: () => [],
    s3Bucket: "synthetic-bucket",
    s3Endpoint: "http://127.0.0.1:9001",
    s3Region: "us-east-1",
    s3ForcePathStyle: true,
    s3AccessKeyId: "synthetic-access-key",
    s3SecretAccessKey: "synthetic-secret-key",
  };
  const adapter = new S3GeneratedDocumentStorageAdapter(config as never);
  (adapter as unknown as { client: { send: jest.Mock } }).client = { send };
  return adapter;
}
