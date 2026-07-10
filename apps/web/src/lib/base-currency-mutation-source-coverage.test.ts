import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_CURRENCY_MUTATION_SURFACES = [
  "src/components/forms/create-journal-form.tsx",
  "src/components/forms/sales-invoice-form.tsx",
  "src/components/forms/purchase-bill-form.tsx",
  "src/components/forms/credit-note-form.tsx",
  "src/components/forms/purchase-debit-note-form.tsx",
  "src/components/forms/cash-expense-form.tsx",
  "src/components/forms/sales-quote-form.tsx",
  "src/components/forms/purchase-order-form.tsx",
  "src/components/forms/recurring-invoice-form.tsx",
  "src/components/forms/bank-account-profile-form.tsx",
  "src/app/(app)/bank-accounts/[id]/page.tsx",
  "src/app/(app)/bank-transfers/new/page.tsx",
  "src/app/(app)/sales/customer-payments/new/page.tsx",
  "src/app/(app)/purchases/supplier-payments/new/page.tsx",
  "src/app/(app)/sales/customer-refunds/new/page.tsx",
  "src/app/(app)/purchases/supplier-refunds/new/page.tsx",
] as const;

describe("base-currency mutation source coverage", () => {
  it.each(BASE_CURRENCY_MUTATION_SURFACES)("does not retain a SAR or edition currency default in %s", (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");

    expect(source).not.toMatch(/currency:\s*["']SAR["']/);
    expect(source).not.toMatch(/\?\?\s*["']SAR["']/);
    expect(source).not.toContain("edition.defaultCurrency");
    expect(source).not.toContain("DEFAULT_BASE_CURRENCY");
    expect(source).toContain("useActiveOrganization");
  });
});
