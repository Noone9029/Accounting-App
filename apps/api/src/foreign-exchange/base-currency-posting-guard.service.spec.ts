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

    await expect(service.assertPostingAllowed("org-1", " aed ")).resolves.toBe("AED");
    await expect(service.assertPostingAllowed("org-1", "USD")).rejects.toEqual(
      new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE),
    );
  });

  it.each(["AED", "SAR"])("resolves an omitted posting currency to the tenant's %s base currency", async (baseCurrency) => {
    const { service } = makeService(baseCurrency);

    await expect(service.assertPostingAllowed("org-1", undefined)).resolves.toBe(baseCurrency);
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

    await expect(service.assertPostingAllowed("org-1", "AED", transaction as never)).resolves.toBe("AED");
    expect(transaction.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org-1" },
      select: { baseCurrency: true },
    });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("requires every forward journal line to use base currency at rate one", async () => {
    const { service } = makeService("AED");

    await expect(
      service.assertJournalPostingAllowed("org-1", "AED", [
        { currency: "AED", exchangeRate: "1.00000000" },
        { currency: " aed ", exchangeRate: "1" },
      ]),
    ).resolves.toBeUndefined();
    await expect(
      service.assertJournalPostingAllowed("org-1", "AED", [{ currency: "USD", exchangeRate: "1" }]),
    ).rejects.toEqual(new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE));
    await expect(
      service.assertJournalPostingAllowed("org-1", "AED", [{ currency: "AED", exchangeRate: "1.1" }]),
    ).rejects.toEqual(new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE));
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
    "accounting/accounting.service.ts",
  ])("wires the application guard into %s", (relativePath) => {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    expect(source).toContain("baseCurrencyPostingGuardService?.assert");
  });

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
    "accounting/accounting.service.ts",
    "bank-accounts/bank-account.service.ts",
    "sales-quotes/sales-quote.service.ts",
    "purchase-orders/purchase-order.service.ts",
    "recurring-invoices/recurring-invoice.service.ts",
  ])("does not hard-code SAR as the omitted currency fallback in %s", (relativePath) => {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    const documentFxServices = new Set([
      "sales-invoices/sales-invoice.service.ts",
      "purchase-bills/purchase-bill.service.ts",
      "credit-notes/credit-note.service.ts",
      "purchase-debit-notes/purchase-debit-note.service.ts",
      "cash-expenses/cash-expense.service.ts",
    ]);
    expect(source).not.toMatch(/(?:\?\?|\|\|)\s*["']SAR["']/);
    expect(source).not.toContain("DEFAULT_BASE_CURRENCY");
    if (relativePath.includes("refunds/")) {
      expect(source).toContain("requestedCurrency ?? sourceCurrency");
    } else if (documentFxServices.has(relativePath)) {
      expect(source).toContain("DocumentFxContextService");
      expect(source).toContain("documentFxContext().resolve");
    } else {
      expect(source).toContain("resolveOrganizationBaseCurrency");
    }
  });

  it("keeps the document FX resolver anchored to the tenant base-currency lookup", () => {
    const source = readFileSync(resolve(__dirname, "document-fx-context.service.ts"), "utf8");
    expect(source).toContain("resolveOrganizationBaseCurrency");
    expect(source).toContain("const baseCurrency = await resolveOrganizationBaseCurrency(organizationId, executor)");
  });

  it.each([
    "purchase-receipts/purchase-receipt.service.ts",
    "inventory/inventory-variance-proposal.service.ts",
    "sales-stock-issues/sales-stock-issue.service.ts",
  ])("does not hard-code SAR into forward posted journal data in %s", (relativePath) => {
    const source = readFileSync(resolve(__dirname, "..", relativePath), "utf8");
    expect(source).not.toMatch(/currency:\s*["']SAR["']/);
    expect(source).not.toMatch(/line\.currency\s*\?\?\s*["']SAR["']/);
    expect(source).toContain("resolveOrganizationBaseCurrency");
  });
});
