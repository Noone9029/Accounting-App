import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  resolve(__dirname, "../../prisma/migrations/20260710120000_assign_journal_line_dimensions/migration.sql"),
  "utf8",
);

function modelBlock(source: string, name: string): string {
  const match = source.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  if (!match) {
    throw new Error(`Missing model ${name}`);
  }
  return match[0];
}

describe("accounting dimension history integrity", () => {
  it("uses no-action catalog deletion in the Prisma relation contract so direct deletion is blocked without breaking tenant cascades", () => {
    const journalLine = modelBlock(schema, "JournalLine");

    expect(journalLine).toMatch(/costCenter\s+CostCenter\?\s+@relation\([^\n]*onDelete: NoAction\)/);
    expect(journalLine).toMatch(/project\s+Project\?\s+@relation\([^\n]*onDelete: NoAction\)/);
  });

  it("uses restrictive foreign keys without destructive assignment rewrites in the additive migration", () => {
    expect(migration).toContain('REFERENCES "CostCenter"("id") ON DELETE NO ACTION ON UPDATE CASCADE');
    expect(migration).toContain('REFERENCES "Project"("id") ON DELETE NO ACTION ON UPDATE CASCADE');
    expect(migration).not.toContain("ON DELETE SET NULL");
    expect(migration).not.toMatch(/\b(?:UPDATE|DELETE FROM)\s+"JournalLine"/i);
  });
});
