import { Prisma } from "@prisma/client";

export const ACCOUNTING_CLOSE_REVALIDATION_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 45_000,
} as const;
