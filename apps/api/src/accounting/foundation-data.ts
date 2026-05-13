import { AccountType, BankAccountType, NumberSequenceScope, TaxRateCategory, TaxRateScope } from "@prisma/client";

export interface DefaultAccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  allowPosting?: boolean;
}

export const DEFAULT_ACCOUNTS: DefaultAccountDefinition[] = [
  { code: "100", name: "Assets", type: AccountType.ASSET, allowPosting: false },
  { code: "110", name: "Cash and Bank", type: AccountType.ASSET, parentCode: "100", allowPosting: false },
  { code: "111", name: "Cash", type: AccountType.ASSET, parentCode: "110" },
  { code: "112", name: "Bank Account", type: AccountType.ASSET, parentCode: "110" },
  { code: "120", name: "Accounts Receivable", type: AccountType.ASSET, parentCode: "100" },
  { code: "130", name: "Inventory", type: AccountType.ASSET, parentCode: "100" },
  { code: "200", name: "Liabilities", type: AccountType.LIABILITY, allowPosting: false },
  { code: "210", name: "Accounts Payable", type: AccountType.LIABILITY, parentCode: "200" },
  { code: "220", name: "VAT Payable", type: AccountType.LIABILITY, parentCode: "200" },
  { code: "230", name: "VAT Receivable", type: AccountType.ASSET, parentCode: "100" },
  { code: "300", name: "Equity", type: AccountType.EQUITY, allowPosting: false },
  { code: "310", name: "Owner Equity", type: AccountType.EQUITY, parentCode: "300" },
  { code: "400", name: "Revenue", type: AccountType.REVENUE, allowPosting: false },
  { code: "411", name: "Sales", type: AccountType.REVENUE, parentCode: "400" },
  { code: "500", name: "Expenses", type: AccountType.EXPENSE, allowPosting: false },
  { code: "511", name: "General Expenses", type: AccountType.EXPENSE, parentCode: "500" },
  { code: "512", name: "Rent Expense", type: AccountType.EXPENSE, parentCode: "500" },
  { code: "513", name: "Salaries Expense", type: AccountType.EXPENSE, parentCode: "500" },
  { code: "514", name: "Bank Fees", type: AccountType.EXPENSE, parentCode: "500" },
  { code: "600", name: "Cost of Sales", type: AccountType.COST_OF_SALES, allowPosting: false },
  { code: "611", name: "Cost of Goods Sold", type: AccountType.COST_OF_SALES, parentCode: "600" },
];

export interface DefaultBankAccountProfileDefinition {
  accountCode: string;
  displayName: string;
  type: BankAccountType;
}

export const DEFAULT_BANK_ACCOUNT_PROFILES: DefaultBankAccountProfileDefinition[] = [
  { accountCode: "111", displayName: "Cash", type: BankAccountType.CASH },
  { accountCode: "112", displayName: "Bank Account", type: BankAccountType.BANK },
];

export const DEFAULT_TAX_RATES = [
  {
    name: "VAT on Sales 15%",
    scope: TaxRateScope.SALES,
    category: TaxRateCategory.STANDARD,
    rate: "15.0000",
    description: "Standard Saudi VAT charged on taxable sales.",
  },
  {
    name: "VAT on Purchases 15%",
    scope: TaxRateScope.PURCHASES,
    category: TaxRateCategory.STANDARD,
    rate: "15.0000",
    description: "Standard Saudi VAT recoverable on taxable purchases.",
  },
  {
    name: "Zero-Rated Sales 0%",
    scope: TaxRateScope.SALES,
    category: TaxRateCategory.ZERO_RATED,
    rate: "0.0000",
    description: "Zero-rated taxable supplies.",
  },
  {
    name: "Exempt 0%",
    scope: TaxRateScope.BOTH,
    category: TaxRateCategory.EXEMPT,
    rate: "0.0000",
    description: "VAT exempt supplies.",
  },
  {
    name: "Out of Scope 0%",
    scope: TaxRateScope.BOTH,
    category: TaxRateCategory.OUT_OF_SCOPE,
    rate: "0.0000",
    description: "Transactions outside VAT scope.",
  },
  {
    name: "Reverse Charge 15%",
    scope: TaxRateScope.PURCHASES,
    category: TaxRateCategory.REVERSE_CHARGE,
    rate: "15.0000",
    description: "Reverse charge VAT on qualifying purchases.",
  },
];

export const DEFAULT_NUMBER_SEQUENCES = [
  { scope: NumberSequenceScope.JOURNAL_ENTRY, prefix: "JE-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.INVOICE, prefix: "INV-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.PURCHASE_ORDER, prefix: "PO-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.BILL, prefix: "BILL-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.PAYMENT, prefix: "PAY-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.CUSTOMER_REFUND, prefix: "REF-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.BANK_TRANSFER, prefix: "TRF-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.BANK_RECONCILIATION, prefix: "REC-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.CREDIT_NOTE, prefix: "CN-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.DEBIT_NOTE, prefix: "DN-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.PURCHASE_DEBIT_NOTE, prefix: "PDN-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.SUPPLIER_REFUND, prefix: "SRF-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.CASH_EXPENSE, prefix: "EXP-", nextNumber: 1, padding: 6 },
  { scope: NumberSequenceScope.CONTACT, prefix: "CON-", nextNumber: 1, padding: 6 },
];
