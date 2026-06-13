export type BankRuleDirectionInput = "ANY" | "DEBIT" | "CREDIT";
export type BankRuleActionInput = "SUGGEST_CATEGORIZE" | "SUGGEST_IGNORE" | "SUGGEST_MATCH_CANDIDATES" | "CATEGORIZE" | "IGNORE";

export interface BankRuleEvaluationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  direction: BankRuleDirectionInput;
  descriptionContains?: string | null;
  descriptionRegex?: string | null;
  referenceContains?: string | null;
  bankReferenceContains?: string | null;
  counterpartyContains?: string | null;
  amountEquals?: string | number | null;
  amountMin?: string | number | null;
  amountMax?: string | number | null;
  currencyEquals?: string | null;
  sourceFormat?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  actionType: BankRuleActionInput;
  categorizeAccountId?: string | null;
  ignoreReason?: string | null;
  autoApply?: boolean | null;
}

export interface BankRuleEvaluationTransaction {
  id: string;
  bankAccountProfileId?: string | null;
  transactionDate: Date | string;
  description?: string | null;
  reference?: string | null;
  bankReference?: string | null;
  counterparty?: string | null;
  currency?: string | null;
  sourceFormat?: string | null;
  type: "DEBIT" | "CREDIT";
  amount: string | number;
  status?: string | null;
}

export interface BankRuleSuggestion {
  ruleId: string;
  ruleName: string;
  priority: number;
  actionType: BankRuleActionInput;
  score: number;
  autoApply: boolean;
  categorizeAccountId?: string | null;
  ignoreReason?: string | null;
  matchedReasons: string[];
}

const MAX_REGEX_LENGTH = 120;

export function evaluateBankRules(
  transaction: BankRuleEvaluationTransaction,
  rules: BankRuleEvaluationRule[],
): BankRuleSuggestion[] {
  return rules
    .filter((rule) => rule.enabled)
    .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    .map((rule) => evaluateBankRule(transaction, rule))
    .filter((result): result is BankRuleSuggestion => result !== null);
}

export function evaluateBankRule(
  transaction: BankRuleEvaluationTransaction,
  rule: BankRuleEvaluationRule,
): BankRuleSuggestion | null {
  if (!rule.enabled) {
    return null;
  }

  const reasons: string[] = [];
  const direction = rule.direction ?? "ANY";
  if (direction !== "ANY") {
    if (transaction.type !== direction) {
      return null;
    }
    reasons.push(`Direction is ${direction.toLowerCase()}.`);
  }

  if (!containsMatches(transaction.description, rule.descriptionContains)) {
    return null;
  }
  if (rule.descriptionContains) {
    reasons.push(`Description contains "${rule.descriptionContains}".`);
  }

  const regexResult = regexMatches(transaction.description, rule.descriptionRegex);
  if (!regexResult.matched) {
    return null;
  }
  if (regexResult.reason) {
    reasons.push(regexResult.reason);
  }

  if (!containsMatches(transaction.reference, rule.referenceContains)) {
    return null;
  }
  if (rule.referenceContains) {
    reasons.push(`Reference contains "${rule.referenceContains}".`);
  }

  if (!containsMatches(transaction.bankReference, rule.bankReferenceContains)) {
    return null;
  }
  if (rule.bankReferenceContains) {
    reasons.push(`Bank reference contains "${rule.bankReferenceContains}".`);
  }

  if (!containsMatches(transaction.counterparty, rule.counterpartyContains)) {
    return null;
  }
  if (rule.counterpartyContains) {
    reasons.push(`Counterparty contains "${rule.counterpartyContains}".`);
  }

  if (!amountConditionsMatch(transaction.amount, rule)) {
    return null;
  }
  addAmountReasons(reasons, rule);

  if (rule.currencyEquals && normalizeText(transaction.currency) !== normalizeText(rule.currencyEquals)) {
    return null;
  }
  if (rule.currencyEquals) {
    reasons.push(`Currency is ${rule.currencyEquals.toUpperCase()}.`);
  }

  if (rule.sourceFormat && normalizeText(transaction.sourceFormat) !== normalizeText(rule.sourceFormat)) {
    return null;
  }
  if (rule.sourceFormat) {
    reasons.push(`Source format is ${rule.sourceFormat}.`);
  }

  if (!dateConditionsMatch(transaction.transactionDate, rule)) {
    return null;
  }
  addDateReasons(reasons, rule);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    priority: rule.priority,
    actionType: rule.actionType,
    score: deterministicScore(rule, reasons),
    autoApply: Boolean(rule.autoApply),
    categorizeAccountId: rule.categorizeAccountId ?? null,
    ignoreReason: rule.ignoreReason ?? null,
    matchedReasons: reasons.length > 0 ? reasons : ["Rule has no optional conditions and matches all enabled rows in scope."],
  };
}

export function isSafeBankRuleRegex(pattern: string | null | undefined): boolean {
  if (!pattern) {
    return true;
  }
  if (pattern.length > MAX_REGEX_LENGTH) {
    return false;
  }
  if (/(\([^)]*[+*][^)]*\)[+*?])/.test(pattern)) {
    return false;
  }
  if (/(\.\*){3,}/.test(pattern)) {
    return false;
  }
  try {
    new RegExp(pattern, "i");
    return true;
  } catch {
    return false;
  }
}

function containsMatches(value: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected) {
    return true;
  }
  return normalizeText(value).includes(normalizeText(expected));
}

function regexMatches(value: string | null | undefined, pattern: string | null | undefined): { matched: boolean; reason?: string } {
  if (!pattern) {
    return { matched: true };
  }
  if (!isSafeBankRuleRegex(pattern)) {
    return { matched: false };
  }
  const regex = new RegExp(pattern, "i");
  return regex.test(value ?? "") ? { matched: true, reason: `Description matches regex "${pattern}".` } : { matched: false };
}

function amountConditionsMatch(amountInput: string | number, rule: BankRuleEvaluationRule): boolean {
  const amount = toNumber(amountInput);
  const equals = optionalNumber(rule.amountEquals);
  const min = optionalNumber(rule.amountMin);
  const max = optionalNumber(rule.amountMax);
  if (equals !== null && Math.abs(amount - equals) > 0.0001) {
    return false;
  }
  if (min !== null && amount < min) {
    return false;
  }
  if (max !== null && amount > max) {
    return false;
  }
  return true;
}

function dateConditionsMatch(dateInput: Date | string, rule: BankRuleEvaluationRule): boolean {
  const date = toDate(dateInput);
  const start = optionalDate(rule.startDate);
  const end = optionalDate(rule.endDate);
  if (start && date < start) {
    return false;
  }
  if (end && date > end) {
    return false;
  }
  return true;
}

function addAmountReasons(reasons: string[], rule: BankRuleEvaluationRule) {
  if (rule.amountEquals !== undefined && rule.amountEquals !== null) {
    reasons.push(`Amount equals ${rule.amountEquals}.`);
  }
  if (rule.amountMin !== undefined && rule.amountMin !== null) {
    reasons.push(`Amount is at least ${rule.amountMin}.`);
  }
  if (rule.amountMax !== undefined && rule.amountMax !== null) {
    reasons.push(`Amount is at most ${rule.amountMax}.`);
  }
}

function addDateReasons(reasons: string[], rule: BankRuleEvaluationRule) {
  if (rule.startDate) {
    reasons.push(`Date is on or after ${toDate(rule.startDate).toISOString().slice(0, 10)}.`);
  }
  if (rule.endDate) {
    reasons.push(`Date is on or before ${toDate(rule.endDate).toISOString().slice(0, 10)}.`);
  }
}

function deterministicScore(rule: BankRuleEvaluationRule, reasons: string[]): number {
  const conditionScore = Math.min(30, reasons.length * 5);
  const priorityScore = Math.max(0, 20 - Math.floor(Math.max(0, rule.priority) / 10));
  return Math.min(99, 50 + conditionScore + priorityScore);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function optionalNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return toNumber(value);
}

function toNumber(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function optionalDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return toDate(value);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
