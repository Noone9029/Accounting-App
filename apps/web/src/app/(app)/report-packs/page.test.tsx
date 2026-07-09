import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import ReportPacksPage from "./page";
import type { ReportPackManifestPreview } from "@/lib/report-packs";

const fetchReportPackManifestPreviewMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/lib/report-packs", () => {
  const actual = jest.requireActual("@/lib/report-packs");
  return {
    ...actual,
    fetchReportPackManifestPreview: () => fetchReportPackManifestPreviewMock(),
  };
});

describe("ReportPacksPage", () => {
  beforeEach(() => {
    fetchReportPackManifestPreviewMock.mockReset();
    fetchReportPackManifestPreviewMock.mockResolvedValue(manifestPreview());
  });

  it("renders report-pack preview data from the API manifest", async () => {
    render(<ReportPacksPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading report-pack preview");
    expect(screen.getByText("Reading local manifest metadata only.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Report packs" })).toBeInTheDocument();
    expect(screen.getByText("Local groundwork")).toBeInTheDocument();
    expect(await screen.findByText("Planning only")).toBeInTheDocument();
    expect(screen.getByText("General Ledger")).toBeInTheDocument();
    expect(screen.getByText("Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("general-ledger")).toBeInTheDocument();
    expect(screen.getByText("cash-flow")).toBeInTheDocument();
    expect(screen.getByText("Pack download")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "CSV route" }).map((link) => link.getAttribute("href"))).toEqual([
      "/reports/general-ledger?format=csv",
      "/reports/cash-flow?format=csv",
    ]);
    expect(screen.getByRole("link", { name: "PDF route" })).toHaveAttribute("href", "/reports/general-ledger/pdf");
    expect(screen.getByText("PDF export is not implemented for this report.")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Ready for review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open reports" })).toHaveAttribute("href", "/reports");
    expect(screen.getAllByRole("link", { name: "View source report" }).map((link) => link.getAttribute("href"))).toEqual([
      "/reports/general-ledger",
      "/reports/cash-flow",
    ]);
    expect(screen.queryByText("Preview-only; no route linked")).not.toBeInTheDocument();
    expect(fetchReportPackManifestPreviewMock).toHaveBeenCalledTimes(1);
  });

  it("displays disabled execution boundaries from the manifest", async () => {
    render(<ReportPacksPage />);

    expect(await screen.findByRole("heading", { name: "Disabled capabilities" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pack artifact generation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Download and export" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Email sending" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scheduling" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Archive writes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Object storage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Provider calls" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Compliance submission" })).toBeInTheDocument();
    expect(screen.getAllByText("Disabled").length).toBeGreaterThanOrEqual(9);
    expect(screen.getByText(/Object storage and signed URL behavior remain blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/No ZATCA, UAE, Peppol, ASP, tax authority, or compliance submission is available/i)).toBeInTheDocument();
  });

  it("does not render mutation action buttons", async () => {
    const { container } = render(<ReportPacksPage />);

    await screen.findByText("General Ledger");

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /generate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /send/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /store/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /submit/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/generation enabled|download all pdfs/i);
  });

  it("renders a safe empty state", async () => {
    fetchReportPackManifestPreviewMock.mockResolvedValue(manifestPreview({ items: [] }));

    render(<ReportPacksPage />);

    expect(await screen.findByText("No report-pack items returned")).toBeInTheDocument();
    expect(screen.getByText("Nothing can be generated or exported from this state.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a safe error state", async () => {
    fetchReportPackManifestPreviewMock.mockRejectedValue(new Error("Preview service unavailable"));

    render(<ReportPacksPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Report-pack preview is unavailable");
    expect(alert).toHaveTextContent("Preview service unavailable");
    expect(alert).toHaveTextContent("No report-pack action is available while the preview cannot be loaded.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not use browser durable persistence directly", async () => {
    const localGet = jest.spyOn(Storage.prototype, "getItem");
    const localSet = jest.spyOn(Storage.prototype, "setItem");
    const sessionSet = jest.spyOn(window.sessionStorage, "setItem");
    const cookieSet = jest.spyOn(document, "cookie", "set");

    render(<ReportPacksPage />);

    await waitFor(() => expect(fetchReportPackManifestPreviewMock).toHaveBeenCalledTimes(1));

    expect(localGet).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(sessionSet).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();

    localGet.mockRestore();
    localSet.mockRestore();
    sessionSet.mockRestore();
    cookieSet.mockRestore();
  });
});

function manifestPreview(overrides: Partial<ReportPackManifestPreview> = {}): ReportPackManifestPreview {
  return {
    id: "report-pack-manifest-preview",
    organizationId: "org-1",
    title: "Report pack manifest preview",
    createdAt: "2026-06-21T00:00:00.000Z",
    generatedAt: null,
    requestedByUserId: "user-1",
    requestId: "req-1",
    status: "PLANNING_ONLY",
    downloadReadiness: {
      packDownloadEnabled: false,
      storageProvider: "disabled",
      signedUrlEnabled: false,
      reason: "Pack-level download is blocked until local storage/archive and signed URL proof are approved.",
    },
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
        exports: {
          csv: { supported: true, href: "/reports/general-ledger?format=csv", filename: "general-ledger.csv" },
          pdf: { supported: true, href: "/reports/general-ledger/pdf", reason: null },
        },
        reviewStatus: "NEEDS_REVIEW",
      },
      {
        id: "preview-cash-flow",
        reportKind: "cash-flow",
        title: "Cash Flow",
        query: {},
        source: { type: "ledgerbyte-report-route", href: "/reports/cash-flow" },
        exports: {
          csv: { supported: true, href: "/reports/cash-flow?format=csv", filename: "cash-flow.csv" },
          pdf: { supported: false, href: null, reason: "PDF export is not implemented for this report." },
        },
        reviewStatus: "READY_FOR_REVIEW",
      },
    ],
    ...overrides,
  };
}
