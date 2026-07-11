import { Decimal } from "decimal.js";
import { Prisma } from "@prisma/client";
import {
  AccountingRuleError,
  calculateSalesInvoiceLine,
  convertTransactionDocumentAmounts,
  convertTransactionToBaseAmount,
} from "@ledgerbyte/accounting-core";

describe("foreign exchange arithmetic", () => {
  it("converts transaction currency to base currency by multiplying by the captured rate", () => {
    expect(convertTransactionToBaseAmount("100.0000", "3.67250000")).toBe("367.2500");
  });

  it("preserves decimal exactness without converting values through JavaScript numbers", () => {
    expect(convertTransactionToBaseAmount(new Decimal("9007199254740993.0000"), "1.00000001")).toBe(
      "9007199344812985.5474",
    );
  });

  it("retains enough intermediate precision before four-place base rounding", () => {
    expect(convertTransactionToBaseAmount("100000000000000.1041", "1.10324679")).toBe(
      "110324679000000.1148",
    );
  });

  it("does not change the shared Decimal configuration", () => {
    const originalPrecision = Decimal.precision;
    const originalRounding = Decimal.rounding;

    convertTransactionToBaseAmount("100000000000000.1041", "1.10324679");

    expect(Decimal.precision).toBe(originalPrecision);
    expect(Decimal.rounding).toBe(originalRounding);
  });

  it("rounds base amounts to four places using half-up rounding", () => {
    expect(convertTransactionToBaseAmount("1.00005", "1")).toBe("1.0001");
    expect(convertTransactionToBaseAmount("1.00004", "1")).toBe("1.0000");
  });

  it("keeps an amount unchanged at the identity rate", () => {
    expect(convertTransactionToBaseAmount("123.4567", "1.00000000")).toBe("123.4567");
  });

  it("converts a zero transaction amount without weakening rate validation", () => {
    expect(convertTransactionToBaseAmount("0", "3.67250000")).toBe("0.0000");
  });

  it("accepts plain decimal strings with an optional leading plus and trimmed outer whitespace", () => {
    expect(convertTransactionToBaseAmount(" +.5 ", " 2 ")).toBe("1.0000");
    expect(convertTransactionToBaseAmount("+12.25", "+1")).toBe("12.2500");
  });

  it("accepts Decimal.js and Prisma Decimal values without stringifying through JavaScript numbers", () => {
    expect(convertTransactionToBaseAmount(new Decimal("1.25"), new Prisma.Decimal("2"))).toBe("2.5000");
    expect(convertTransactionToBaseAmount(new Prisma.Decimal("1.25"), new Decimal("2"))).toBe("2.5000");
  });

  it("rejects a negative transaction amount", () => {
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount("-0.0001", "1"),
      "FX_INVALID_TRANSACTION_AMOUNT",
    );
  });

  it.each(["", "   ", "not-a-number", "NaN", "Infinity", "-Infinity"])(
    "rejects an invalid or non-finite transaction amount: %s",
    (transactionAmount) => {
      expectAccountingRuleError(
        () => convertTransactionToBaseAmount(transactionAmount, "1"),
        "FX_INVALID_TRANSACTION_AMOUNT",
      );
    },
  );

  it("rejects non-finite Decimal transaction amounts", () => {
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount(new Decimal("Infinity"), "1"),
      "FX_INVALID_TRANSACTION_AMOUNT",
    );
  });

  it.each(["0x10", "0b10", "1e3", "1_000", "1 000", "++1", "+", ".", "1."])(
    "rejects transaction amounts outside the plain base-10 decimal grammar: %s",
    (transactionAmount) => {
      expectAccountingRuleError(
        () => convertTransactionToBaseAmount(transactionAmount, "1"),
        "FX_INVALID_TRANSACTION_AMOUNT",
      );
    },
  );

  it("rejects JavaScript number inputs so conversion stays on the exact-decimal path", () => {
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount(0.1 as never, "1"),
      "FX_INVALID_TRANSACTION_AMOUNT",
    );
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount("1", 0.1 as never),
      "FX_INVALID_EXCHANGE_RATE",
    );
  });

  it.each(["0", "-0.00000001"])("rejects a zero or negative exchange rate: %s", (exchangeRate) => {
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount("1", exchangeRate),
      "FX_INVALID_EXCHANGE_RATE",
    );
  });

  it.each(["", "   ", "not-a-number", "NaN", "Infinity", "-Infinity"])(
    "rejects an invalid or non-finite exchange rate: %s",
    (exchangeRate) => {
      expectAccountingRuleError(
        () => convertTransactionToBaseAmount("1", exchangeRate),
        "FX_INVALID_EXCHANGE_RATE",
      );
    },
  );

  it("rejects non-finite Decimal exchange rates", () => {
    expectAccountingRuleError(
      () => convertTransactionToBaseAmount("1", new Prisma.Decimal("Infinity")),
      "FX_INVALID_EXCHANGE_RATE",
    );
  });

  it.each(["0x10", "0b10", "1e3", "1_000", "1 000", "++1", "+", ".", "1."])(
    "rejects exchange rates outside the plain base-10 decimal grammar: %s",
    (exchangeRate) => {
      expectAccountingRuleError(
        () => convertTransactionToBaseAmount("1", exchangeRate),
        "FX_INVALID_EXCHANGE_RATE",
      );
    },
  );
});

describe("document-level foreign exchange arithmetic", () => {
  it("converts each transaction-currency line and derives base totals from the rounded base lines", () => {
    const converted = convertTransactionDocumentAmounts(
      [
        {
          lineGrossAmount: "0.3333",
          discountAmount: "0.0000",
          taxableAmount: "0.3333",
          taxAmount: "0.0167",
          lineTotal: "0.3500",
        },
        {
          lineGrossAmount: "0.3333",
          discountAmount: "0.0000",
          taxableAmount: "0.3333",
          taxAmount: "0.0167",
          lineTotal: "0.3500",
        },
      ],
      "3.67250000",
    );

    expect(converted.lines).toEqual([
      {
        lineGrossAmount: "1.2240",
        discountAmount: "0.0000",
        taxableAmount: "1.2240",
        taxAmount: "0.0613",
        lineTotal: "1.2853",
      },
      {
        lineGrossAmount: "1.2240",
        discountAmount: "0.0000",
        taxableAmount: "1.2240",
        taxAmount: "0.0613",
        lineTotal: "1.2853",
      },
    ]);
    expect(converted.totals).toEqual({
      subtotal: "2.4480",
      discountTotal: "0.0000",
      taxableTotal: "2.4480",
      taxTotal: "0.1226",
      total: "2.5706",
    });
    for (const line of converted.lines) {
      expect(new Prisma.Decimal(line.taxableAmount).plus(line.taxAmount).toFixed(4)).toBe(line.lineTotal);
    }
    expect(new Prisma.Decimal(converted.totals.taxableTotal).plus(converted.totals.taxTotal).toFixed(4)).toBe(converted.totals.total);
  });

  it("keeps same-currency document values unchanged at rate one", () => {
    const converted = convertTransactionDocumentAmounts(
      [
        {
          lineGrossAmount: "100.0000",
          discountAmount: "5.0000",
          taxableAmount: "95.0000",
          taxAmount: "4.7500",
          lineTotal: "99.7500",
        },
      ],
      "1",
    );

    expect(converted.totals).toEqual({
      subtotal: "100.0000",
      discountTotal: "5.0000",
      taxableTotal: "95.0000",
      taxTotal: "4.7500",
      total: "99.7500",
    });
  });

  it("assigns tax-inclusive conversion residuals to taxable amount without inventing a discount", () => {
    const transactionLine = calculateSalesInvoiceLine({
      quantity: "1",
      unitPrice: "100.0002",
      discountRate: "0",
      taxRate: "15",
      taxMode: "TAX_INCLUSIVE",
    });
    const converted = convertTransactionDocumentAmounts([transactionLine], "3.6725");
    expect(converted.lines).toHaveLength(1);
    const line = converted.lines[0]!;

    expect(line).toEqual({
      lineGrossAmount: "367.2507",
      discountAmount: "0.0000",
      taxableAmount: "319.3484",
      taxAmount: "47.9023",
      lineTotal: "367.2507",
    });
    expect(new Prisma.Decimal(line.lineGrossAmount).minus(line.discountAmount).toFixed(4)).toBe(line.lineTotal);
    expect(new Prisma.Decimal(line.taxableAmount).plus(line.taxAmount).toFixed(4)).toBe(line.lineTotal);
  });
});

function expectAccountingRuleError(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error(`Expected AccountingRuleError with code ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(AccountingRuleError);
    expect(error).toMatchObject({ code });
  }
}
