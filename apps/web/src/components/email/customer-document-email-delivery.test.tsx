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
});
