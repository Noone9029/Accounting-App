import { ForbiddenException } from "@nestjs/common";
import { BillingAccessInterceptor } from "./billing-access.interceptor";

describe("HTTP subscription access", () => {
  const run = async (accessMode: string, method: string, path: string) => {
    const billing = { enforcementMode: () => "ENFORCE", organizationAccessMode: jest.fn().mockResolvedValue({ accessMode }) };
    const next = { handle: jest.fn().mockReturnValue("allowed") };
    const context = { switchToHttp: () => ({ getRequest: () => ({ user: { id: "user-1" }, organizationId: "org-1", method, path }) }), getClass: () => ({ name: "ReportsController" }) };
    return new BillingAccessInterceptor(billing as never).intercept(context as never, next as never);
  };
  it.each(["/contacts", "/sales-invoices/1/finalize", "/purchase-bills", "/inventory/movements"])("denies accounting writes after deadline: %s", async (path) => {
    await expect(run("READ_ONLY", "POST", path)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(["/reports/report-pack", "/reports/report-pack/1/download-readiness", "/sales-invoices/1/generate-pdf", "/contacts/1/generate-statement-pdf", "/customer-payments/1/generate-receipt-pdf"])("retains explicit read/export POST %s", async (path) => {
    await expect(run("READ_ONLY", "POST", path)).resolves.toBe("allowed");
  });
  it("retains report reads and billing recovery but denies a tenant without enrollment", async () => {
    await expect(run("READ_ONLY", "GET", "/reports/trial-balance/pdf")).resolves.toBe("allowed");
    await expect(run("BILLING_ONLY", "POST", "/billing/trial")).resolves.toBe("allowed");
    await expect(run("BILLING_ONLY", "POST", "/contacts")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(run("BILLING_ONLY", "GET", "/reports/trial-balance")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
