import { buildZatcaInvoiceXml, type ZatcaInvoiceInput } from "@ledgerbyte/zatca-core";

type DecimalLike = string | number | { toString(): string };
type DateLike = string | Date;

export interface FinalizedInvoiceZatcaOrganizationSource {
  name: string;
  legalName?: string | null;
  taxNumber?: string | null;
  countryCode?: string | null;
}

export interface FinalizedInvoiceZatcaCustomerSource {
  name: string;
  displayName?: string | null;
  taxNumber?: string | null;
  identificationType?: string | null;
  identificationNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  buildingNumber?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

export interface FinalizedInvoiceZatcaLineSource {
  id: string;
  description: string;
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  taxableAmount: DecimalLike;
  taxAmount: DecimalLike;
  lineTotal: DecimalLike;
  sortOrder?: number | null;
  taxRate?: { name?: string | null } | null;
}

export interface FinalizedInvoiceZatcaInvoiceSource {
  invoiceNumber: string;
  status: string;
  issueDate: DateLike;
  currency: string;
  subtotal: DecimalLike;
  discountTotal: DecimalLike;
  taxableTotal: DecimalLike;
  taxTotal: DecimalLike;
  total: DecimalLike;
  organization: FinalizedInvoiceZatcaOrganizationSource;
  customer: FinalizedInvoiceZatcaCustomerSource;
  lines: FinalizedInvoiceZatcaLineSource[];
}

export interface FinalizedInvoiceZatcaSellerSource {
  sellerName?: string | null;
  vatNumber?: string | null;
  companyIdType?: string | null;
  companyIdNumber?: string | null;
  buildingNumber?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  additionalAddressNumber?: string | null;
}

export interface BuildFinalizedInvoiceZatcaInputOptions {
  invoice: FinalizedInvoiceZatcaInvoiceSource;
  profile: FinalizedInvoiceZatcaSellerSource;
  invoiceType: ZatcaInvoiceInput["invoiceType"];
  invoiceUuid: string;
  previousInvoiceHash?: string | null;
  icv?: number | null;
  supplyDate?: DateLike | null;
  includeBasicQr?: boolean;
  qrCodeBase64?: string | null;
}

export function buildZatcaInvoiceInputFromFinalizedInvoice(options: BuildFinalizedInvoiceZatcaInputOptions): ZatcaInvoiceInput {
  const { invoice, profile } = options;
  if (invoice.status !== "FINALIZED") {
    throw new Error("ZATCA invoice XML can only be built from finalized sales invoices.");
  }

  const input: ZatcaInvoiceInput = {
    invoiceUuid: options.invoiceUuid,
    invoiceNumber: invoice.invoiceNumber,
    invoiceType: options.invoiceType,
    issueDate: invoice.issueDate,
    supplyDate: options.supplyDate ?? invoice.issueDate,
    currency: invoice.currency,
    seller: {
      name: profile.sellerName ?? invoice.organization.legalName ?? invoice.organization.name,
      vatNumber: profile.vatNumber ?? invoice.organization.taxNumber ?? "",
      companyIdType: profile.companyIdType,
      companyIdNumber: profile.companyIdNumber,
      buildingNumber: profile.buildingNumber,
      streetName: profile.streetName,
      district: profile.district,
      city: profile.city,
      postalCode: profile.postalCode,
      countryCode: profile.countryCode ?? invoice.organization.countryCode ?? "SA",
      additionalAddressNumber: profile.additionalAddressNumber,
    },
    buyer: {
      name: invoice.customer.displayName ?? invoice.customer.name,
      vatNumber: invoice.customer.taxNumber,
      companyIdType: invoice.customer.identificationType,
      companyIdNumber: invoice.customer.identificationNumber,
      streetName: invoice.customer.addressLine1,
      additionalAddressNumber: invoice.customer.addressLine2,
      buildingNumber: invoice.customer.buildingNumber,
      district: invoice.customer.district,
      city: invoice.customer.city,
      postalCode: invoice.customer.postalCode,
      countryCode: invoice.customer.countryCode,
    },
    subtotal: decimalString(invoice.subtotal),
    discountTotal: decimalString(invoice.discountTotal),
    taxableTotal: decimalString(invoice.taxableTotal),
    taxTotal: decimalString(invoice.taxTotal),
    total: decimalString(invoice.total),
    previousInvoiceHash: options.previousInvoiceHash,
    icv: options.icv,
    lines: [...invoice.lines]
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.id.localeCompare(right.id))
      .map((line) => ({
        id: line.id,
        description: line.description,
        quantity: decimalString(line.quantity),
        unitPrice: decimalString(line.unitPrice),
        taxableAmount: decimalString(line.taxableAmount),
        taxAmount: decimalString(line.taxAmount),
        lineTotal: decimalString(line.lineTotal),
        taxRateName: line.taxRate?.name ?? null,
      })),
  };

  if (options.includeBasicQr) {
    if (options.qrCodeBase64 !== undefined) {
      input.qrCodeBase64 = options.qrCodeBase64;
    }
  } else {
    input.qrCodeBase64 = options.qrCodeBase64 ?? "";
  }

  return input;
}

export function buildZatcaInvoiceXmlFromFinalizedInvoice(options: BuildFinalizedInvoiceZatcaInputOptions): string {
  return buildZatcaInvoiceXml(buildZatcaInvoiceInputFromFinalizedInvoice({ ...options, includeBasicQr: options.includeBasicQr ?? false }));
}

function decimalString(value: DecimalLike): string {
  return typeof value === "string" ? value : value.toString();
}
