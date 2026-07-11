import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const documentationRoot = resolve(__dirname, "../../../../docs");

const contracts = [
  {
    path: "AUDIT_LOG_COVERAGE_REVIEW.md",
    phrases: [
      "Commit scope: reviewed",
      "`CustomerPayment` or `SupplierPayment`",
      "Every foreign direct payment creation",
      "payment number and linked posting journal ID",
    ],
  },
  {
    path: "accounting/MULTI_CURRENCY_AND_FX_ACCOUNTING.md",
    phrases: [
      "base currency is the accounting truth",
      "transaction currency is supporting evidence",
      "| Sales invoice | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |",
      "| Credit note | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |",
      "| Purchase bill | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |",
      "| Purchase debit note | Draft FX context; finalized base-balanced journal with frozen transaction amounts and rate evidence |",
      "| Cash expense | FX context is captured and frozen when the expense posts during creation |",
      "Refund workflows remain base-currency-only",
      "- foreign-currency customer or supplier refunds;",
      "- foreign opening balances or unsupported manual-journal posting;",
      "- accounting-document import, including invoices, bills, notes, payments, refunds, and journals;",
      "Correcting a rate creates a new snapshot",
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
      "USD 4.5000 × 3.67250000 = AED 16.52625000",
      "which becomes `AED 16.5263`",
      "| Total | `330.5250 + 16.5263` | `347.0513` |",
      "USD 75.1250 × 4.08123456 = SAR 306.60274632",
      "stored base amount = SAR 306.6027",
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
      "settlement base = round4(transaction amount settled × settlement rate)",
      "realized difference = settlement base - document carrying base allocated",
      "The customer pays the full USD amount at `3.75000000`, producing `AED 375.0000`.",
      "The allocated carrying basis is `AED 146.0000`, so the realized gain is `AED 4.0000`.",
      "Paying the full USD amount at `3.65000000` uses `SAR 365.0000`; clearing the larger payable produces a supplier gain of `SAR 10.0000`.",
      "A `USD 40.0000` payment at `3.75000000` clears `SAR 146.0000` of carrying basis but pays `SAR 150.0000`, producing a `SAR 4.0000` realized loss.",
      "Posted allocation evidence is corrected by supported reversal, not by editing its rates or amounts.",
    ],
  },
  {
    path: "accounting/PERIOD_END_FX_REVALUATION.md",
    phrases: [
      "Revaluation then partial settlement example",
      "does not establish tax, regulatory, or accounting-standards compliance",
      "explicitly replaces with a newly validated preview",
      "Eligible monetary balances are finalized foreign receivables and payables only.",
      "It does not include bank balances, cash, inventory, fixed assets, tax filing, provider integrations, or automatic rate retrieval.",
      "| Settlement proceeds | `USD 40.0000 × 3.80000000` | `AED 152.0000` |",
      "| Carrying basis allocated | `40 / 100 × AED 375.0000` | `AED 150.0000` |",
      "| Source basis allocated | `40 / 100 × AED 365.0000` | `AED 146.0000` |",
      "| Realized customer gain | `AED 152.0000 - AED 150.0000` | `AED 2.0000` |",
      "transaction residual is `USD 60.0000`, carrying residual is `AED 225.0000`, and source residual is `AED 219.0000`",
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
      "Payment and document transaction currencies must match; cross-currency allocation is unsupported.",
      "Revaluation covers finalized foreign customer receivables and supplier payables, not bank/cash balances, inventory, fixed assets, revenue, or prepayments.",
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

    if (path === "accounting/MULTI_CURRENCY_AND_FX_ACCOUNTING.md") {
      const postingDocuments = [...content.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
        .filter((match) => {
          const evidence = match[2] ?? "";
          return evidence.includes("base-balanced journal") || evidence.includes("posts during creation");
        })
        .map((match) => match[1] ?? "");

      expect(postingDocuments).toEqual([
        "Sales invoice",
        "Credit note",
        "Purchase bill",
        "Purchase debit note",
        "Cash expense",
      ]);
    }
  });
});
