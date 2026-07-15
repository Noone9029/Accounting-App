import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { Attachment } from "@/lib/types";
import { AttachmentPanel } from "./attachment-panel";

const apiRequestMock = jest.fn();
const canMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/sales/invoices/invoice-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ can: (permission: string) => canMock(permission) }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("AttachmentPanel", () => {
  beforeEach(() => {
    canMock.mockReturnValue(true);
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/attachments" && !options) return Promise.resolve([attachment()]);
      if (path === "/attachments/attachment-1" && options?.method === "DELETE") return Promise.resolve(attachment());
      return Promise.resolve([attachment()]);
    });
  });

  it("uses an in-app confirmation dialog for attachment deletion", async () => {
    render(
      <AppLocaleProvider initialLocale="en">
        <AttachmentPanel linkedEntityType="SALES_INVOICE" linkedEntityId="invoice-1" />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete attachment report.pdf?")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/attachments/attachment-1", { method: "DELETE" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/attachments/attachment-1", { method: "DELETE" });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/attachments/attachment-1", { method: "DELETE" });
    });
  });
});

function attachment(): Attachment {
  return {
    id: "attachment-1",
    organizationId: "org-1",
    linkedEntityType: "SALES_INVOICE",
    linkedEntityId: "invoice-1",
    filename: "report.pdf",
    originalFilename: "report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    storageProvider: "DATABASE",
    storageKey: null,
    contentHash: "abcdef1234567890",
    status: "ACTIVE",
    uploadedById: "user-1",
    uploadedAt: "2026-07-14T00:00:00.000Z",
    deletedById: null,
    deletedAt: null,
    notes: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
    uploadedBy: { id: "user-1", name: "A User", email: "user@example.com" },
  };
}
