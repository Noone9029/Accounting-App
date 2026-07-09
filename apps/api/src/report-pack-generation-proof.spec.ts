import { BadRequestException, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "./auth/decorators/require-permissions.decorator";
import { ReportsController } from "./reports/reports.controller";
import { REPORT_PACK_EXECUTION_BOUNDARY, REPORT_PACK_SUPPORTED_REPORTS } from "./reports/report-pack-manifest";
import { ReportsService } from "./reports/reports.service";

describe("report-pack generation proof: current safe boundary", () => {
  it("exposes only the conservative local report-pack readiness routes", () => {
    const routes = controllerRoutes(ReportsController).filter((route) => route.path.includes("report-pack"));

    expect(routes).toEqual([
      {
        handlerName: "reportPackManifestPreview",
        method: RequestMethod.GET,
        path: "reports/report-pack/manifest-preview",
      },
      {
        handlerName: "createReportPack",
        method: RequestMethod.POST,
        path: "reports/report-pack",
      },
      {
        handlerName: "listReportPacks",
        method: RequestMethod.GET,
        path: "reports/report-pack",
      },
      {
        handlerName: "getReportPack",
        method: RequestMethod.GET,
        path: "reports/report-pack/:id",
      },
      {
        handlerName: "reportPackDownloadReadiness",
        method: RequestMethod.POST,
        path: "reports/report-pack/:id/download-readiness",
      },
    ]);
    expect(routes.map((route) => route.path).join(" ")).not.toMatch(/runs|generate|artifacts|schedules|archive|email|export/i);
  });

  it("keeps the report-pack route behind the existing report view permission", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ReportsController)).toEqual([PERMISSIONS.reports.view]);
  });

  it("builds tenant-scoped planning manifests without reading report rows or writing artifacts", () => {
    const prisma = reportPackPrismaSentinel();
    const service = new ReportsService(prisma as never);

    const tenantAManifest = service.reportPackManifestPreview("tenant-a-org", "tenant-a-user", {
      reportKinds: "profit-and-loss,trial-balance,cash-flow",
    });
    const tenantBManifest = service.reportPackManifestPreview("tenant-b-org", "tenant-b-user", {
      reportKinds: "profit-and-loss",
    });

    expect(tenantAManifest).toMatchObject({
      id: "report-pack-manifest-preview",
      organizationId: "tenant-a-org",
      requestedByUserId: "tenant-a-user",
      status: "PLANNING_ONLY",
      executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
    });
    expect(tenantAManifest.items.map((item) => item.reportKind)).toEqual(["profit-and-loss", "trial-balance", "cash-flow"]);
    expect(JSON.stringify(tenantAManifest)).not.toContain("tenant-b-org");
    expect(JSON.stringify(tenantAManifest)).not.toContain("tenant-b-user");
    expect(JSON.stringify(tenantBManifest)).not.toContain("tenant-a-org");
    expect(JSON.stringify(tenantBManifest)).not.toContain("tenant-a-user");
    expectPrismaSentinelUnused(prisma);
  });

  it("keeps every generation, download, storage, provider, and compliance capability disabled", () => {
    const service = new ReportsService({} as never);

    const manifest = service.reportPackManifestPreview("org-1", "user-1", {});

    expect(manifest.items.map((item) => item.reportKind)).toEqual(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind));
    expect(manifest.executionBoundary).toEqual({
      generationEnabled: false,
      downloadEnabled: false,
      emailSendingEnabled: false,
      scheduledRunEnabled: false,
      archiveWriteEnabled: false,
      generatedDocumentMutationEnabled: false,
      storageMutationEnabled: false,
      providerCallEnabled: false,
      complianceSubmissionEnabled: false,
    });
  });

  it("rejects unsupported requested report kinds before any data access", () => {
    const prisma = reportPackPrismaSentinel();
    const service = new ReportsService(prisma as never);

    expect(() =>
      service.reportPackManifestPreview("org-1", "user-1", {
        reportKinds: "profit-and-loss,report-pack-download",
      }),
    ).toThrow(BadRequestException);
    expectPrismaSentinelUnused(prisma);
  });
});

function controllerRoutes(controller: Function) {
  const controllerPath = normalizePath(Reflect.getMetadata(PATH_METADATA, controller) ?? "");
  const prototype = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(prototype)
    .filter((propertyName) => propertyName !== "constructor")
    .flatMap((handlerName) => {
      const handler = prototype[handlerName];
      if (typeof handler !== "function") {
        return [];
      }
      const routePath = Reflect.getMetadata(PATH_METADATA, handler);
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (routePath === undefined || method === undefined) {
        return [];
      }
      return [
        {
          handlerName,
          method,
          path: [controllerPath, normalizePath(routePath)].filter(Boolean).join("/"),
        },
      ];
    });
}

function normalizePath(path: string | string[]): string {
  const value = Array.isArray(path) ? path.join("/") : path;
  return value.replace(/^\/+|\/+$/g, "");
}

function reportPackPrismaSentinel() {
  return {
    account: sentinelModel(),
    auditLog: sentinelModel(),
    generatedDocument: sentinelModel(),
    journalLine: sentinelModel(),
    purchaseBill: sentinelModel(),
    salesInvoice: sentinelModel(),
    salesInvoiceLine: sentinelModel(),
  };
}

function sentinelModel() {
  return {
    count: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
}

function expectPrismaSentinelUnused(prisma: ReturnType<typeof reportPackPrismaSentinel>): void {
  for (const model of Object.values(prisma)) {
    for (const operation of Object.values(model)) {
      expect(operation).not.toHaveBeenCalled();
    }
  }
}
