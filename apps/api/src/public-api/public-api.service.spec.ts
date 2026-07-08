import { BadRequestException, ConflictException } from "@nestjs/common";
import { PublicApiService } from "./public-api.service";

describe("PublicApiService", () => {
  it("reports conservative public API v1 readiness without enabling unauthenticated access", () => {
    const { service } = makeService({
      LEDGERBYTE_PUBLIC_API_ENABLED: "true",
      LEDGERBYTE_PUBLIC_API_RATE_LIMIT_ENABLED: "true",
      LEDGERBYTE_PUBLIC_API_RATE_LIMIT_STRATEGY: "local-test-window",
      LEDGERBYTE_PUBLIC_API_KEYS_ENABLED: "true",
    });

    expect(service.readiness()).toMatchObject({
      version: "v1",
      basePath: "/public-api/v1",
      status: "Ready for Local Proof",
      publicApiEnabled: true,
      publicUnauthenticatedAccess: false,
      idempotency: {
        header: "Idempotency-Key",
        rawKeysStored: false,
        requestPayloadStored: false,
      },
      rateLimit: {
        enabled: true,
        strategy: "local-test-window",
      },
      apiAuth: {
        apiKeys: "Placeholder Only",
        oauth: "Disabled",
        productionKeysIssued: false,
        secretsReturned: false,
      },
      noSecretsReturned: true,
    });
  });

  it("returns the standard page/pageSize pagination shape", () => {
    const { service } = makeService();

    expect(service.paginated([{ id: 1 }, { id: 2 }, { id: 3 }], 2, 2)).toEqual({
      items: [{ id: 3 }],
      meta: {
        page: 2,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
  });

  it("records idempotency proof with hashed key and safe response only", async () => {
    const { service, prisma } = makeService("req-public-api-1");

    await expect(service.idempotencyProof("org-1", "idem-key-123", { externalReference: "INV-1" })).resolves.toMatchObject({
      status: "RECORDED",
      replayed: false,
      requestId: "req-public-api-1",
      result: {
        persistedBusinessMutation: false,
        safeForLocalProof: true,
      },
    });

    expect(prisma.apiIdempotencyRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          route: "POST /public-api/v1/idempotency-proof",
          requestId: "req-public-api-1",
          statusCode: 200,
        }),
      }),
    );
    const created = prisma.apiIdempotencyRecord.create.mock.calls[0][0].data;
    expect(created.keyHash).toHaveLength(64);
    expect(created.requestHash).toHaveLength(64);
    expect(JSON.stringify(created)).not.toContain("idem-key-123");
    expect(JSON.stringify(created)).not.toContain("INV-1");
  });

  it("replays duplicate idempotency keys for the same payload", async () => {
    const { service, prisma } = makeService();
    await service.idempotencyProof("org-1", "idem-key-123", { value: "same" });
    const created = prisma.apiIdempotencyRecord.create.mock.calls[0][0].data;
    prisma.apiIdempotencyRecord.findUnique.mockResolvedValueOnce({
      requestHash: created.requestHash,
      responseJson: created.responseJson,
    });

    await expect(service.idempotencyProof("org-1", "idem-key-123", { value: "same" })).resolves.toMatchObject({
      status: "REPLAYED",
      replayed: true,
    });
  });

  it("rejects reused idempotency keys for different payloads", async () => {
    const { service, prisma } = makeService();
    await service.idempotencyProof("org-1", "idem-key-123", { value: "first" });
    const created = prisma.apiIdempotencyRecord.create.mock.calls[0][0].data;
    prisma.apiIdempotencyRecord.findUnique.mockResolvedValueOnce({
      requestHash: created.requestHash,
      responseJson: created.responseJson,
    });

    await expect(service.idempotencyProof("org-1", "idem-key-123", { value: "second" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a safe idempotency key", async () => {
    const { service } = makeService();

    await expect(service.idempotencyProof("org-1", "", {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.idempotencyProof("org-1", "short", {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.idempotencyProof("org-1", "unsafe key with spaces", {})).rejects.toBeInstanceOf(BadRequestException);
  });
});

function makeService(requestIdOrEnv: string | Record<string, string | undefined> = "req-public-api-1", env: Record<string, string | undefined> = {}) {
  let requestId = "req-public-api-1";
  if (typeof requestIdOrEnv === "string") {
    requestId = requestIdOrEnv;
  } else {
    env = requestIdOrEnv;
  }
  const prisma = {
    apiIdempotencyRecord: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "record-1" }),
    },
  };
  const config = {
    get: jest.fn((key: string) => env[key]),
  };
  const observability = {
    getRequestId: jest.fn(() => requestId),
  };

  return {
    service: new PublicApiService(prisma as never, config as never, observability as never),
    prisma,
    config,
    observability,
  };
}
