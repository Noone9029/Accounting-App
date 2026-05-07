import {
  buildZatcaInvoicePayload,
  buildZatcaInvoiceXml,
  calculateInvoiceHash,
  generateZatcaQrBase64,
  initialPreviousInvoiceHash,
  type ZatcaInvoiceInput,
} from "@ledgerbyte/zatca-core";

describe("zatca-core local payload helpers", () => {
  const input: ZatcaInvoiceInput = {
    invoiceUuid: "00000000-0000-0000-0000-000000000001",
    invoiceNumber: "INV-000001",
    invoiceType: "STANDARD_TAX_INVOICE",
    issueDate: new Date("2026-05-07T10:00:00.000Z"),
    currency: "SAR",
    seller: {
      name: "LedgerByte Smoke Seller",
      vatNumber: "300000000000003",
      buildingNumber: "1234",
      streetName: "King Fahd Road",
      district: "Olaya",
      city: "Riyadh",
      postalCode: "12345",
      countryCode: "SA",
    },
    buyer: {
      name: "Smoke Customer",
      vatNumber: "300000000000004",
      countryCode: "SA",
    },
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    previousInvoiceHash: initialPreviousInvoiceHash,
    icv: 1,
    lines: [
      {
        id: "line-1",
        description: "Consulting service",
        quantity: "1.0000",
        unitPrice: "100.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRateName: "VAT on Sales 15%",
      },
    ],
  };

  it("generates deterministic XML containing invoice and VAT data", () => {
    const first = buildZatcaInvoiceXml(input);
    const second = buildZatcaInvoiceXml(input);

    expect(first).toBe(second);
    expect(first).toContain("INV-000001");
    expect(first).toContain("300000000000003");
    expect(first).toContain("Consulting service");
  });

  it("generates basic TLV QR base64 payload", () => {
    const qr = generateZatcaQrBase64({
      sellerName: input.seller.name,
      vatNumber: input.seller.vatNumber,
      timestamp: input.issueDate,
      invoiceTotal: input.total,
      vatTotal: input.taxTotal,
    });

    expect(qr).toEqual(expect.any(String));
    expect(qr.length).toBeGreaterThan(20);
    expect(Buffer.from(qr, "base64").byteLength).toBeGreaterThan(20);
  });

  it("hashes deterministically and changes when totals change", () => {
    const xml = buildZatcaInvoiceXml(input);
    const changedXml = buildZatcaInvoiceXml({ ...input, total: "116.0000" });

    expect(calculateInvoiceHash(xml)).toBe(calculateInvoiceHash(xml));
    expect(calculateInvoiceHash(changedXml)).not.toBe(calculateInvoiceHash(xml));
  });

  it("builds XML, QR, and hash payload together", () => {
    const payload = buildZatcaInvoicePayload(input);

    expect(payload.xml).toContain("INV-000001");
    expect(payload.xmlBase64).toBe(Buffer.from(payload.xml, "utf8").toString("base64"));
    expect(payload.invoiceHash).toBe(calculateInvoiceHash(payload.xml));
    expect(payload.qrCodeBase64).toEqual(expect.any(String));
  });
});
