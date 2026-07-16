import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CustomerDocumentEmailDelivery } from "./customer-document-email-delivery";

const apiRequestMock = jest.fn();

jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("CustomerDocumentEmailDelivery", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue([]);
  });

  it("uses the shared queue/history surface for a posted payment receipt", async () => {
    render(<CustomerDocumentEmailDelivery
      sourceId="payment-1"
      organizationId="org-1"
      canSend
      eligible
      sourceLabel="payment receipt"
      documentFilename="receipt-PAY-000001.pdf"
      recipientEmail="customer@example.test"
      defaultSubject="Payment receipt PAY-000001"
      defaultMessage="Please find the posted payment receipt attached for review."
      ineligibleMessage="Only posted customer payments can be queued for email delivery."
      noPermissionMessage="You do not have permission to send payment receipts by email."
      successMessage="Payment receipt queued for email delivery."
      emptyHistoryMessage="No payment receipt email deliveries queued yet."
      endpoint="/customer-payments/payment-1/email-deliveries"
    />);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment-1/email-deliveries"));
    fireEvent.click(screen.getByRole("button", { name: "Send payment receipt" }));
    expect(screen.getByDisplayValue("Payment receipt PAY-000001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Queue payment receipt" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment-1/email-deliveries", expect.objectContaining({ method: "POST" })));
  });

  it("includes a supplier statement period in the queue request while keeping history on the same endpoint", async () => {
    render(<CustomerDocumentEmailDelivery
      sourceId="supplier-1"
      organizationId="org-1"
      canSend
      eligible
      sourceLabel="supplier statement"
      documentFilename="supplier-statement-Supplier-2026-07-01-to-2026-07-31.pdf"
      recipientEmail="supplier@example.test"
      defaultSubject="Supplier statement from Example Trading"
      defaultMessage="Please find your supplier statement attached."
      ineligibleMessage="A supplier contact and period are required."
      noPermissionMessage="You do not have permission to send supplier statements by email."
      successMessage="Supplier statement queued for email delivery."
      emptyHistoryMessage="No supplier statement deliveries queued yet."
      endpoint="/contacts/supplier-1/supplier-statement-email-deliveries"
      deliveryPeriod={{ from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" }}
    />);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/contacts/supplier-1/supplier-statement-email-deliveries"));
    fireEvent.click(screen.getByRole("button", { name: "Send supplier statement" }));
    fireEvent.click(screen.getByRole("button", { name: "Queue supplier statement" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/contacts/supplier-1/supplier-statement-email-deliveries",
      expect.objectContaining({ method: "POST", body: expect.objectContaining({ from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" }) }),
    ));
  });
});
