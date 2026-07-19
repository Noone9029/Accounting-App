import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetBucketAclCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DatabaseGeneratedDocumentStorageAdapter,
  S3GeneratedDocumentStorageAdapter,
  type StoredGeneratedDocumentContent,
} from "../src/generated-documents/generated-document-storage";

const endpoint = requiredEnvironment("LOCAL_S3_PROOF_ENDPOINT");
const accessKeyId = requiredEnvironment("LOCAL_S3_PROOF_ACCESS_KEY_ID");
const secretAccessKey = requiredEnvironment("LOCAL_S3_PROOF_SECRET_ACCESS_KEY");
const bucket = `ledgerbyte-arc04-${randomUUID().replace(/-/g, "").slice(0, 20)}`;

if (process.env.LOCAL_S3_PROOF !== "1") {
  throw new Error("Refusing local object-storage proof without LOCAL_S3_PROOF=1.");
}
if (!isLoopbackEndpoint(endpoint)) {
  throw new Error("Refusing object-storage proof unless LOCAL_S3_PROOF_ENDPOINT is a loopback URL.");
}

const client = new S3Client({
  endpoint,
  region: "us-east-1",
  forcePathStyle: true,
  maxAttempts: 3,
  credentials: { accessKeyId, secretAccessKey },
});
const s3Adapter = new S3GeneratedDocumentStorageAdapter({
  s3BlockingReasons: () => [],
  s3Bucket: bucket,
  s3Endpoint: endpoint,
  s3Region: "us-east-1",
  s3ForcePathStyle: true,
  s3AccessKeyId: accessKeyId,
  s3SecretAccessKey: secretAccessKey,
} as never);
const databaseAdapter = new DatabaseGeneratedDocumentStorageAdapter();

async function main(): Promise<void> {
  let createdBucket = false;
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    createdBucket = true;
    await assertPrivateBucket();

    const buffer = Buffer.from("%PDF-1.7\nSynthetic ARC04 generated document\n%%EOF\n");
    const input = {
      organizationId: "arc04-synthetic-org",
      generatedDocumentId: "arc04-synthetic-document",
      filename: "synthetic-statement.pdf",
      mimeType: "application/pdf",
      buffer,
    };

    const databaseSaved = await databaseAdapter.writeGeneratedDocumentContent(input);
    const objectSaved = await s3Adapter.writeGeneratedDocumentContent(input);
    const persistedMetadata: StoredGeneratedDocumentContent = {
      organizationId: input.organizationId,
      generatedDocumentId: input.generatedDocumentId,
      ...objectSaved,
    };

    assert(databaseSaved.storageProvider === "database" && databaseSaved.contentBase64, "Database remains a usable default provider.");
    assert(objectSaved.storageProvider === "s3" && !objectSaved.contentBase64 && objectSaved.storageKey, "S3 metadata is explicit and excludes inline content.");
    assert(
      databaseSaved.contentHash === objectSaved.contentHash && databaseSaved.sizeBytes === objectSaved.sizeBytes,
      "Database-to-S3 rehearsal reconciliation hash or size mismatch.",
    );
    assert((await databaseAdapter.readGeneratedDocumentContent(databaseSaved)).equals(buffer), "Database rollback read failed.");
    assert((await s3Adapter.readGeneratedDocumentContent(persistedMetadata)).equals(buffer), "S3 read-back did not match uploaded bytes.");

    const head = await s3Adapter.headGeneratedDocumentContent(objectSaved.storageKey!);
    assert(head.sizeBytes === objectSaved.sizeBytes && head.contentHash === objectSaved.contentHash, "S3 object metadata does not match persisted metadata.");

    const duplicate = await s3Adapter.writeGeneratedDocumentContent(input);
    assert(JSON.stringify(duplicate) === JSON.stringify(objectSaved), "Identical duplicate S3 write was not deterministic.");
    await expectFailure(
      () => s3Adapter.writeGeneratedDocumentContent({ ...input, buffer: Buffer.from("%PDF conflicting bytes") }),
      ConflictException,
      "conflicting duplicate write",
    );
    await expectFailure(
      () => s3Adapter.readGeneratedDocumentContent({ ...persistedMetadata, organizationId: "wrong-tenant" }),
      NotFoundException,
      "wrong-tenant read",
    );
    await expectFailure(
      () =>
        s3Adapter.readGeneratedDocumentContent({
          ...persistedMetadata,
          generatedDocumentId: "missing-document",
          storageKey: s3Adapter.deriveGeneratedDocumentObjectKey({
            organizationId: input.organizationId,
            generatedDocumentId: "missing-document",
            filename: input.filename,
          }),
        }),
      NotFoundException,
      "missing-object read",
    );

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectSaved.storageKey,
        Body: Buffer.from("%PDF corrupted bytes"),
        ContentType: input.mimeType,
        Metadata: {
          contenthash: objectSaved.contentHash,
          organizationid: input.organizationId,
          generateddocumentid: input.generatedDocumentId,
        },
      }),
    );
    await expectFailure(() => s3Adapter.readGeneratedDocumentContent(persistedMetadata), NotFoundException, "corrupt-object read");
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectSaved.storageKey,
        Body: buffer,
        ContentType: input.mimeType,
        Metadata: {
          contenthash: objectSaved.contentHash,
          organizationid: input.organizationId,
          generateddocumentid: input.generatedDocumentId,
        },
      }),
    );
    await expectFailure(() => s3Adapter.getGeneratedDocumentReadUrl(persistedMetadata), Error, "signed URL request");

    await s3Adapter.deleteGeneratedDocumentContent(persistedMetadata);
    const remaining = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    assert((remaining.Contents?.length ?? 0) === 0, "Local proof cleanup left object(s) in the bucket.");

    await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    createdBucket = false;
    process.stdout.write("LOCAL_GENERATED_DOCUMENT_S3_PROOF_PASSED\n");
  } finally {
    if (createdBucket) {
      await removeProofObjects();
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    }
  }
}

async function assertPrivateBucket(): Promise<void> {
  const acl = await client.send(new GetBucketAclCommand({ Bucket: bucket }));
  const publiclyReadable = acl.Grants?.some((grant) => {
    const uri = grant.Grantee?.URI ?? "";
    return uri.includes("AllUsers") || uri.includes("AuthenticatedUsers");
  });
  assert(!publiclyReadable, "Local proof bucket unexpectedly grants public access.");
}

async function removeProofObjects(): Promise<void> {
  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
  for (const object of listed.Contents ?? []) {
    if (object.Key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
    }
  }
}

async function expectFailure(action: () => Promise<unknown>, expected: typeof Error, label: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof expected) return;
    throw new Error(`${label} failed with an unexpected error class.`);
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isLoopbackEndpoint(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

void main().catch(() => {
  process.stderr.write("LOCAL_GENERATED_DOCUMENT_S3_PROOF_FAILED\n");
  process.exitCode = 1;
});
