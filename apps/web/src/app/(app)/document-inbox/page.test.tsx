import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DocumentInboxPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("DocumentInboxPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/document-inbox" && options?.method !== "POST") {
        return Promise.resolve([documentInboxFixture()]);
      }
      if (path === "/document-inbox/item-1/extract") {
        return Promise.resolve({
          ...documentInboxFixture({
            status: "EXTRACTION_DISABLED",
            reviewRequired: true,
            providerConfigured: false,
            extractionResults: [
              {
                id: "extraction-1",
                provider: "NONE",
                status: "SKIPPED_DISABLED",
                confidence: null,
                blockers: ["Document extraction provider is not configured. Review required."],
                createdAt: "2026-07-08T10:00:00.000Z",
              },
            ],
          }),
        });
      }
      if (path === "/document-inbox/item-1/review") {
        return Promise.resolve(documentInboxFixture({ status: "REVIEWED" }));
      }
      if (path === "/document-inbox/item-1") {
        return Promise.resolve({
          ...documentInboxFixture({ status: "REVIEWED" }),
          reviewDecisions: [
            {
              id: "decision-1",
              decisionType: "CREATE_DRAFT_PURCHASE_BILL",
              targetType: "PurchaseBill",
              reviewerNote: "Looks correct",
              reviewedAt: "2026-07-08T10:03:00.000Z",
            },
          ],
        });
      }
      if (path === "/document-inbox" && options?.method === "POST") {
        return Promise.resolve(documentInboxFixture({ id: "item-2", title: "New receipt", attachmentId: "attachment-2" }));
      }
      return Promise.resolve({});
    });
  });

  it("renders split document review with provider-disabled review wording", async () => {
    render(<DocumentInboxPage />);

    expect(await screen.findByRole("heading", { name: "Document inbox" })).toBeInTheDocument();
    expect(screen.getByText(/OCR is beta readiness and disabled/i)).toBeInTheDocument();
    expect(screen.getByText("Review queue")).toBeInTheDocument();
    expect(screen.getByText("Attachment preview")).toBeInTheDocument();
    expect(screen.getByText("Provider not configured")).toBeInTheDocument();
    expect(screen.getAllByText(/Review required before posting/i).length).toBeGreaterThanOrEqual(1);
  });

  it("runs disabled extraction and records a draft-target review decision", async () => {
    render(<DocumentInboxPage />);

    expect((await screen.findAllByText("Office receipt")).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: "Run extraction" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/document-inbox/item-1/extract", { method: "POST", body: {} }));
    expect(await screen.findByText(/Provider not configured. Review required/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Draft bill target" }));
    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("/document-inbox/item-1/review", {
        method: "POST",
        body: { decisionType: "CREATE_DRAFT_PURCHASE_BILL", reviewerNote: "" },
      }),
    );
    expect(await screen.findByText(/Review decision recorded for draft PurchaseBill/i)).toBeInTheDocument();
  });
});

function documentInboxFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...baseDocumentInboxFixture(),
    ...overrides,
  };
}

function baseDocumentInboxFixture(): Record<string, unknown> {
  return {
    id: "item-1",
    attachmentId: "attachment-1",
    sourceType: "RECEIPT",
    status: "REVIEW_REQUIRED",
    title: "Office receipt",
    supplierName: "Stationery LLC",
    documentDate: "2026-07-07T00:00:00.000Z",
    currency: "AED",
    totalAmount: "126.00",
    taxAmount: "6.00",
    notes: null,
    createdAt: "2026-07-08T09:00:00.000Z",
    reviewedAt: null,
    reviewRequired: true,
    provider: "NONE",
    providerConfigured: false,
    conservativeCopy: "Extraction is beta readiness only. Review required before posting.",
    attachment: {
      filename: "attachment-1.pdf",
      originalFilename: "receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    },
    extractionResults: [],
    reviewDecisions: [],
  };
}
