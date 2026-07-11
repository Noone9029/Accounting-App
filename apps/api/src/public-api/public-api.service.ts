import { ConflictException, Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { ForeignExchangeService } from "../foreign-exchange/foreign-exchange.service";
import {
  mapPublicCurrencyList,
  mapPublicFxRate,
  PublicCurrencyListDto,
  PublicFxRateListDto,
  PublicFxRateQueryDto,
} from "./dto/public-fx-read.dto";

export interface PublicApiReadiness {
  version: "v1";
  basePath: "/public-api/v1";
  status: "Disabled" | "Internal Only" | "Ready for Local Proof" | "Needs Production Approval";
  labels: Array<"Disabled" | "Internal Only" | "Ready for Local Proof" | "Needs Production Approval">;
  publicApiEnabled: boolean;
  publicUnauthenticatedAccess: false;
  pagination: {
    standard: "page-pageSize";
    defaultPageSize: 25;
    maxPageSize: 100;
    responseShape: {
      items: "array";
      meta: ["page", "pageSize", "totalItems", "totalPages", "hasNextPage", "hasPreviousPage"];
    };
  };
  idempotency: {
    header: "Idempotency-Key";
    status: "Ready for Local Proof";
    supportedRoutes: ["POST /public-api/v1/idempotency-proof"];
    rawKeysStored: false;
    requestPayloadStored: false;
  };
  rateLimit: {
    enabled: boolean;
    strategy: string;
    status: "Disabled" | "Needs Configuration" | "Ready for Local Proof";
  };
  apiAuth: {
    apiKeys: "Disabled" | "Placeholder Only";
    oauth: "Disabled" | "Placeholder Only";
    productionKeysIssued: false;
    secretsReturned: false;
  };
  docs: {
    route: "/api/docs";
    access: "Non-production default or explicit admin-approved backend opt-in";
  };
  noSecretsReturned: true;
}

export interface IdempotencyProofResponse {
  status: "RECORDED" | "REPLAYED";
  replayed: boolean;
  requestId: string | null;
  result: {
    operation: "PUBLIC_API_V1_IDEMPOTENCY_PROOF";
    persistedBusinessMutation: false;
    safeForLocalProof: true;
  };
}

@Injectable()
export class PublicApiService {
  private readonly proofRoute = "POST /public-api/v1/idempotency-proof";

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly observabilityContext: ObservabilityContextService,
    private readonly foreignExchangeService: ForeignExchangeService,
  ) {}

  async currencies(organizationId: string): Promise<PublicCurrencyListDto> {
    const catalog = await this.foreignExchangeService.currencies(organizationId);
    return mapPublicCurrencyList(catalog);
  }

  async fxRates(organizationId: string, query: PublicFxRateQueryDto): Promise<PublicFxRateListDto> {
    const page = clampInteger(query.page, 1, Number.MAX_SAFE_INTEGER, 1);
    const pageSize = clampInteger(query.pageSize, 1, 100, 25);
    const result = await this.foreignExchangeService.listRates(organizationId, {
      page,
      limit: pageSize,
      transactionCurrency: query.transactionCurrency,
      rateDate: query.rateDate,
    });
    const totalItems = result.pagination.totalItems;
    const totalPages = Math.max(1, Math.ceil(totalItems / result.pagination.limit));

    return {
      items: result.data.map(mapPublicFxRate),
      meta: {
        page: result.pagination.page,
        pageSize: result.pagination.limit,
        totalItems,
        totalPages,
        hasNextPage: result.pagination.page < totalPages,
        hasPreviousPage: result.pagination.page > 1,
      },
    };
  }

  readiness(): PublicApiReadiness {
    const enabled = readBoolean(this.config.get<string>("LEDGERBYTE_PUBLIC_API_ENABLED")) === true;
    const rateLimitEnabled = readBoolean(this.config.get<string>("LEDGERBYTE_PUBLIC_API_RATE_LIMIT_ENABLED")) === true;
    const rateLimitStrategy = clean(this.config.get<string>("LEDGERBYTE_PUBLIC_API_RATE_LIMIT_STRATEGY")) || "DISABLED";
    const apiKeysEnabled = readBoolean(this.config.get<string>("LEDGERBYTE_PUBLIC_API_KEYS_ENABLED")) === true;
    const oauthEnabled = readBoolean(this.config.get<string>("LEDGERBYTE_PUBLIC_API_OAUTH_ENABLED")) === true;

    return {
      version: "v1",
      basePath: "/public-api/v1",
      status: enabled ? (rateLimitEnabled ? "Ready for Local Proof" : "Needs Production Approval") : "Disabled",
      labels: ["Disabled", "Internal Only", "Ready for Local Proof", "Needs Production Approval"],
      publicApiEnabled: enabled,
      publicUnauthenticatedAccess: false,
      pagination: {
        standard: "page-pageSize",
        defaultPageSize: 25,
        maxPageSize: 100,
        responseShape: {
          items: "array",
          meta: ["page", "pageSize", "totalItems", "totalPages", "hasNextPage", "hasPreviousPage"],
        },
      },
      idempotency: {
        header: "Idempotency-Key",
        status: "Ready for Local Proof",
        supportedRoutes: [this.proofRoute],
        rawKeysStored: false,
        requestPayloadStored: false,
      },
      rateLimit: {
        enabled: rateLimitEnabled,
        strategy: rateLimitStrategy,
        status: rateLimitEnabled ? "Ready for Local Proof" : enabled ? "Needs Configuration" : "Disabled",
      },
      apiAuth: {
        apiKeys: apiKeysEnabled ? "Placeholder Only" : "Disabled",
        oauth: oauthEnabled ? "Placeholder Only" : "Disabled",
        productionKeysIssued: false,
        secretsReturned: false,
      },
      docs: {
        route: "/api/docs",
        access: "Non-production default or explicit admin-approved backend opt-in",
      },
      noSecretsReturned: true,
    };
  }

  async idempotencyProof(organizationId: string, idempotencyKey: string | undefined, body: unknown): Promise<IdempotencyProofResponse> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const keyHash = this.hash(`${organizationId}:${this.proofRoute}:${normalizedKey}`);
    const requestHash = this.hash(stableJson(body ?? {}));
    const requestId = this.observabilityContext.getRequestId() ?? null;
    const response: IdempotencyProofResponse = {
      status: "RECORDED",
      replayed: false,
      requestId,
      result: {
        operation: "PUBLIC_API_V1_IDEMPOTENCY_PROOF",
        persistedBusinessMutation: false,
        safeForLocalProof: true,
      },
    };

    const existing = await this.prisma.apiIdempotencyRecord.findUnique({
      where: { organizationId_route_keyHash: { organizationId, route: this.proofRoute, keyHash } },
    });
    if (existing) {
      return this.replayOrReject(existing, requestHash);
    }

    try {
      await this.prisma.apiIdempotencyRecord.create({
        data: {
          organizationId,
          route: this.proofRoute,
          keyHash,
          requestHash,
          responseJson: response as unknown as Prisma.InputJsonValue,
          statusCode: 200,
          requestId,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const concurrent = await this.prisma.apiIdempotencyRecord.findUnique({
          where: { organizationId_route_keyHash: { organizationId, route: this.proofRoute, keyHash } },
        });
        if (concurrent) {
          return this.replayOrReject(concurrent, requestHash);
        }
      }
      throw error;
    }

    return response;
  }

  paginated<T>(items: T[], pageInput?: number, pageSizeInput?: number) {
    const page = clampInteger(pageInput, 1, Number.MAX_SAFE_INTEGER, 1);
    const pageSize = clampInteger(pageSizeInput, 1, 100, 25);
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private replayOrReject(record: { requestHash: string; responseJson: Prisma.JsonValue }, requestHash: string): IdempotencyProofResponse {
    if (record.requestHash !== requestHash) {
      throw new ConflictException("Idempotency-Key was already used for a different request payload.");
    }
    const stored = record.responseJson as unknown as IdempotencyProofResponse;
    return { ...stored, status: "REPLAYED", replayed: true };
  }

  private normalizeIdempotencyKey(value: string | undefined): string {
    const normalized = clean(value);
    if (!normalized) {
      throw new BadRequestException("Idempotency-Key header is required for public API v1 proof mutations.");
    }
    if (normalized.length < 8 || normalized.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(normalized)) {
      throw new BadRequestException("Idempotency-Key must be 8-128 safe characters.");
    }
    return normalized;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function readBoolean(value: string | undefined): boolean | undefined {
  const normalized = clean(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}
