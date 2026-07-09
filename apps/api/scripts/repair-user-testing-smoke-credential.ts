import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

export const EXPECTED_PROJECT_REF = "xynelbjqcmbgtscfmmzv";
export const REPAIR_APPROVAL_PHRASE = "I_APPROVE_USER_TESTING_SMOKE_PASSWORD_RESET";
const PASSWORD_HASH_ROUNDS = 12;
const SESSION_REVOCATION_REASON = "user-testing-smoke-credential-reset";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

type EnvSource = Record<string, string | undefined>;

export interface RepairConfig {
  directUrl: string;
  email: string;
  password: string;
  organizationId: string;
}

export interface RepairTransaction {
  findUsersByEmail(email: string): Promise<Array<{ id: string }>>;
  findExpectedMembership(userId: string, organizationId: string): Promise<{ status: string } | null>;
  updatePasswordHash(userId: string, email: string, passwordHash: string): Promise<number>;
  revokeActiveSessions(userId: string, revokedAt: Date): Promise<number>;
}

export interface RepairDatabase {
  transaction<T>(operation: (transaction: RepairTransaction) => Promise<T>): Promise<T>;
  disconnect(): Promise<void>;
}

export interface RepairResult {
  userExistsExactlyOnce: true;
  expectedOrganizationMembershipExists: true;
  passwordResetSucceeded: true;
  sessionsRevoked: number;
  target: "hosted-user-testing";
}

interface RepairDependencies {
  hashPassword?: (password: string, rounds: number) => Promise<string>;
  now?: () => Date;
}

export function resolveRepairConfig(env: EnvSource): RepairConfig {
  const directUrl = required(env, "LEDGERBYTE_USER_TESTING_DIRECT_URL", false);
  const email = required(env, "LEDGERBYTE_SMOKE_EMAIL", true).toLowerCase();
  const password = required(env, "LEDGERBYTE_SMOKE_PASSWORD", false);
  const organizationId = required(env, "LEDGERBYTE_SMOKE_ORGANIZATION_ID", true);
  const approval = required(env, "LEDGERBYTE_SMOKE_REPAIR_APPROVAL", true);

  if (approval !== REPAIR_APPROVAL_PHRASE) {
    throw new Error("LEDGERBYTE_SMOKE_REPAIR_APPROVAL does not match the required approval phrase.");
  }

  let parsed: URL;
  try {
    parsed = new URL(directUrl);
  } catch {
    throw new Error("LEDGERBYTE_USER_TESTING_DIRECT_URL must be a valid PostgreSQL URL for the approved user-testing project.");
  }

  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    throw new Error("LEDGERBYTE_USER_TESTING_DIRECT_URL must use the PostgreSQL protocol.");
  }
  if (!directUrl.includes(EXPECTED_PROJECT_REF)) {
    throw new Error(`LEDGERBYTE_USER_TESTING_DIRECT_URL must target approved project ${EXPECTED_PROJECT_REF}.`);
  }
  if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("LEDGERBYTE_USER_TESTING_DIRECT_URL must target hosted user-testing, not a local database.");
  }
  const hostname = parsed.hostname.toLowerCase();
  const directHost = hostname === `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const sessionPoolerHost = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(hostname) && parsed.username === `postgres.${EXPECTED_PROJECT_REF}`;
  if (!directHost && !sessionPoolerHost) {
    throw new Error("LEDGERBYTE_USER_TESTING_DIRECT_URL must target an approved Supabase host.");
  }

  return { directUrl, email, password, organizationId };
}

export async function repairExistingSmokeCredential(
  config: RepairConfig,
  database: RepairDatabase,
  dependencies: RepairDependencies = {},
): Promise<RepairResult> {
  const hashPassword = dependencies.hashPassword ?? bcrypt.hash;
  const now = dependencies.now ?? (() => new Date());

  return database.transaction(async (transaction) => {
    const users = await transaction.findUsersByEmail(config.email);
    if (users.length !== 1) {
      throw new Error("Repair requires exactly one existing smoke user. No user was created or changed.");
    }

    const user = users[0]!;
    const membership = await transaction.findExpectedMembership(user.id, config.organizationId);
    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("Repair requires an active membership in the expected user-testing organization. No data was changed.");
    }

    const passwordHash = await hashPassword(config.password, PASSWORD_HASH_ROUNDS);
    const updatedUsers = await transaction.updatePasswordHash(user.id, config.email, passwordHash);
    if (updatedUsers !== 1) {
      throw new Error("Password update did not affect exactly one user. The transaction was rolled back.");
    }

    const revokedAt = now();
    const sessionsRevoked = await transaction.revokeActiveSessions(user.id, revokedAt);

    return {
      userExistsExactlyOnce: true,
      expectedOrganizationMembershipExists: true,
      passwordResetSucceeded: true,
      sessionsRevoked,
      target: "hosted-user-testing",
    };
  });
}

export function createPrismaRepairDatabase(directUrl: string): RepairDatabase {
  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

  return {
    transaction: (operation) =>
      prisma.$transaction(async (transaction) =>
        operation({
          findUsersByEmail: (email) =>
            transaction.user.findMany({
              where: { email },
              select: { id: true },
              take: 2,
            }),
          findExpectedMembership: (userId, organizationId) =>
            transaction.organizationMember.findUnique({
              where: { organizationId_userId: { organizationId, userId } },
              select: { status: true },
            }),
          updatePasswordHash: (userId, email, passwordHash) =>
            transaction.$executeRaw(
              Prisma.sql`UPDATE "User" SET "passwordHash" = ${passwordHash} WHERE "id" = ${userId}::uuid AND "email" = ${email}`,
            ),
          revokeActiveSessions: async (userId, revokedAt) => {
            const result = await transaction.authSession.updateMany({
              where: { userId, revokedAt: null },
              data: { revokedAt, revokedReason: SESSION_REVOCATION_REASON },
            });
            return result.count;
          },
        }),
      ),
    disconnect: () => prisma.$disconnect(),
  };
}

async function main(): Promise<void> {
  let database: RepairDatabase | undefined;
  try {
    const config = resolveRepairConfig(process.env);
    database = createPrismaRepairDatabase(config.directUrl);
    const result = await repairExistingSmokeCredential(config, database);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "failed",
        message: isSafeRepairError(error) ? error.message : "Credential repair failed. Database error details were suppressed.",
      }),
    );
    process.exitCode = 1;
  } finally {
    await database?.disconnect();
  }
}

function required(env: EnvSource, key: string, trim: boolean): string {
  const raw = env[key];
  const value = trim ? raw?.trim() : raw;
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function isSafeRepairError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    /^(LEDGERBYTE_|Repair requires|Password update did not affect)/.test(error.message)
  );
}

if (require.main === module) {
  void main();
}
