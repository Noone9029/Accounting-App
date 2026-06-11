import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync, type ValidationError } from "class-validator";
import { CreatePurchaseBillDto } from "./dto/create-purchase-bill.dto";

describe("purchase bill DTO validation", () => {
  it("accepts deterministic Postgres UUID-shaped seeded IDs", () => {
    const messages = validateCreatePurchaseBill({
      supplierId: "00000000-0000-0000-0000-000000000201",
      branchId: "00000000-0000-0000-0000-000000000101",
      billDate: "2026-06-11T00:00:00.000Z",
      dueDate: "2026-06-11T00:00:00.000Z",
      currency: "SAR",
      lines: [
        {
          itemId: "00000000-0000-0000-0000-000000000301",
          accountId: "00000000-0000-0000-0000-000000000401",
          taxRateId: "00000000-0000-0000-0000-000000000501",
          description: "Office supplies",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });

    expect(messages).toEqual([]);
  });

  it("accepts normal v4 UUID IDs and null optional references", () => {
    const messages = validateCreatePurchaseBill({
      supplierId: "bd2071a7-7b2e-4621-b82c-88f522e6fa9a",
      branchId: null,
      billDate: "2026-06-11T00:00:00.000Z",
      dueDate: null,
      currency: "SAR",
      lines: [
        {
          itemId: null,
          accountId: "356eff9d-21e1-488f-a939-27c42e989011",
          taxRateId: null,
          description: "Office supplies",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });

    expect(messages).toEqual([]);
  });

  it("rejects empty strings in optional ID fields", () => {
    const messages = validateCreatePurchaseBill({
      supplierId: "bd2071a7-7b2e-4621-b82c-88f522e6fa9a",
      branchId: "",
      billDate: "2026-06-11T00:00:00.000Z",
      currency: "SAR",
      lines: [
        {
          itemId: "",
          accountId: "",
          taxRateId: "",
          description: "Office supplies",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        "branchId must be a PostgreSQL UUID",
        "itemId must be a PostgreSQL UUID",
        "accountId must be a PostgreSQL UUID",
        "taxRateId must be a PostgreSQL UUID",
      ]),
    );
  });

  it("rejects display labels and account codes in ID fields", () => {
    const messages = validateCreatePurchaseBill({
      supplierId: "TEST",
      branchId: "Riyadh Demo Branch",
      billDate: "2026-06-11T00:00:00.000Z",
      currency: "SAR",
      lines: [
        {
          itemId: "No item",
          accountId: "1000 Cash",
          taxRateId: "VAT 15%",
          description: "Office supplies",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        "supplierId must be a PostgreSQL UUID",
        "branchId must be a PostgreSQL UUID",
        "itemId must be a PostgreSQL UUID",
        "accountId must be a PostgreSQL UUID",
        "taxRateId must be a PostgreSQL UUID",
      ]),
    );
  });
});

function validateCreatePurchaseBill(input: Record<string, unknown>): string[] {
  const dto = plainToInstance(CreatePurchaseBillDto, input);
  return flattenValidationMessages(validateSync(dto, { whitelist: true }));
}

function flattenValidationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenValidationMessages(error.children ?? []),
  ]);
}
