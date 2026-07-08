import { BadRequestException, ForbiddenException, StreamableFile } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ReportsController } from "./reports.controller";

describe("ReportsController exports", () => {
  const service = {
    coreReport: jest.fn().mockResolvedValue({ ok: true }),
    coreReportCsvFile: jest.fn().mockResolvedValue({ filename: "report.csv", content: "Title\r\n" }),
    coreReportPdf: jest.fn().mockResolvedValue({ filename: "report.pdf", buffer: Buffer.from("%PDF-1.7\n") }),
    advancedReport: jest.fn().mockResolvedValue({ ok: true }),
    advancedReportCsvFile: jest.fn().mockResolvedValue({ filename: "advanced-report.csv", content: "Advanced Report\r\n" }),
    vatReturn: jest.fn().mockResolvedValue({ outputVat: "15.0000", inputVat: "0.0000", netVatPayable: "15.0000" }),
    vatReturnCsvFile: jest.fn().mockResolvedValue({ filename: "vat-return-draft-review.csv", content: "Draft VAT Return Review Export\r\n" }),
    dashboardSummary: jest.fn().mockResolvedValue({ receivables: { total: "150.0000" }, revenue: { currentPeriod: "120.0000" } }),
    reportPackManifestPreview: jest.fn().mockReturnValue({
      id: "report-pack-manifest-preview",
      status: "PLANNING_ONLY",
      items: [{ reportKind: "cash-flow" }],
    }),
    cashFlow: jest.fn().mockResolvedValue({ totals: { netCashFlow: "110.0000" } }),
    revenueTrend: jest.fn().mockResolvedValue({ rows: [{ period: "2026-01", revenue: "120.0000" }] }),
    topCustomers: jest.fn().mockResolvedValue({ basis: "FINALIZED_SALES_INVOICES", rows: [] }),
    topProductsServices: jest.fn().mockResolvedValue({ basis: "FINALIZED_SALES_INVOICE_LINES", rows: [] }),
  };
  const controller = new ReportsController(service as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function response() {
    return { set: jest.fn() };
  }

  function request(permissions: string[] = [PERMISSIONS.reports.export]) {
    return { membership: { role: { permissions } } };
  }

  it("requires reports.view for report routes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ReportsController)).toEqual([PERMISSIONS.reports.view]);
  });

  it.each([
    ["general ledger", "general-ledger", (res: any) => controller.generalLedger("org-1", { format: "csv" }, request() as never, res as never)],
    ["trial balance", "trial-balance", (res: any) => controller.trialBalance("org-1", { format: "csv" }, request() as never, res as never)],
    ["profit and loss", "profit-and-loss", (res: any) => controller.profitAndLoss("org-1", { format: "csv" }, request() as never, res as never)],
    ["balance sheet", "balance-sheet", (res: any) => controller.balanceSheet("org-1", { format: "csv" }, request() as never, res as never)],
    ["VAT summary", "vat-summary", (res: any) => controller.vatSummary("org-1", { format: "csv" }, request() as never, res as never)],
    ["aged receivables", "aged-receivables", (res: any) => controller.agedReceivables("org-1", { format: "csv" }, request() as never, res as never)],
    ["aged payables", "aged-payables", (res: any) => controller.agedPayables("org-1", { format: "csv" }, request() as never, res as never)],
  ])("%s CSV endpoint returns text/csv", async (_label, kind, callEndpoint) => {
    const res = response();

    const result = await callEndpoint(res);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(service.coreReportCsvFile).toHaveBeenCalledWith("org-1", kind, { format: "csv" });
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "text/csv; charset=utf-8" }));
  });

  it("returns application/pdf from PDF endpoints", async () => {
    const res = response();

    const result = await controller.trialBalancePdf("org-1", { id: "user-1" } as never, {}, request() as never, res as never);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(service.coreReportPdf).toHaveBeenCalledWith("org-1", "user-1", "trial-balance", {});
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "application/pdf" }));
  });

  it("routes VAT return requests to the document-source report engine", async () => {
    const result = await controller.vatReturn("org-1", { from: "2026-01-01", to: "2026-01-31" }, request() as never, response() as never);

    expect(result).toMatchObject({ outputVat: "15.0000", inputVat: "0.0000", netVatPayable: "15.0000" });
    expect(service.vatReturn).toHaveBeenCalledWith("org-1", { from: "2026-01-01", to: "2026-01-31" });
  });

  it("exports VAT return review CSV without implying a filing submission endpoint", async () => {
    const res = response();

    const result = await controller.vatReturn("org-1", { from: "2026-01-01", to: "2026-01-31", format: "csv" }, request() as never, res as never);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(service.vatReturnCsvFile).toHaveBeenCalledWith("org-1", { from: "2026-01-01", to: "2026-01-31", format: "csv" });
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "text/csv; charset=utf-8" }));
  });

  it("routes financial dashboard summary requests to the reports summary engine", async () => {
    const result = await controller.dashboardSummary("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(result).toMatchObject({ receivables: { total: "150.0000" }, revenue: { currentPeriod: "120.0000" } });
    expect(service.dashboardSummary).toHaveBeenCalledWith("org-1", { from: "2026-01-01", to: "2026-01-31" });
  });

  it("routes report-pack manifest preview requests to the read-only preview service", () => {
    const result = controller.reportPackManifestPreview("org-1", { id: "user-1" } as never, {
      reportKinds: "cash-flow,revenue-trend",
    });

    expect(result).toMatchObject({ status: "PLANNING_ONLY", items: [{ reportKind: "cash-flow" }] });
    expect(service.reportPackManifestPreview).toHaveBeenCalledWith("org-1", "user-1", {
      reportKinds: "cash-flow,revenue-trend",
    });
    expect(service.coreReportCsvFile).not.toHaveBeenCalled();
    expect(service.coreReportPdf).not.toHaveBeenCalled();
  });

  it("routes cash flow requests to the journal-line report engine", async () => {
    const result = await controller.cashFlow("org-1", { from: "2026-01-01", to: "2026-01-31" }, request() as never, response() as never);

    expect(result).toMatchObject({ ok: true });
    expect(service.advancedReport).toHaveBeenCalledWith("org-1", "cash-flow", { from: "2026-01-01", to: "2026-01-31" });
  });

  it("routes revenue trend requests to the journal-line report engine", async () => {
    const result = await controller.revenueTrend("org-1", { from: "2026-01-01", to: "2026-01-31" }, request() as never, response() as never);

    expect(result).toMatchObject({ ok: true });
    expect(service.advancedReport).toHaveBeenCalledWith("org-1", "revenue-trend", { from: "2026-01-01", to: "2026-01-31" });
  });

  it("routes top customers requests to the finalized-invoice report engine", async () => {
    const result = await controller.topCustomers("org-1", { from: "2026-01-01", to: "2026-01-31", limit: "5" }, request() as never, response() as never);

    expect(result).toMatchObject({ ok: true });
    expect(service.advancedReport).toHaveBeenCalledWith("org-1", "top-customers", { from: "2026-01-01", to: "2026-01-31", limit: "5" });
    expect(service.coreReportCsvFile).not.toHaveBeenCalledWith("org-1", "top-customers", expect.anything());
  });

  it("routes top products and services requests to the finalized-invoice-line report engine", async () => {
    const result = await controller.topProductsServices("org-1", { from: "2026-01-01", to: "2026-01-31", limit: "5" }, request() as never, response() as never);

    expect(result).toMatchObject({ ok: true });
    expect(service.advancedReport).toHaveBeenCalledWith("org-1", "top-products-services", { from: "2026-01-01", to: "2026-01-31", limit: "5" });
    expect(service.coreReportCsvFile).not.toHaveBeenCalledWith("org-1", "top-products-services", expect.anything());
  });

  it.each([
    ["cash flow", "json", () => controller.cashFlow("org-1", { format: "json" }, request() as never, response() as never)],
    ["cash flow", "JSON", () => controller.cashFlow("org-1", { format: "JSON" }, request() as never, response() as never)],
    ["cash flow", "JsOn", () => controller.cashFlow("org-1", { format: "JsOn" }, request() as never, response() as never)],
    ["revenue trend", "json", () => controller.revenueTrend("org-1", { format: "json" }, request() as never, response() as never)],
    ["revenue trend", "JSON", () => controller.revenueTrend("org-1", { format: "JSON" }, request() as never, response() as never)],
    ["top customers", "json", () => controller.topCustomers("org-1", { format: "json" }, request() as never, response() as never)],
    ["top customers", "JSON", () => controller.topCustomers("org-1", { format: "JSON" }, request() as never, response() as never)],
    ["top products and services", "json", () => controller.topProductsServices("org-1", { format: "json" }, request() as never, response() as never)],
    ["top products and services", "JSON", () => controller.topProductsServices("org-1", { format: "JSON" }, request() as never, response() as never)],
  ])("keeps explicit %s %s requests on the JSON advanced report path", async (_label, _format, callEndpoint) => {
    await expect(callEndpoint()).resolves.toEqual(expect.any(Object));

    expect(service.advancedReport).toHaveBeenCalled();
    expect(service.coreReportCsvFile).not.toHaveBeenCalled();
    expect(service.coreReportPdf).not.toHaveBeenCalled();
  });

  it.each([
    ["cash flow", "cash-flow", (res: any) => controller.cashFlow("org-1", { format: "csv" }, request() as never, res as never)],
    ["revenue trend", "revenue-trend", (res: any) => controller.revenueTrend("org-1", { format: "csv" }, request() as never, res as never)],
    ["top customers", "top-customers", (res: any) => controller.topCustomers("org-1", { format: "csv" }, request() as never, res as never)],
    ["top products and services", "top-products-services", (res: any) => controller.topProductsServices("org-1", { format: "csv" }, request() as never, res as never)],
  ])("exports %s CSV through the advanced report CSV path", async (_label, kind, callEndpoint) => {
    const res = response();

    const result = await callEndpoint(res);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(service.advancedReportCsvFile).toHaveBeenCalledWith("org-1", kind, { format: "csv" });
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ "Content-Type": "text/csv; charset=utf-8" }));
  });

  it.each([
    ["cash flow", "pdf", () => controller.cashFlow("org-1", { format: "pdf" }, request() as never, response() as never)],
    ["revenue trend", "pdf", () => controller.revenueTrend("org-1", { format: "pdf" }, request() as never, response() as never)],
    ["top customers", "pdf", () => controller.topCustomers("org-1", { format: "pdf" }, request() as never, response() as never)],
    ["top products and services", "pdf", () => controller.topProductsServices("org-1", { format: "pdf" }, request() as never, response() as never)],
  ])("rejects unsupported %s %s export requests before report generation", async (_label, format, callEndpoint) => {
    await expect(callEndpoint()).rejects.toThrow(BadRequestException);
    await expect(callEndpoint()).rejects.toThrow(new RegExp(`${format.toUpperCase()} export is not implemented`, "i"));

    expect(service.advancedReport).not.toHaveBeenCalled();
    expect(service.advancedReportCsvFile).not.toHaveBeenCalled();
    expect(service.coreReportCsvFile).not.toHaveBeenCalled();
    expect(service.coreReportPdf).not.toHaveBeenCalled();
  });

  it("allows generated document download permission to export reports", async () => {
    const res = response();

    await controller.trialBalance("org-1", { format: "csv" }, request([PERMISSIONS.generatedDocuments.download]) as never, res as never);

    expect(service.coreReportCsvFile).toHaveBeenCalledWith("org-1", "trial-balance", { format: "csv" });
  });

  it("rejects exports without reports.export or generatedDocuments.download", async () => {
    const res = response();

    await expect(controller.trialBalance("org-1", { format: "csv" }, request([PERMISSIONS.reports.view]) as never, res as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(controller.cashFlow("org-1", { format: "csv" }, request([PERMISSIONS.reports.view]) as never, res as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
