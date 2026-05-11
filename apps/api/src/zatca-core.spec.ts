import {
  buildZatcaInvoicePayload,
  buildZatcaInvoiceXml,
  calculateInvoiceHash,
  generateEgsPrivateKeyPem,
  generateZatcaCsrPem,
  generateZatcaQrBase64,
  initialPreviousInvoiceHash,
  validateZatcaCsrInput,
  type ZatcaCsrInput,
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

  it("escapes XML-special characters in dynamic invoice fields", () => {
    const xml = buildZatcaInvoiceXml({
      ...input,
      invoiceNumber: "INV-&<>\"'",
      seller: { ...input.seller, name: "Seller & Sons <Riyadh> \"VAT\"" },
      buyer: { ...input.buyer, name: "Buyer 'Test' & Co" },
      lines: [{ ...input.lines[0]!, description: "Service & setup <phase> \"A\" 'B'", taxRateName: "VAT & Sales" }],
    });

    expect(xml).toContain("INV-&amp;&lt;&gt;&quot;&apos;");
    expect(xml).toContain("Seller &amp; Sons &lt;Riyadh&gt; &quot;VAT&quot;");
    expect(xml).toContain("Buyer &apos;Test&apos; &amp; Co");
    expect(xml).toContain("Service &amp; setup &lt;phase&gt; &quot;A&quot; &apos;B&apos;");
    expect(xml).toContain("VAT &amp; Sales");
    expect(xml).not.toContain("<phase>");
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

  it("uses UTF-8 byte lengths for Unicode TLV QR seller names", () => {
    const sellerName = "شركة ليدجر بايت";
    const qr = generateZatcaQrBase64({
      sellerName,
      vatNumber: input.seller.vatNumber,
      timestamp: input.issueDate,
      invoiceTotal: input.total,
      vatTotal: input.taxTotal,
    });
    const decoded = Buffer.from(qr, "base64");
    const expectedSellerBytes = Buffer.from(sellerName, "utf8");
    const sellerLength = decoded[1] ?? -1;

    expect(decoded[0]).toBe(1);
    expect(sellerLength).toBe(expectedSellerBytes.byteLength);
    expect(sellerLength).toBeGreaterThan(sellerName.length);
    expect(decoded.subarray(2, 2 + sellerLength).toString("utf8")).toBe(sellerName);
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

describe("zatca-core CSR helpers", () => {
  const csrInput: ZatcaCsrInput = {
    sellerName: "LedgerByte Smoke Seller",
    vatNumber: "300000000000003",
    organizationIdentifier: "300000000000003",
    organizationUnitName: "Main Branch",
    organizationName: "LedgerByte Smoke Seller",
    countryCode: "SA",
    city: "Riyadh",
    deviceSerialNumber: "SMOKE-EGS-001",
    solutionName: "LedgerByte",
    businessCategory: "Accounting software",
  };

  it("generates PEM private keys and CSR PEM values", () => {
    const privateKeyPem = generateEgsPrivateKeyPem();
    const result = generateZatcaCsrPem(csrInput);

    expect(privateKeyPem).toContain("BEGIN RSA PRIVATE KEY");
    expect(result.privateKeyPem).toContain("BEGIN RSA PRIVATE KEY");
    expect(result.csrPem).toContain("BEGIN CERTIFICATE REQUEST");
    expect(result.csrPem).not.toContain("BEGIN RSA PRIVATE KEY");
  });

  it("validates required CSR fields", () => {
    expect(() => validateZatcaCsrInput({ ...csrInput, vatNumber: "" })).toThrow("vatNumber");
    expect(() => validateZatcaCsrInput({ ...csrInput, deviceSerialNumber: "" })).toThrow("deviceSerialNumber");
    expect(() => validateZatcaCsrInput({ ...csrInput, countryCode: "AE" })).toThrow("countryCode must be SA");
  });
});
