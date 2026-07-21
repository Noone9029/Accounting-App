import { PERMISSIONS } from "@ledgerbyte/shared";
import { DataManagementService, buildExportManifest } from "./data-management.service";

describe("DataManagementService", () => {
  it("builds a plan-only export manifest with explicit blocked actions", () => {
    const manifest = buildExportManifest("org-1", {
      organizationProfile: 1,
      accounts: 12,
      contacts: 30,
      items: 18,
      taxRates: 4,
      numberSequences: 7,
      generatedDocuments: 9,
      auditLogs: 45,
    });

    expect(manifest).toMatchObject({
      organizationId: "org-1",
      status: "PLAN_ONLY",
      mode: "METADATA_MANIFEST_ONLY",
      exportNotStarted: true,
    });
    expect(manifest.scopes.map((scope) => scope.key)).toEqual([
      "organizationProfile",
      "accounts",
      "contacts",
      "items",
      "taxRates",
      "numberSequences",
      "generatedDocuments",
      "auditLogs",
    ]);
    expect(manifest.scopes.find((scope) => scope.key === "accounts")).toMatchObject({
      recordCount: 12,
      permission: PERMISSIONS.accounts.view,
      exportFormat: "json",
      state: "PLANNED",
    });
    expect(manifest.scopes.find((scope) => scope.key === "generatedDocuments")?.excludes).toEqual(
      expect.arrayContaining(["PDF/base64 content", "object storage payloads"]),
    );
    expect(manifest.blockedActions).toEqual(
      expect.arrayContaining([
        { action: "downloadFullArchive", reason: "Full tenant archive download is not implemented in this planning slice." },
        { action: "importData", reason: "Import remains design-only until schema mapping, validation, and audit requirements are approved." },
      ]),
    );
    expect(manifest.notes.join(" ")).toContain("does not perform backup");
  });

  it("counts only active organization data needed for the export manifest", async () => {
    const prisma = {
      organization: { count: jest.fn().mockResolvedValue(1) },
      account: { count: jest.fn().mockResolvedValue(12) },
      contact: { count: jest.fn().mockResolvedValue(30) },
      item: { count: jest.fn().mockResolvedValue(18) },
      taxRate: { count: jest.fn().mockResolvedValue(4) },
      numberSequence: { count: jest.fn().mockResolvedValue(7) },
      generatedDocument: { count: jest.fn().mockResolvedValue(9) },
      auditLog: { count: jest.fn().mockResolvedValue(45) },
    };
    const service = new DataManagementService(prisma as never);

    await expect(service.exportManifest("org-1")).resolves.toMatchObject({
      organizationId: "org-1",
      status: "PLAN_ONLY",
      scopes: expect.arrayContaining([
        expect.objectContaining({ key: "organizationProfile", recordCount: 1 }),
        expect.objectContaining({ key: "auditLogs", recordCount: 45 }),
      ]),
    });

    expect(prisma.organization.count).toHaveBeenCalledWith({ where: { id: "org-1" } });
    expect(prisma.account.count).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(prisma.generatedDocument.count).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
  });
});
