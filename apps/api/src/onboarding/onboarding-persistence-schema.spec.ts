import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../../prisma/migrations/20260620043000_typed_onboarding_persistence_schema_foundation/migration.sql"),
  "utf8",
);

function block(source: string, kind: "enum" | "model", name: string): string {
  const match = source.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  if (!match) {
    throw new Error(`Missing ${kind} ${name}`);
  }
  return match[0];
}

describe("typed onboarding persistence schema foundation", () => {
  it("adds the LedgerByte-native onboarding profile, checklist, item, event, and template models", () => {
    for (const model of ["OnboardingProfile", "OnboardingChecklist", "OnboardingChecklistItem", "OnboardingChecklistEvent"]) {
      expect(block(schema, "model", model)).toContain("organizationId");
    }
    expect(block(schema, "model", "OnboardingTemplateVersion")).toContain("archetypeKey");
  });

  it("keeps onboarding records tenant-scoped with optional branch scope and audit actors", () => {
    expect(block(schema, "model", "OnboardingProfile")).toContain("branchId");
    expect(block(schema, "model", "OnboardingProfile")).toContain("createdById");
    expect(block(schema, "model", "OnboardingChecklist")).toContain("onboardingProfileId");
    expect(block(schema, "model", "OnboardingChecklistItem")).toContain("completedById");
    expect(block(schema, "model", "OnboardingChecklistItem")).toContain("skippedById");
    expect(block(schema, "model", "OnboardingChecklistEvent")).toContain("actorUserId");
  });

  it("represents the approved profile, checklist, and item states as Prisma enums", () => {
    expect(block(schema, "enum", "OnboardingProfileStatus")).toContain("RESET_REQUESTED");
    expect(block(schema, "enum", "OnboardingChecklistStatus")).toContain("ARCHIVED");
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("NOT_STARTED"));
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("AVAILABLE"));
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("BLOCKED"));
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("COMPLETED"));
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("SKIPPED"));
    expect(block(schema, "enum", "OnboardingChecklistItemStatus")).toEqual(expect.stringContaining("REOPENED"));
  });

  it("adds an additive migration with scoped indexes and active-record uniqueness guards", () => {
    expect(migration).toContain('CREATE TABLE "OnboardingProfile"');
    expect(migration).toContain('CREATE TABLE "OnboardingChecklist"');
    expect(migration).toContain('CREATE TABLE "OnboardingChecklistItem"');
    expect(migration).toContain('CREATE TABLE "OnboardingChecklistEvent"');
    expect(migration).toContain('CREATE TABLE "OnboardingTemplateVersion"');
    expect(migration).toContain('"organizationId" UUID NOT NULL');
    expect(migration).toContain('"branchId" UUID');
    expect(migration).toContain('"OnboardingProfile_one_active_org_key"');
    expect(migration).toContain('"OnboardingProfile_one_active_branch_key"');
    expect(migration).toContain('"OnboardingChecklist_one_active_profile_key"');
    expect(migration).toContain('"OnboardingChecklistItem_onboardingChecklistId_itemKey_key"');
  });

  it("does not add public onboarding controllers or UI persistence in this schema foundation", () => {
    expect(schema).not.toContain("localStorage");
    expect(schema).not.toContain("sessionStorage");
    expect(schema).not.toContain("indexedDB");
    expect(schema).not.toContain("cookies");
    expect(migration).not.toContain("CREATE TABLE \"Inbox");
    expect(migration).not.toContain("CREATE TABLE \"Ai");
  });
});
