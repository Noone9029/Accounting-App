import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const SUPABASE_POOLER_HOST_SUFFIX = ".pooler.supabase.com";
const SUPABASE_SESSION_POOLER_PORT = "5432";
const SUPABASE_TRANSACTION_POOLER_PORT = "6543";

type PrismaRuntimeEnv = Partial<Pick<NodeJS.ProcessEnv, "DATABASE_URL" | "PRISMA_CONNECTION_LIMIT" | "VERCEL">>;

const shouldUseSupabaseTransactionPooler = (url: URL, env: PrismaRuntimeEnv): boolean =>
  Boolean(env.VERCEL) && url.hostname.endsWith(SUPABASE_POOLER_HOST_SUFFIX) && url.port === SUPABASE_SESSION_POOLER_PORT;

export const databaseUrlForPrismaRuntime = (env: PrismaRuntimeEnv = process.env): string | undefined => {
  const databaseUrl = env.DATABASE_URL;
  const configuredLimit = env.PRISMA_CONNECTION_LIMIT;
  const connectionLimit = configuredLimit ?? (env.VERCEL ? "1" : undefined);
  if (!databaseUrl || !connectionLimit) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    if (shouldUseSupabaseTransactionPooler(url, env)) {
      url.port = SUPABASE_TRANSACTION_POOLER_PORT;
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }
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
    const datasourceUrl = databaseUrlForPrismaRuntime();
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
