export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "COST_OF_SALES";
export type ContactType = "CUSTOMER" | "SUPPLIER" | "BOTH";
export type TaxRateScope = "SALES" | "PURCHASES" | "BOTH";
export type TaxRateCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "REVERSE_CHARGE";
export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED" | "REVERSED";

export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  countryCode: string;
  baseCurrency: string;
  timezone: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface MeResponse extends AuthUser {
  memberships: Array<{
    status: string;
    organization: Organization;
    role: { id: string; name: string; permissions: unknown };
  }>;
}

export interface Account {
  id: string;
  organizationId: string;
  parentId: string | null;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  allowPosting: boolean;
  isSystem: boolean;
  isActive: boolean;
  parent?: { id: string; code: string; name: string } | null;
}

export interface TaxRate {
  id: string;
  organizationId: string;
  name: string;
  scope: TaxRateScope;
  category: TaxRateCategory;
  rate: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
}

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  city: string | null;
  countryCode: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  name: string;
  displayName: string | null;
  phone: string | null;
  taxNumber: string | null;
  city: string | null;
  countryCode: string;
  isDefault: boolean;
}

export interface JournalLine {
  id: string;
  accountId: string;
  taxRateId?: string | null;
  lineNumber?: number;
  description?: string | null;
  debit: string;
  credit: string;
  currency: string;
  exchangeRate?: string;
  account?: { id: string; code: string; name: string };
  taxRate?: { id: string; name: string; rate: string } | null;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  entryNumber: string;
  status: JournalStatus;
  entryDate: string;
  description: string;
  reference: string | null;
  currency: string;
  totalDebit: string;
  totalCredit: string;
  postedAt: string | null;
  reversalOfId: string | null;
  lines: JournalLine[];
  reversedBy?: { id: string; entryNumber: string } | null;
  reversalOf?: { id: string; entryNumber: string } | null;
}
