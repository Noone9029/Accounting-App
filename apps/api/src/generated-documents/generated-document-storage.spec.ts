import { NotFoundException } from "@nestjs/common";
import {
  DatabaseGeneratedDocumentStorageAdapter,
  FakeLocalGeneratedDocumentObjectStorageAdapter,
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
  });
});
