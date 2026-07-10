import { Decimal } from "decimal.js";
import { Prisma } from "@prisma/client";
import { AccountingRuleError, convertTransactionToBaseAmount } from "@ledgerbyte/accounting-core";

describe("foreign exchange arithmetic", () => {
  it("converts transaction currency to base currency by multiplying by the captured rate", () => {
    expect(convertTransactionToBaseAmount("100.0000", "3.67250000")).toBe("367.2500");
  });

  it("preserves decimal exactness without converting values through JavaScript numbers", () => {
    expect(convertTransactionToBaseAmount(new Decimal("9007199254740993.0000"), "1.00000001")).toBe(
      "9007199344812985.5474",
    );
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

function expectAccountingRuleError(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error(`Expected AccountingRuleError with code ${code}.`);
  } catch (error) {
    expect(error).toBeInstanceOf(AccountingRuleError);
    expect(error).toMatchObject({ code });
  }
}
