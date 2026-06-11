import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { GeneratedDocumentApEmailAction, GeneratedDocumentDownloadAction } from "./page";
import type { GeneratedDocument } from "@/lib/types";

describe("generated document AP email action", () => {
  it("renders local mock no-send wording for eligible AP generated documents", () => {
    render(
      <GeneratedDocumentApEmailAction
        document={generatedDocumentFixture()}
        visible
        recipientEmail=""
        loading={false}
        onRecipientChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Create local email outbox" })).toBeInTheDocument();
    expect(screen.getByText(/Local mock outbox only/)).toBeInTheDocument();
    expect(screen.getByText(/No real email or provider send/)).toBeInTheDocument();
    expect(screen.getByText(/PDF body is not shown/)).toBeInTheDocument();
    expect(screen.queryByText(/base64/i)).not.toBeInTheDocument();
  });

  it("submits only the explicit recipient email", () => {
    const onSubmit = jest.fn();

    render(
      <GeneratedDocumentApEmailAction
        document={generatedDocumentFixture()}
        visible
        recipientEmail="ap-review@example.test"
        loading={false}
        onRecipientChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(screen.getByRole("button", { name: "Create local email outbox" }).closest("form")!);

    expect(onSubmit).toHaveBeenCalledWith("ap-review@example.test");
    expect(JSON.stringify(onSubmit.mock.calls)).not.toMatch(/contentBase64|bodyText|bodyHtml|attachmentBody|pdf/i);
  });

  it("hides the action for restricted or unsupported rows", () => {
    render(
      <GeneratedDocumentApEmailAction
        document={generatedDocumentFixture()}
        visible={false}
        recipientEmail=""
        loading={false}
        onRecipientChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Create local email outbox" })).not.toBeInTheDocument();
  });
});

describe("generated document download action", () => {
  it("renders the archived download button for generated rows", () => {
    render(<GeneratedDocumentDownloadAction document={generatedDocumentFixture()} loading={false} onDownload={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Download archived PDF" })).toBeInTheDocument();
  });

  it("blocks failed rows from showing a misleading archive download action", () => {
    render(<GeneratedDocumentDownloadAction document={generatedDocumentFixture({ status: "FAILED" })} loading={false} onDownload={jest.fn()} />);

    expect(screen.getByText("PDF unavailable until generation succeeds")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download archived PDF" })).not.toBeInTheDocument();
  });
});

function generatedDocumentFixture(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
  return {
    id: "generated-document-1",
    organizationId: "org-1",
    documentType: "PURCHASE_BILL",
    sourceType: "PurchaseBill",
    sourceId: "bill-1",
    documentNumber: "BILL-001",
    filename: "purchase-bill-BILL-001.pdf",
    mimeType: "application/pdf",
    storageProvider: "database",
    storageKey: null,
    contentHash: "hash-value",
    sizeBytes: 3417,
    status: "GENERATED",
    generatedById: "user-1",
    generatedAt: "2026-05-29T00:00:00.000Z",
    createdAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}
