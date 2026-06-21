import {
  REPORT_PACK_MANIFEST_PREVIEW_PATH,
  disabledReportPackBoundaryItems,
  fetchReportPackManifestPreview,
  isReportPackSourceNavigable,
  reportPackReviewStatusLabel,
  type ReportPackManifestPreview,
} from "./report-packs";

const apiRequestMock = jest.fn();

jest.mock("./api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("report-pack preview helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("fetches the report-pack manifest preview endpoint", async () => {
    apiRequestMock.mockResolvedValue(manifestPreview());

    await expect(fetchReportPackManifestPreview()).resolves.toMatchObject({
      title: "Report pack manifest preview",
      status: "PLANNING_ONLY",
      items: [expect.objectContaining({ reportKind: "general-ledger" })],
      executionBoundary: expect.objectContaining({
        generationEnabled: false,
        downloadEnabled: false,
        emailSendingEnabled: false,
        archiveWriteEnabled: false,
        storageMutationEnabled: false,
        providerCallEnabled: false,
        complianceSubmissionEnabled: false,
      }),
    });
    expect(apiRequestMock).toHaveBeenCalledWith(REPORT_PACK_MANIFEST_PREVIEW_PATH);
  });

  it("normalizes an empty default response without enabling capabilities", async () => {
    apiRequestMock.mockResolvedValue({});

    await expect(fetchReportPackManifestPreview()).resolves.toEqual({
      id: "report-pack-manifest-preview",
      organizationId: "",
      title: "Report pack manifest preview",
      createdAt: "",
      requestedByUserId: "",
      status: "PLANNING_ONLY",
      items: [],
      executionBoundary: {
        generationEnabled: false,
        downloadEnabled: false,
        emailSendingEnabled: false,
        scheduledRunEnabled: false,
        archiveWriteEnabled: false,
        generatedDocumentMutationEnabled: false,
        storageMutationEnabled: false,
        providerCallEnabled: false,
        complianceSubmissionEnabled: false,
      },
    });
  });

  it("propagates API failures for the page error state", async () => {
    apiRequestMock.mockRejectedValue(new Error("preview unavailable"));

    await expect(fetchReportPackManifestPreview()).rejects.toThrow("preview unavailable");
  });

  it("surfaces disabled capability metadata", () => {
    const disabledItems = disabledReportPackBoundaryItems(manifestPreview().executionBoundary);

    expect(disabledItems.map((item) => item.label)).toEqual([
      "Generation",
      "Download and export",
      "Email sending",
      "Scheduling",
      "Archive writes",
      "Generated documents",
      "Object storage",
      "Provider calls",
      "Compliance submission",
    ]);
    expect(disabledItems.map((item) => item.explanation).join(" ")).toMatch(/not implemented|remain unavailable|not send email/i);
  });

  it("only treats existing web report routes as navigable", () => {
    expect(isReportPackSourceNavigable(manifestPreview().items[0]!)).toBe(true);
    expect(
      isReportPackSourceNavigable({
        source: { type: "ledgerbyte-report-route", href: "/reports/cash-flow" },
      }),
    ).toBe(false);
  });

  it("labels review statuses", () => {
    expect(reportPackReviewStatusLabel("NEEDS_REVIEW")).toBe("Needs review");
    expect(reportPackReviewStatusLabel("READY_FOR_REVIEW")).toBe("Ready for review");
    expect(reportPackReviewStatusLabel("BLOCKED")).toBe("Blocked");
  });

  it("does not use browser durable persistence directly", async () => {
    apiRequestMock.mockResolvedValue(manifestPreview());
    const localGet = jest.spyOn(Storage.prototype, "getItem");
    const localSet = jest.spyOn(Storage.prototype, "setItem");
    const sessionGet = jest.spyOn(window.sessionStorage, "getItem");
    const cookieSet = jest.spyOn(document, "cookie", "set");

    await fetchReportPackManifestPreview();

    expect(localGet).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(sessionGet).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();

    localGet.mockRestore();
    localSet.mockRestore();
    sessionGet.mockRestore();
    cookieSet.mockRestore();
  });
});

function manifestPreview(): ReportPackManifestPreview {
  return {
    id: "report-pack-manifest-preview",
    organizationId: "org-1",
    title: "Report pack manifest preview",
    createdAt: "2026-06-21T00:00:00.000Z",
    requestedByUserId: "user-1",
    status: "PLANNING_ONLY",
    executionBoundary: {
      generationEnabled: false,
      downloadEnabled: false,
      emailSendingEnabled: false,
      scheduledRunEnabled: false,
      archiveWriteEnabled: false,
      generatedDocumentMutationEnabled: false,
      storageMutationEnabled: false,
      providerCallEnabled: false,
      complianceSubmissionEnabled: false,
    },
    items: [
      {
        id: "preview-general-ledger",
        reportKind: "general-ledger",
        title: "General Ledger",
        query: {},
        source: { type: "ledgerbyte-report-route", href: "/reports/general-ledger" },
        reviewStatus: "NEEDS_REVIEW",
      },
    ],
  };
}
