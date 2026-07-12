import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CashExpenseLineDto } from "../cash-expenses/dto/cash-expense-line.dto";
import { PurchaseBillLineDto } from "../purchase-bills/dto/purchase-bill-line.dto";
import { SalesInvoiceLineDto } from "../sales-invoices/dto/sales-invoice-line.dto";

const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
const migrationPath = resolve(
  __dirname,
  "../../prisma/migrations/20260712120000_add_document_line_dimensions/migration.sql",
);
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

function modelBlock(name: string): string {
  return schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
}

describe("document line dimension persistence", () => {
  it.each(["SalesInvoiceLine", "PurchaseBillLine", "CashExpenseLine"])("adds tenant-safe dimensions to %s", (model) => {
    const block = modelBlock(model);
    expect(block).toMatch(/costCenterId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/projectId\s+String\?\s+@db\.Uuid/);
    expect(block).toMatch(/costCenter\s+CostCenter\?\s+@relation\([^\n]*fields: \[organizationId, costCenterId\], references: \[organizationId, id\], onDelete: NoAction\)/);
    expect(block).toMatch(/project\s+Project\?\s+@relation\([^\n]*fields: \[organizationId, projectId\], references: \[organizationId, id\], onDelete: NoAction\)/);
    expect(block).toContain("@@index([organizationId, costCenterId])");
    expect(block).toContain("@@index([organizationId, projectId])");
  });

  it("uses an additive migration without rewriting historical document lines", () => {
    expect(migration).not.toBe("");
    for (const model of ["SalesInvoiceLine", "PurchaseBillLine", "CashExpenseLine"]) {
      expect(migration).toContain(`ALTER TABLE "${model}" ADD COLUMN "costCenterId" UUID`);
      expect(migration).toContain(`ALTER TABLE "${model}" ADD COLUMN "projectId" UUID`);
      expect(migration).toContain(`REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE`);
      expect(migration).toContain(`REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE`);
      expect(migration).not.toMatch(new RegExp(`UPDATE\\s+"${model}"`, "i"));
    }
  });
});

describe("document line dimension DTO boundaries", () => {
  const valid = {
    quantity: "1.0000",
    unitPrice: "10.0000",
    costCenterId: "11111111-1111-4111-8111-111111111111",
    projectId: "22222222-2222-4222-8222-222222222222",
  };

  it.each([
    ["sales invoice", SalesInvoiceLineDto],
    ["purchase bill", PurchaseBillLineDto],
    ["cash expense", CashExpenseLineDto],
  ] as const)("accepts valid optional dimensions on a %s line", (_label, Dto) => {
    expect(validateSync(plainToInstance(Dto, valid))).toEqual([]);
  });

  it.each([
    ["sales invoice", SalesInvoiceLineDto],
    ["purchase bill", PurchaseBillLineDto],
    ["cash expense", CashExpenseLineDto],
  ] as const)("rejects malformed dimension IDs on a %s line", (_label, Dto) => {
    const errors = validateSync(plainToInstance(Dto, { ...valid, costCenterId: "foreign", projectId: "archived" }));
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["costCenterId", "projectId"]));
  });
});
