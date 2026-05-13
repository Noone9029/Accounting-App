import { ForbiddenException, StreamableFile } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ReportsController } from "./reports.controller";

describe("ReportsController exports", () => {
  const service = {
    coreReport: jest.fn().mockResolvedValue({ ok: true }),
    coreReportCsvFile: jest.fn().mockResolvedValue({ filename: "report.csv", content: "Title\r\n" }),
    coreReportPdf: jest.fn().mockResolvedValue({ filename: "report.pdf", buffer: Buffer.from("%PDF-1.7\n") }),
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
  });
});
