import {
  REPAIR_APPROVAL_PHRASE,
  type RepairDatabase,
  repairExistingSmokeCredential,
  resolveRepairConfig,
} from "./repair-user-testing-smoke-credential";

const expectedProjectRef = "xynelbjqcmbgtscfmmzv";
const validEnv = {
  LEDGERBYTE_USER_TESTING_DIRECT_URL: postgresUrl(`user:password@db.${expectedProjectRef}.supabase.co:5432/postgres`),
  LEDGERBYTE_SMOKE_EMAIL: "smoke@example.test",
  LEDGERBYTE_SMOKE_PASSWORD: "generated-password-value",
  LEDGERBYTE_SMOKE_ORGANIZATION_ID: "11111111-1111-4111-8111-111111111111",
  LEDGERBYTE_SMOKE_REPAIR_APPROVAL: REPAIR_APPROVAL_PHRASE,
};

describe("repair-user-testing-smoke-credential", () => {
  it("requires the approved hosted user-testing target and exact approval phrase", () => {
    expect(() => resolveRepairConfig({ ...validEnv, LEDGERBYTE_USER_TESTING_DIRECT_URL: undefined })).toThrow(
      "LEDGERBYTE_USER_TESTING_DIRECT_URL is required",
    );
    expect(() =>
      resolveRepairConfig({
        ...validEnv,
        LEDGERBYTE_USER_TESTING_DIRECT_URL: postgresUrl("user:password@db.other-project.supabase.co:5432/postgres"),
      }),
    ).toThrow(expectedProjectRef);
    expect(() =>
      resolveRepairConfig({
        ...validEnv,
        LEDGERBYTE_USER_TESTING_DIRECT_URL: postgresUrl("user:password@localhost:5432/postgres"),
      }),
    ).toThrow(expectedProjectRef);
    expect(() => resolveRepairConfig({ ...validEnv, LEDGERBYTE_SMOKE_REPAIR_APPROVAL: "wrong" })).toThrow("approval phrase");
  });

  it("accepts the approved project-qualified Supabase session pooler", () => {
    expect(() =>
      resolveRepairConfig({
        ...validEnv,
        LEDGERBYTE_USER_TESTING_DIRECT_URL: postgresUrl(
          `postgres.${expectedProjectRef}:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`,
        ),
      }),
    ).not.toThrow();
  });

  it.each([
    ["LEDGERBYTE_SMOKE_EMAIL", ""],
    ["LEDGERBYTE_SMOKE_PASSWORD", ""],
    ["LEDGERBYTE_SMOKE_ORGANIZATION_ID", ""],
  ] as const)("requires %s", (key, value) => {
    expect(() => resolveRepairConfig({ ...validEnv, [key]: value })).toThrow(`${key} is required`);
  });

  it("normalizes the email without returning secrets in the public summary", async () => {
    const { database, transaction } = createDatabase({ users: [{ id: "user-1" }], membership: { status: "ACTIVE" }, revokedSessions: 2 });
    const hashPassword = jest.fn().mockResolvedValue("bcrypt-hash");

    const result = await repairExistingSmokeCredential(resolveRepairConfig({ ...validEnv, LEDGERBYTE_SMOKE_EMAIL: "  SMOKE@EXAMPLE.TEST " }), database, {
      hashPassword,
      now: () => new Date("2026-07-10T00:00:00.000Z"),
    });

    expect(transaction.findUsersByEmail).toHaveBeenCalledWith("smoke@example.test");
    expect(hashPassword).toHaveBeenCalledWith("generated-password-value", 12);
    expect(transaction.updatePasswordHash).toHaveBeenCalledWith("user-1", "smoke@example.test", "bcrypt-hash");
    expect(transaction.revokeActiveSessions).toHaveBeenCalledWith("user-1", new Date("2026-07-10T00:00:00.000Z"));
    expect(result).toEqual({
      userExistsExactlyOnce: true,
      expectedOrganizationMembershipExists: true,
      passwordResetSucceeded: true,
      sessionsRevoked: 2,
      target: "hosted-user-testing",
    });
    expect(JSON.stringify(result)).not.toContain("smoke@example.test");
    expect(JSON.stringify(result)).not.toContain("generated-password-value");
    expect(JSON.stringify(result)).not.toContain("bcrypt-hash");
  });

  it.each([
    ["zero users", []],
    ["multiple users", [{ id: "user-1" }, { id: "user-2" }]],
  ] as const)("refuses %s without mutations", async (_label, users) => {
    const { database, transaction } = createDatabase({ users: [...users], membership: { status: "ACTIVE" } });

    await expect(repairExistingSmokeCredential(resolveRepairConfig(validEnv), database)).rejects.toThrow("exactly one existing smoke user");
    expect(transaction.updatePasswordHash).not.toHaveBeenCalled();
    expect(transaction.revokeActiveSessions).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["inactive", { status: "INVITED" }],
  ] as const)("refuses an %s expected organization membership without mutations", async (_label, membership) => {
    const { database, transaction } = createDatabase({ users: [{ id: "user-1" }], membership });

    await expect(repairExistingSmokeCredential(resolveRepairConfig(validEnv), database)).rejects.toThrow("active membership");
    expect(transaction.updatePasswordHash).not.toHaveBeenCalled();
    expect(transaction.revokeActiveSessions).not.toHaveBeenCalled();
  });

  it("rolls back when the password update does not affect exactly one user", async () => {
    const { database, transaction } = createDatabase({ users: [{ id: "user-1" }], membership: { status: "ACTIVE" }, updatedUsers: 0 });

    await expect(repairExistingSmokeCredential(resolveRepairConfig(validEnv), database)).rejects.toThrow("Password update did not affect exactly one user");
    expect(transaction.revokeActiveSessions).not.toHaveBeenCalled();
  });
});

function createDatabase(options: {
  users: Array<{ id: string }>;
  membership: { status: string } | null;
  updatedUsers?: number;
  revokedSessions?: number;
}) {
  const transaction = {
    findUsersByEmail: jest.fn().mockResolvedValue(options.users),
    findExpectedMembership: jest.fn().mockResolvedValue(options.membership),
    updatePasswordHash: jest.fn().mockResolvedValue(options.updatedUsers ?? 1),
    revokeActiveSessions: jest.fn().mockResolvedValue(options.revokedSessions ?? 0),
  };
  const database: RepairDatabase = {
    transaction: async (operation) => operation(transaction),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
  return { database, transaction };
}

function postgresUrl(authority: string): string {
  return `postgresql://${authority}`;
}
