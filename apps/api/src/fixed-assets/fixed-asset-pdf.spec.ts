import { renderFixedAssetReportPdf } from "@ledgerbyte/pdf-core";

describe("fixed-asset report PDFs", () => {
  it("renders a bounded report as a PDF document", async () => {
    const pdf = await renderFixedAssetReportPdf({
      organization: { id: "org-1", name: "LedgerByte Test Organization" },
      currency: "USD",
      title: "Fixed Asset Register",
      generatedAt: "2026-07-15T00:00:00.000Z",
      reportRows: [["FA-000001", "Office equipment", "100.0000"]],
      columns: [
        { label: "Asset", width: 130 },
        { label: "Name", width: 230 },
        { label: "Carrying", width: 139, align: "right" },
      ],
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(100);
  });
});
