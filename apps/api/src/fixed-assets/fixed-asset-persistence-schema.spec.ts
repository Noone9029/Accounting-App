import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaPath = resolve(__dirname, "../../prisma/schema.prisma");
const migrationPath = resolve(__dirname, "../../prisma/migrations/20260715090000_add_fixed_assets_mvp/migration.sql");

function modelBlock(name: string): string {
  const schema = readFileSync(schemaPath, "utf8");
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("fixed-assets persistence schema", () => {
  it("defines tenant-scoped fixed asset entities and accounting invariants", () => {
    const schema = readFileSync(schemaPath, "utf8");
    for (const name of [
      "FixedAssetCategoryStatus",
      "FixedAssetStatus",
      "FixedAssetAcquisitionSource",
      "FixedAssetDepreciationMethod",
      "FixedAssetScheduleLineStatus",
      "FixedAssetDepreciationRunStatus",
      "FixedAssetMovementType",
    ]) {
      expect(schema).toContain(`enum ${name} {`);
    }
    for (const name of [
      "FixedAssetCategory",
      "FixedAsset",
      "FixedAssetSourceLink",
      "FixedAssetDepreciationScheduleLine",
      "FixedAssetDepreciationRun",
      "FixedAssetDepreciationRunLine",
      "FixedAssetMovement",
    ]) {
      const block = modelBlock(name);
      expect(block).toContain("organizationId");
      expect(block).toContain("organization");
    }
    expect(modelBlock("FixedAssetCategory")).toContain("@@unique([organizationId, code])");
    expect(modelBlock("FixedAsset")).toContain("@@unique([organizationId, assetNumber])");
    expect(modelBlock("FixedAssetSourceLink")).toContain("@@unique([organizationId, sourceType, sourceEntityId, sourceLineId])");
    expect(modelBlock("FixedAssetDepreciationScheduleLine")).toContain("@@unique([organizationId, fixedAssetId, periodStart])");
    expect(modelBlock("FixedAssetDepreciationRunLine")).toContain("@@unique([organizationId, runId, fixedAssetId, scheduleLineId])");
    expect(modelBlock("FixedAssetCategory")).toMatch(/assetCostAccount\s+Account\s+@relation\("FixedAssetCategoryAssetCostAccount", fields: \[organizationId, assetCostAccountId\], references: \[organizationId, id\], onDelete: NoAction\)/);
  });

  it("uses an additive migration with tenant composite foreign keys and no data rewrites", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    for (const table of ["FixedAssetCategory", "FixedAsset", "FixedAssetSourceLink", "FixedAssetDepreciationScheduleLine", "FixedAssetDepreciationRun", "FixedAssetDepreciationRunLine", "FixedAssetMovement"]) {
      expect(migration).toContain(`CREATE TABLE \"${table}\"`);
      expect(migration).toContain(`REVOKE ALL PRIVILEGES ON TABLE \"${table}\" FROM PUBLIC`);
    }
    expect(migration).toContain('FOREIGN KEY ("organizationId", "assetCostAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION');
    expect(migration).toContain('CONSTRAINT "FixedAsset_baseSalvageValue_lte_cost" CHECK ("baseSalvageValue" <= "baseAcquisitionCost")');
    expect(migration).toContain('CONSTRAINT "FixedAsset_accumulatedDepreciation_lte_cost_minus_salvage"');
    expect(migration).not.toMatch(/^\s*(?:UPDATE|DELETE FROM)\s+"(?!Role)/im);
  });
});
