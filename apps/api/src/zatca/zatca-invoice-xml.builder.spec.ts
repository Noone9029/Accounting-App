import {
  buildZatcaInvoiceInputFromFinalizedInvoice,
  buildZatcaInvoiceXmlFromFinalizedInvoice,
  type BuildFinalizedInvoiceZatcaInputOptions,
} from "./zatca-invoice-xml.builder";

describe("ZATCA finalized invoice XML builder", () => {
  it("maps seller and customer fields into deterministic UBL party sections", () => {
    const xml = buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions());

    expect(xml).toContain("<cac:AccountingSupplierParty>");
    expect(xml).toContain('<cbc:ID schemeID="CRN">7001234567</cbc:ID>');
    expect(xml).toContain("<cbc:StreetName>King Fahd Road</cbc:StreetName>");
    expect(xml).toContain("<cbc:AdditionalStreetName>Unit 15</cbc:AdditionalStreetName>");
    expect(xml).toContain("<cbc:BuildingNumber>1234</cbc:BuildingNumber>");
    expect(xml).toContain("<cbc:CitySubdivisionName>Al Olaya</cbc:CitySubdivisionName>");
    expect(xml).toContain("<cbc:CityName>Riyadh</cbc:CityName>");
    expect(xml).toContain("<cbc:PostalZone>12213</cbc:PostalZone>");
    expect(xml).toContain("<cac:PartyTaxScheme><cbc:CompanyID>300000000000003</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>");
    expect(xml).toContain("<cac:PartyLegalEntity><cbc:RegistrationName>LedgerByte Arabia LLC</cbc:RegistrationName></cac:PartyLegalEntity>");

    expect(xml).toContain("<cac:AccountingCustomerParty>");
    expect(xml).toContain('<cbc:ID schemeID="NAT">1020304050</cbc:ID>');
    expect(xml).toContain("<cbc:StreetName>Prince Turki Road</cbc:StreetName>");
    expect(xml).toContain("<cbc:AdditionalStreetName>Suite 9</cbc:AdditionalStreetName>");
    expect(xml).toContain("<cbc:BuildingNumber>4321</cbc:BuildingNumber>");
    expect(xml).toContain("<cbc:CitySubdivisionName>Al Khobar North</cbc:CitySubdivisionName>");
    expect(xml).toContain("<cbc:CityName>Al Khobar</cbc:CityName>");
    expect(xml).toContain("<cbc:PostalZone>34427</cbc:PostalZone>");
    expect(xml).toContain("<cac:PartyTaxScheme><cbc:CompanyID>310000000000009</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>");
    expect(xml).toContain("<cac:PartyLegalEntity><cbc:RegistrationName>Eastern Trading Co.</cbc:RegistrationName></cac:PartyLegalEntity>");
  });

  it("maps line item totals in stable invoice-line order", () => {
    const xml = buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions());

    expect(xml.indexOf("<cbc:Name>Implementation</cbc:Name>")).toBeLessThan(xml.indexOf("<cbc:Name>Support</cbc:Name>"));
    expect(xml).toContain("<cbc:InvoicedQuantity unitCode=\"PCE\">1.00</cbc:InvoicedQuantity>");
    expect(xml).toContain("<cbc:LineExtensionAmount currencyID=\"SAR\">150.00</cbc:LineExtensionAmount>");
    expect(xml).toContain("<cbc:TaxAmount currencyID=\"SAR\">22.50</cbc:TaxAmount>");
    expect(xml).toContain("<cbc:RoundingAmount currencyID=\"SAR\">172.50</cbc:RoundingAmount>");
    expect(xml).toContain("<cbc:PriceAmount currencyID=\"SAR\">150.00</cbc:PriceAmount>");
    expect(xml).toContain("<cbc:LineExtensionAmount currencyID=\"SAR\">50.00</cbc:LineExtensionAmount>");
    expect(xml).toContain("<cbc:TaxAmount currencyID=\"SAR\">7.50</cbc:TaxAmount>");
    expect(xml).toContain("<cbc:RoundingAmount currencyID=\"SAR\">57.50</cbc:RoundingAmount>");
  });

  it("maps tax totals and monetary totals from invoice totals", () => {
    const xml = buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions());

    expect(countOccurrences(xml, "<cbc:TaxAmount currencyID=\"SAR\">30.00</cbc:TaxAmount>")).toBe(3);
    expect(xml).toContain("<cbc:TaxableAmount currencyID=\"SAR\">200.00</cbc:TaxableAmount>");
    expect(xml).toContain("<cbc:Percent>15.00</cbc:Percent>");
    expect(xml).toContain("<cbc:LineExtensionAmount currencyID=\"SAR\">200.00</cbc:LineExtensionAmount>");
    expect(xml).toContain("<cbc:TaxExclusiveAmount currencyID=\"SAR\">200.00</cbc:TaxExclusiveAmount>");
    expect(xml).toContain("<cbc:TaxInclusiveAmount currencyID=\"SAR\">230.00</cbc:TaxInclusiveAmount>");
    expect(xml).toContain("<cbc:AllowanceTotalAmount currencyID=\"SAR\">0.00</cbc:AllowanceTotalAmount>");
    expect(xml).toContain("<cbc:PayableAmount currencyID=\"SAR\">230.00</cbc:PayableAmount>");
  });

  it("emits the expected invoice type flags for standard and simplified invoices", () => {
    const standardXml = buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions({ invoiceType: "STANDARD_TAX_INVOICE" }));
    const simplifiedXml = buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions({ invoiceType: "SIMPLIFIED_TAX_INVOICE" }));

    expect(standardXml).toContain('<cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>');
    expect(simplifiedXml).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>');
  });

  it("returns stable unsigned XML without generating QR by default", () => {
    const options = makeBuildOptions();
    const xml = buildZatcaInvoiceXmlFromFinalizedInvoice(options);

    expect(xml).toBe(buildZatcaInvoiceXmlFromFinalizedInvoice(options));
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>");
    expect(xml).toContain("<cbc:ID>PIH</cbc:ID>");
    expect(xml).not.toContain("<cbc:ID>QR</cbc:ID>");
    expect(xml.indexOf("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>")).toBeLessThan(xml.indexOf("<cac:AccountingSupplierParty>"));
    expect(xml.indexOf("<cac:AccountingSupplierParty>")).toBeLessThan(xml.indexOf("<cac:AccountingCustomerParty>"));
    expect(xml.indexOf("<cac:AccountingCustomerParty>")).toBeLessThan(xml.indexOf("<cac:TaxTotal>"));
    expect(xml.indexOf("<cac:TaxTotal>")).toBeLessThan(xml.indexOf("<cac:LegalMonetaryTotal>"));
    expect(xml.indexOf("<cac:LegalMonetaryTotal>")).toBeLessThan(xml.indexOf("<cac:InvoiceLine>"));
  });

  it("builds the reusable ZATCA core input from finalized invoice data", () => {
    const input = buildZatcaInvoiceInputFromFinalizedInvoice(makeBuildOptions());

    expect(input).toMatchObject({
      invoiceUuid: "11111111-1111-4111-8111-111111111111",
      invoiceNumber: "INV-ZATCA-000001",
      invoiceType: "STANDARD_TAX_INVOICE",
      currency: "SAR",
      seller: {
        name: "LedgerByte Arabia LLC",
        vatNumber: "300000000000003",
      },
      buyer: {
        name: "Eastern Trading Co.",
        vatNumber: "310000000000009",
      },
      subtotal: "200.0000",
      taxTotal: "30.0000",
      total: "230.0000",
      qrCodeBase64: "",
    });
    expect(input.lines.map((line) => line.description)).toEqual(["Implementation", "Support"]);
  });

  it("rejects non-finalized invoice sources", () => {
    expect(() => buildZatcaInvoiceXmlFromFinalizedInvoice(makeBuildOptions({ invoiceStatus: "DRAFT" }))).toThrow(
      "ZATCA invoice XML can only be built from finalized sales invoices.",
    );
  });
});

function makeBuildOptions(
  overrides: Partial<BuildFinalizedInvoiceZatcaInputOptions> & { invoiceStatus?: string } = {},
): BuildFinalizedInvoiceZatcaInputOptions {
  return {
    invoiceUuid: "11111111-1111-4111-8111-111111111111",
    invoiceType: "STANDARD_TAX_INVOICE",
    previousInvoiceHash: "previous-invoice-hash",
    icv: 42,
    profile: {
      sellerName: "LedgerByte Arabia LLC",
      vatNumber: "300000000000003",
      companyIdType: "CRN",
      companyIdNumber: "7001234567",
      buildingNumber: "1234",
      streetName: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      postalCode: "12213",
      countryCode: "SA",
      additionalAddressNumber: "Unit 15",
    },
    invoice: {
      invoiceNumber: "INV-ZATCA-000001",
      status: overrides.invoiceStatus ?? "FINALIZED",
      issueDate: new Date("2026-05-25T09:30:00.000Z"),
      currency: "SAR",
      subtotal: "200.0000",
      discountTotal: "0.0000",
      taxableTotal: "200.0000",
      taxTotal: "30.0000",
      total: "230.0000",
      organization: {
        name: "LedgerByte",
        legalName: "LedgerByte Arabia LLC",
        taxNumber: "300000000000003",
        countryCode: "SA",
      },
      customer: {
        name: "Eastern Trading",
        displayName: "Eastern Trading Co.",
        taxNumber: "310000000000009",
        identificationType: "NAT",
        identificationNumber: "1020304050",
        addressLine1: "Prince Turki Road",
        addressLine2: "Suite 9",
        buildingNumber: "4321",
        district: "Al Khobar North",
        city: "Al Khobar",
        postalCode: "34427",
        countryCode: "SA",
      },
      lines: [
        {
          id: "line-support",
          description: "Support",
          quantity: "1.0000",
          unitPrice: "50.0000",
          taxableAmount: "50.0000",
          taxAmount: "7.5000",
          lineTotal: "57.5000",
          sortOrder: 2,
          taxRate: { name: "VAT 15%" },
        },
        {
          id: "line-implementation",
          description: "Implementation",
          quantity: "1.0000",
          unitPrice: "150.0000",
          taxableAmount: "150.0000",
          taxAmount: "22.5000",
          lineTotal: "172.5000",
          sortOrder: 1,
          taxRate: { name: "VAT 15%" },
        },
      ],
    },
    ...overrides,
  };
}

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}
