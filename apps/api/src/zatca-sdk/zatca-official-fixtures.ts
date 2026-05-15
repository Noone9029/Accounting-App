export type ZatcaFixtureSource = "official-sdk" | "ledgerbyte-local";

export type ZatcaFixtureDocumentType = "standard-invoice" | "simplified-invoice" | "credit-note" | "debit-note";

export interface ZatcaFixtureRegistryEntry {
  id: string;
  label: string;
  source: ZatcaFixtureSource;
  documentType: ZatcaFixtureDocumentType;
  invoiceType: "standard" | "simplified";
  relativePath: string;
  validationNotes: string;
}

export const ZATCA_ALLOWED_FIXTURE_ROOTS = ["reference/", "packages/zatca-core/fixtures/"] as const;

export const ZATCA_SDK_FIXTURE_REGISTRY: ZatcaFixtureRegistryEntry[] = [
  {
    id: "official-standard-invoice",
    label: "Official Standard Invoice",
    source: "official-sdk",
    documentType: "standard-invoice",
    invoiceType: "standard",
    relativePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml",
    validationNotes: "Official SDK sample selected for first local validation once Java 11-14 is available.",
  },
  {
    id: "official-simplified-invoice",
    label: "Official Simplified Invoice",
    source: "official-sdk",
    documentType: "simplified-invoice",
    invoiceType: "simplified",
    relativePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml",
    validationNotes: "Official SDK sample selected for first simplified local validation once Java 11-14 is available.",
  },
  {
    id: "official-standard-credit-note",
    label: "Official Standard Credit Note",
    source: "official-sdk",
    documentType: "credit-note",
    invoiceType: "standard",
    relativePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml",
    validationNotes: "Official SDK credit-note sample selected for local validation coverage.",
  },
  {
    id: "official-standard-debit-note",
    label: "Official Standard Debit Note",
    source: "official-sdk",
    documentType: "debit-note",
    invoiceType: "standard",
    relativePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml",
    validationNotes: "Official SDK debit-note sample selected for local validation coverage.",
  },
  {
    id: "ledgerbyte-local-standard-invoice",
    label: "LedgerByte Local Standard Invoice Fixture",
    source: "ledgerbyte-local",
    documentType: "standard-invoice",
    invoiceType: "standard",
    relativePath: "packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml",
    validationNotes: "Local deterministic XML fixture; not an official ZATCA compliance artifact.",
  },
  {
    id: "ledgerbyte-local-simplified-invoice",
    label: "LedgerByte Local Simplified Invoice Fixture",
    source: "ledgerbyte-local",
    documentType: "simplified-invoice",
    invoiceType: "simplified",
    relativePath: "packages/zatca-core/fixtures/local-simplified-tax-invoice.expected.xml",
    validationNotes: "Local deterministic XML fixture; not an official ZATCA compliance artifact.",
  },
];

export function normalizeZatcaFixturePath(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
}

export function isAllowedZatcaFixturePath(value: string): boolean {
  const normalized = normalizeZatcaFixturePath(value);
  if (!normalized || !normalized.toLowerCase().endsWith(".xml")) {
    return false;
  }
  if (/^(?:[a-zA-Z]:|\/|\\\\)/.test(value.trim())) {
    return false;
  }
  if (normalized.split("/").some((part) => part === ".." || part === "")) {
    return false;
  }

  return ZATCA_ALLOWED_FIXTURE_ROOTS.some((root) => normalized.startsWith(root));
}
