import { evaluateBankRules, isSafeBankRuleRegex, type BankRuleEvaluationRule, type BankRuleEvaluationTransaction } from "./bank-rule-evaluator";

describe("bank rule evaluator", () => {
  const transaction: BankRuleEvaluationTransaction = {
    id: "txn-1",
    bankAccountProfileId: "bank-1",
    transactionDate: "2026-06-01T00:00:00.000Z",
    description: "Monthly bank fee",
    reference: "FEE-2026-06",
    bankReference: "BANK-REF-001",
    counterparty: "Sample Bank",
    currency: "SAR",
    sourceFormat: "CSV",
    type: "DEBIT",
    amount: "25.0000",
    status: "UNMATCHED",
  };

  function rule(overrides: Partial<BankRuleEvaluationRule> = {}): BankRuleEvaluationRule {
    return {
      id: "rule-1",
      name: "Bank fee",
      enabled: true,
      priority: 10,
      direction: "ANY",
      actionType: "SUGGEST_CATEGORIZE",
      autoApply: false,
      ...overrides,
    };
  }

  it("matches description contains, direction, amount, currency, and priority ordering", () => {
    const suggestions = evaluateBankRules(transaction, [
      rule({ id: "rule-2", name: "Later", priority: 20, descriptionContains: "bank fee" }),
      rule({ id: "rule-1", name: "First", priority: 1, direction: "DEBIT", amountEquals: "25.0000", currencyEquals: "SAR" }),
    ]);

    expect(suggestions.map((suggestion) => suggestion.ruleId)).toEqual(["rule-1", "rule-2"]);
    expect(suggestions[0]).toMatchObject({
      actionType: "SUGGEST_CATEGORIZE",
      autoApply: false,
      matchedReasons: expect.arrayContaining(["Direction is debit.", "Amount equals 25.0000.", "Currency is SAR."]),
    });
  });

  it("matches reference, bank reference, counterparty, source format, and amount range", () => {
    const suggestions = evaluateBankRules(transaction, [
      rule({
        referenceContains: "fee-2026",
        bankReferenceContains: "bank-ref",
        counterpartyContains: "sample",
        amountMin: "20.0000",
        amountMax: "30.0000",
        sourceFormat: "CSV",
      }),
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.matchedReasons).toEqual(
      expect.arrayContaining([
        'Reference contains "fee-2026".',
        'Bank reference contains "bank-ref".',
        'Counterparty contains "sample".',
        "Amount is at least 20.0000.",
        "Amount is at most 30.0000.",
        "Source format is CSV.",
      ]),
    );
  });

  it("ignores disabled rules and non-matching direction or currency", () => {
    const suggestions = evaluateBankRules(transaction, [
      rule({ id: "disabled", enabled: false, descriptionContains: "fee" }),
      rule({ id: "credit", direction: "CREDIT" }),
      rule({ id: "usd", currencyEquals: "USD" }),
    ]);

    expect(suggestions).toEqual([]);
  });

  it("handles valid regex and blocks invalid or unsafe regex without crashing", () => {
    expect(evaluateBankRules(transaction, [rule({ descriptionRegex: "bank\\s+fee" })])).toHaveLength(1);
    expect(evaluateBankRules(transaction, [rule({ descriptionRegex: "[" })])).toEqual([]);
    expect(evaluateBankRules(transaction, [rule({ descriptionRegex: "(a+)+" })])).toEqual([]);
    expect(isSafeBankRuleRegex("x".repeat(121))).toBe(false);
  });

  it("matches straightforward date ranges", () => {
    expect(evaluateBankRules(transaction, [rule({ startDate: "2026-05-01", endDate: "2026-06-30" })])).toHaveLength(1);
    expect(evaluateBankRules(transaction, [rule({ startDate: "2026-07-01" })])).toEqual([]);
  });
});
