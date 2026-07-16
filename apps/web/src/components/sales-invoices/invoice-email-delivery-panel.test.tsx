import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { InvoiceEmailDeliveryPanel } from "./invoice-email-delivery-panel";
import type { SalesInvoice } from "@/lib/types";

const apiRequestMock = jest.fn();

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

function invoice(status: SalesInvoice["status"] = "FINALIZED"): SalesInvoice {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-00042",
    customerId: "customer-1",
    branchId: null,
    issueDate: "2026-07-16",
    dueDate: "2026-07-31",
    currency: "SAR",
    status,
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.00",
    discountTotal: "0.00",
    taxableTotal: "100.00",
    taxTotal: "15.00",
    total: "115.00",
    balanceDue: "115.00",
    notes: null,
    terms: null,
    finalizedAt: status === "FINALIZED" ? "2026-07-16T00:00:00.000Z" : null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Example Customer", displayName: "Example Customer", email: "customer@example.test" },
  };
}

describe("InvoiceEmailDeliveryPanel", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue([]);
  });

  it("shows the send action only for finalized invoices with permission", async () => {
    const { rerender } = render(<InvoiceEmailDeliveryPanel invoice={invoice()} organizationId="org-1" canSend />);
    await waitFor(() => expect(screen.queryByText("Loading delivery history...")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Send invoice" })).toBeInTheDocument();
    rerender(<InvoiceEmailDeliveryPanel invoice={invoice("DRAFT")} organizationId="org-1" canSend />);
    expect(screen.queryByRole("button", { name: "Send invoice" })).not.toBeInTheDocument();
    expect(screen.getByText(/Only finalized invoices/)).toBeInTheDocument();
    rerender(<InvoiceEmailDeliveryPanel invoice={invoice()} organizationId="org-1" canSend={false} />);
    expect(screen.queryByRole("button", { name: "Send invoice" })).not.toBeInTheDocument();
  });

  it("prefills the form, preserves the idempotency key on retry, and uses queued copy", async () => {
    const queued = { id: "delivery-1", status: "QUEUED", userFacingStatus: "Queued", maskedRecipient: "c***@example.test" };
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue([]);
    let postCount = 0;
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: Record<string, string> }) => {
      if (options?.method === "POST") {
        postCount += 1;
        if (postCount === 1) return Promise.reject(new Error("temporary failure"));
        return Promise.resolve(queued);
      }
      return Promise.resolve([]);
    });

    render(<InvoiceEmailDeliveryPanel invoice={invoice()} organizationId="org-1" canSend />);
    await waitFor(() => expect(screen.queryByText("Loading delivery history...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Send invoice" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByDisplayValue("customer@example.test")).toHaveValue("customer@example.test");
    expect(dialog.getByDisplayValue("Invoice INV-00042")).toHaveValue("Invoice INV-00042");
    const submit = screen.getByRole("button", { name: "Queue invoice" });
    fireEvent.click(submit);
    await screen.findByRole("alert");
    const firstBody = apiRequestMock.mock.calls.find((call) => call[1]?.method === "POST")?.[1]?.body;
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Invoice queued for email delivery."));
    const postBodies = apiRequestMock.mock.calls.filter((call) => call[1]?.method === "POST").map((call) => call[1].body);
    expect(postBodies[0]).toEqual(expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(postBodies[1]).toEqual(expect.objectContaining({ idempotencyKey: firstBody.idempotencyKey }));
    expect(screen.queryByText("Email sent.")).not.toBeInTheDocument();
  });

  it("renders safe history labels and requester metadata", async () => {
    apiRequestMock.mockResolvedValueOnce([{ id: "delivery-1", status: "SENT_MOCK", userFacingStatus: "Simulated locally", maskedRecipient: "c***@example.test", provider: "mock", attemptCount: 1, attachmentFilename: "invoice-INV-00042.pdf", requestedBy: { id: "user-1", name: "Accountant" }, safeError: null }]);
    render(<InvoiceEmailDeliveryPanel invoice={invoice()} organizationId="org-1" canSend={false} />);
    await waitFor(() => expect(screen.queryByText("Loading delivery history...")).not.toBeInTheDocument());
    expect((await screen.findAllByText("Simulated locally")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Accountant/)).toBeInTheDocument();
    expect(screen.getByText(/invoice-INV-00042\.pdf/)).toBeInTheDocument();
  });
});
