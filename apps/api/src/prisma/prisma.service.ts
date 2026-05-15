import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const databaseUrlWithConnectionLimit = (): string | undefined => {
  const databaseUrl = process.env.DATABASE_URL;
  const configuredLimit = process.env.PRISMA_CONNECTION_LIMIT;
  const connectionLimit = configuredLimit ?? (process.env.VERCEL ? "1" : undefined);
  if (!databaseUrl || !connectionLimit) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", connectionLimit);
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const datasourceUrl = databaseUrlWithConnectionLimit();
    super({
      ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
      transactionOptions: {
        maxWait: parsePositiveInteger(process.env.PRISMA_TRANSACTION_MAX_WAIT_MS, 10000),
        timeout: parsePositiveInteger(process.env.PRISMA_TRANSACTION_TIMEOUT_MS, 20000),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
