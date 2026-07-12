import { BadRequestException, ConflictException } from "@nestjs/common";
import { CurrencyRateSource, Prisma } from "@prisma/client";
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

  it("maps the supported currency catalog explicitly and marks the tenant base currency", async () => {
    const { service, foreignExchange } = makeService();
    foreignExchange.currencies.mockResolvedValue({
      baseCurrency: "AED",
      supportedCurrencies: [
        { code: "AED", name: "UAE Dirham" },
        { code: "KWD", name: "Kuwaiti Dinar" },
      ],
      manualRateEntryEnabled: true,
      liveRateProviderEnabled: false,
      providerState: "DISABLED",
    });

    await expect(service.currencies("org-a")).resolves.toEqual({
      baseCurrency: "AED",
      items: [
        { code: "AED", name: "UAE Dirham", decimals: 2, isBaseCurrency: true },
        { code: "KWD", name: "Kuwaiti Dinar", decimals: 3, isBaseCurrency: false },
      ],
      liveRateProviderEnabled: false,
    });
    expect(foreignExchange.currencies).toHaveBeenCalledWith("org-a");
  });

  it("forwards tenant, pagination, and optional filters and maps rates to safe string-only contracts", async () => {
    const { service, foreignExchange } = makeService();
    foreignExchange.listRates.mockResolvedValue({
      data: [
        {
          id: "rate-a",
          organizationId: "org-a",
          transactionCurrency: "USD",
          baseCurrency: "AED",
          rate: new Prisma.Decimal("3.67250000"),
          rateDate: new Date("2026-07-10T00:00:00.000Z"),
          source: CurrencyRateSource.MANUAL,
          sourceReference: "Treasury sheet",
          createdAt: new Date("2026-07-10T08:09:10.000Z"),
          createdByUserId: "user-a",
          requestHash: "forbidden-request-hash",
          idempotencyKey: "forbidden-idempotency-key",
        },
      ],
      pagination: { page: 2, limit: 2, hasMore: false, totalItems: 3 },
    });

    const response = await service.fxRates("org-a", {
      page: 2,
      pageSize: 2,
      transactionCurrency: "USD",
      rateDate: "2026-07-10",
    });

    expect(foreignExchange.listRates).toHaveBeenCalledWith("org-a", {
      page: 2,
      limit: 2,
      transactionCurrency: "USD",
      rateDate: "2026-07-10",
    });
    expect(response).toEqual({
      items: [
        {
          id: "rate-a",
          transactionCurrency: "USD",
          baseCurrency: "AED",
          rate: "3.67250000",
          rateDate: "2026-07-10",
          source: "MANUAL",
          sourceReference: "Treasury sheet",
          capturedAt: "2026-07-10T08:09:10.000Z",
        },
      ],
      meta: {
        page: 2,
        pageSize: 2,
        totalItems: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });
    const serialized = JSON.stringify(response);
    for (const forbidden of ["organizationId", "createdByUserId", "requestHash", "idempotencyKey"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keeps optional filters absent and caps the delegated page size at 100", async () => {
    const { service, foreignExchange } = makeService();
    foreignExchange.listRates.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 100, hasMore: false, totalItems: 0 },
    });

    await expect(service.fxRates("org-b", { pageSize: 500 })).resolves.toMatchObject({
      items: [],
      meta: { page: 1, pageSize: 100, totalItems: 0, totalPages: 1 },
    });
    expect(foreignExchange.listRates).toHaveBeenCalledWith("org-b", {
      page: 1,
      limit: 100,
      transactionCurrency: undefined,
      rateDate: undefined,
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
  const foreignExchange = {
    currencies: jest.fn(),
    listRates: jest.fn(),
  };

  return {
    service: new PublicApiService(prisma as never, config as never, observability as never, foreignExchange as never),
    prisma,
    config,
    observability,
    foreignExchange,
  };
}
