import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const documentationRoot = resolve(__dirname, "../../../../docs");

const contracts = [
  {
    path: "accounting/MULTI_CURRENCY_AND_FX_ACCOUNTING.md",
    phrases: [
      "base currency is the accounting truth",
      "transaction currency is supporting evidence",
      "Refund workflows remain base-currency-only",
      "authenticated, tenant-scoped, read-only",
      "append-only",
    ],
  },
  {
    path: "accounting/FX_RATE_DIRECTION_AND_ROUNDING.md",
    phrases: [
      "base amount = transaction amount × captured rate",
      "at most eight fractional digits",
      "ROUND_HALF_UP",
      "four fractional digits",
      "discount before tax",
      "AED-base example",
      "SAR-base example",
    ],
  },
  {
    path: "accounting/REALIZED_FX_SETTLEMENTS.md",
    phrases: [
      "Full customer settlement",
      "Partial customer settlement",
      "Full supplier settlement",
      "Partial supplier settlement",
      "carrying basis after revaluation",
      "idempotency",
      "fails closed",
    ],
  },
  {
    path: "accounting/PERIOD_END_FX_REVALUATION.md",
    phrases: [
      "Revaluation then partial settlement example",
      "does not establish tax, regulatory, or accounting-standards compliance",
    ],
  },
  {
    path: "product/WAFEQ_COMPETITOR_MULTI_CURRENCY_FOUNDATION.md",
    phrases: [
      "not a live or current Wafeq feature assessment",
      "reviewed master-data FX import",
      "authenticated, tenant-scoped, read-only",
      "append-only",
      "Refund workflows remain base-currency-only",
      "No provider or compliance claim",
      "DOCUMENT_FX_RATE_FROZEN",
      "additive backfill",
    ],
  },
] as const;

describe("FX documentation contract", () => {
  it.each(contracts)("keeps $path complete and explicit", ({ path, phrases }) => {
    const absolutePath = resolve(documentationRoot, path);
    const exists = existsSync(absolutePath);

    expect(exists).toBe(true);
    if (!exists) return;

    const content = readFileSync(absolutePath, "utf8");
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});
