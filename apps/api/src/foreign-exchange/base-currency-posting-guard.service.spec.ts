import { BadRequestException, NotFoundException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BaseCurrencyPostingGuardService,
  FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE,
} from "./base-currency-posting-guard.service";

describe("BaseCurrencyPostingGuardService", () => {
  function makeService(baseCurrency: string | null) {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue(baseCurrency ? { baseCurrency } : null),
      },
    };
    return { service: new BaseCurrencyPostingGuardService(prisma as never), prisma };
  }

  it("allows only the organization's normalized base currency", async () => {
    const { service } = makeService("AED");

    await expect(service.assertPostingAllowed("org-1", " aed ")).resolves.toBeUndefined();
    await expect(service.assertPostingAllowed("org-1", "USD")).rejects.toEqual(
      new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE),
    );
  });

  it("fails closed when the organization is unavailable", async () => {
    const { service } = makeService(null);

    await expect(service.assertPostingAllowed("org-1", "AED")).rejects.toEqual(
      new NotFoundException("Organization not found."),
    );
  });

  it("uses the supplied transaction executor", async () => {
    const { service, prisma } = makeService("SAR");
    const transaction = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
    };

    await expect(service.assertPostingAllowed("org-1", "AED", transaction as never)).resolves.toBeUndefined();
    expect(transaction.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
      select: { baseCurrency: true },
    });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });
});

describe("base-currency posting guard coverage", () => {
  it.each([
    "sales-invoices/sales-invoice.service.ts",
    "purchase-bills/purchase-bill.service.ts",
    "credit-notes/credit-note.service.ts",
    "purchase-debit-notes/purchase-debit-note.service.ts",
    "customer-payments/customer-payment.service.ts",
    "supplier-payments/supplier-payment.service.ts",
    "customer-refunds/customer-refund.service.ts",
    "supplier-refunds/supplier-refund.service.ts",
    "cash-expenses/cash-expense.service.ts",
  ])("wires the application guard into %s", (relativePath) => {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    expect(source).toContain("baseCurrencyPostingGuardService?.assertPostingAllowed");
  });
});
