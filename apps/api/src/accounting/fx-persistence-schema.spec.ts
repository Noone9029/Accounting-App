import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260710220000_add_fx_rate_and_account_configuration/migration.sql",
);
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

function modelBlock(source: string, name: string): string {
  const match = source.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  return match?.[0] ?? "";
}

describe("FX persistence schema", () => {
  it("stores immutable tenant-scoped rate snapshots with exact rate and date types", () => {
    expect(schema).toContain("enum CurrencyRateSource {");
    expect(schema).toMatch(
      /enum CurrencyRateSource \{\s+MANUAL\s+IMPORT\s+SYSTEM_RATE_1\s+FUTURE_PROVIDER_DISABLED\s+\}/,
    );

    const rateSnapshot = modelBlock(schema, "CurrencyRateSnapshot");
    expect(rateSnapshot).not.toBe("");
    expect(rateSnapshot).toMatch(/id\s+String\s+@id @default\(uuid\(\)\) @db\.Uuid/);
    expect(rateSnapshot).toMatch(/organizationId\s+String\s+@db\.Uuid/);
    expect(rateSnapshot).toMatch(/transactionCurrency\s+String/);
    expect(rateSnapshot).toMatch(/baseCurrency\s+String/);
    expect(rateSnapshot).toMatch(/rate\s+Decimal\s+@db\.Decimal\(18, 8\)/);
    expect(rateSnapshot).toMatch(/rateDate\s+DateTime\s+@db\.Date/);
    expect(rateSnapshot).toMatch(/source\s+CurrencyRateSource/);
    expect(rateSnapshot).toMatch(/sourceReference\s+String\?/);
    expect(rateSnapshot).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\) @db\.Timestamptz\(3\)/);
    expect(rateSnapshot).not.toMatch(/updatedAt/);
    expect(rateSnapshot).toMatch(
      /organization\s+Organization\s+@relation\(fields: \[organizationId\], references: \[id\], onDelete: Cascade\)/,
    );
    expect(rateSnapshot).toContain(
      "@@index([organizationId, transactionCurrency, baseCurrency, rateDate])",
    );
    expect(rateSnapshot).toContain("@@index([organizationId, createdAt])");

    const organization = modelBlock(schema, "Organization");
    expect(organization).toMatch(/currencyRateSnapshots\s+CurrencyRateSnapshot\[\]/);
  });

  it("keeps every configured FX account inside the owning tenant through composite foreign keys", () => {
    const account = modelBlock(schema, "Account");
    expect(account).toContain("@@unique([organizationId, id])");

    const config = modelBlock(schema, "FxAccountConfiguration");
    expect(config).not.toBe("");
    expect(config).toMatch(/organizationId\s+String\s+@unique @db\.Uuid/);
    expect(config).toMatch(
      /organization\s+Organization\s+@relation\(fields: \[organizationId\], references: \[id\], onDelete: Cascade\)/,
    );
    expect(modelBlock(schema, "Organization")).toMatch(
      /fxAccountConfiguration\s+FxAccountConfiguration\?/,
    );

    for (const field of ["realizedGain", "realizedLoss", "unrealizedGain", "unrealizedLoss"] as const) {
      const accountId = `${field}AccountId`;
      const relationName = `FxAccountConfiguration${field.charAt(0).toUpperCase()}${field.slice(1)}Account`;
      expect(config).toMatch(new RegExp(`${accountId}\\s+String\\?\\s+@db\\.Uuid`));
      expect(config).toMatch(
        new RegExp(
          `${field}Account\\s+Account\\?\\s+@relation\\("${relationName}", fields: \\[organizationId, ${accountId}\\], references: \\[organizationId, id\\], onDelete: NoAction\\)`,
        ),
      );
      expect(config).toContain(`@@index([organizationId, ${accountId}])`);
      expect(account).toMatch(
        new RegExp(`fx${relationName.slice("FxAccountConfiguration".length)}Configurations\\s+FxAccountConfiguration\\[\\]\\s+@relation\\("${relationName}"\\)`),
      );
    }

    expect(config).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\) @db\.Timestamptz\(3\)/);
    expect(config).toMatch(/updatedAt\s+DateTime\s+@updatedAt @db\.Timestamptz\(3\)/);
  });

  it("creates only additive FX structures with exact SQL types, constraints, and tenant indexes", () => {
    expect(migration).not.toBe("");
    expect(migration).toContain(
      'CREATE TYPE "CurrencyRateSource" AS ENUM (\'MANUAL\', \'IMPORT\', \'SYSTEM_RATE_1\', \'FUTURE_PROVIDER_DISABLED\')',
    );
    expect(migration).toContain('CREATE TABLE "CurrencyRateSnapshot"');
    expect(migration).toContain('"rate" DECIMAL(18,8) NOT NULL');
    expect(migration).toContain('"rateDate" DATE NOT NULL');
    expect(migration).toContain('"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(migration).toContain('CONSTRAINT "CurrencyRateSnapshot_rate_positive" CHECK ("rate" > 0)');
    expect(migration).toContain(
      'CONSTRAINT "CurrencyRateSnapshot_distinct_currency_pair" CHECK ("transactionCurrency" <> "baseCurrency")',
    );

    const supportedSql = SUPPORTED_CURRENCY_CODES.map((code) => `'${code}'`).join(", ");
    expect(migration).toContain(
      `CONSTRAINT "CurrencyRateSnapshot_transaction_currency_supported" CHECK ("transactionCurrency" IN (${supportedSql}))`,
    );
    expect(migration).toContain(
      `CONSTRAINT "CurrencyRateSnapshot_base_currency_supported" CHECK ("baseCurrency" IN (${supportedSql}))`,
    );
    expect(migration).toContain(
      'CREATE INDEX "CurrencyRateSnapshot_organizationId_transactionCurrency_baseCurrency_rateDate_idx" ON "CurrencyRateSnapshot"("organizationId", "transactionCurrency", "baseCurrency", "rateDate")',
    );
    expect(migration).toContain(
      'CREATE INDEX "CurrencyRateSnapshot_organizationId_createdAt_idx" ON "CurrencyRateSnapshot"("organizationId", "createdAt")',
    );

    expect(migration).toContain('CREATE TABLE "FxAccountConfiguration"');
    expect(migration).toContain('"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(migration).toContain('"updatedAt" TIMESTAMPTZ(3) NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Account_organizationId_id_key" ON "Account"("organizationId", "id")',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "FxAccountConfiguration_organizationId_key" ON "FxAccountConfiguration"("organizationId")',
    );
    for (const field of ["realizedGain", "realizedLoss", "unrealizedGain", "unrealizedLoss"] as const) {
      const accountId = `${field}AccountId`;
      expect(migration).toContain(
        `CREATE INDEX "FxAccountConfiguration_organizationId_${accountId}_idx" ON "FxAccountConfiguration"("organizationId", "${accountId}")`,
      );
      expect(migration).toMatch(
        new RegExp(
          `FOREIGN KEY \\("organizationId", "${accountId}"\\) REFERENCES "Account"\\("organizationId", "id"\\) ON DELETE NO ACTION ON UPDATE CASCADE`,
        ),
      );
    }
    expect(migration).toContain(
      'FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );

    expect(migration).not.toMatch(/^\s*(?:INSERT INTO|UPDATE\s+"|DELETE FROM)\b/im);
  });

  it("keeps the new tables unavailable to Supabase Data API roles without requiring those roles locally", () => {
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE "CurrencyRateSnapshot" FROM PUBLIC');
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE "FxAccountConfiguration" FROM PUBLIC');
    for (const role of ["anon", "authenticated"] as const) {
      expect(migration).toContain(`IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN`);
      expect(migration).toContain(
        `EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "CurrencyRateSnapshot", "FxAccountConfiguration" FROM ${role}'`,
      );
    }
    expect(migration).not.toMatch(/\bGRANT\b/i);
    expect(migration).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
  });
});
