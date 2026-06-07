import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SalesInventoryReturnForm } from "./sales-inventory-return-form";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("SalesInventoryReturnForm", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: unknown) => {
      if (path === "/contacts") return Promise.resolve([{ id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", isActive: true }]);
      if (path === "/items") return Promise.resolve([{ id: "item-1", name: "Tracked item", description: "Tracked item", sku: "TRK", status: "ACTIVE", inventoryTracking: true }]);
      if (path === "/warehouses") return Promise.resolve([{ id: "warehouse-1", code: "MAIN", name: "Main", status: "ACTIVE", isDefault: true }]);
      if (path === "/sales-invoices") return Promise.resolve([]);
      if (path === "/credit-notes") return Promise.resolve([]);
      if (path === "/delivery-notes") return Promise.resolve([]);
      if (path === "/sales-stock-issues") return Promise.resolve([{ id: "ssi-1", issueNumber: "SSI-000001", customerId: "customer-1", warehouseId: "warehouse-1", status: "POSTED" }]);
      if (path === "/sales-inventory-returns/next-number") return Promise.resolve({ salesReturnNumber: "SRN-000001", helperText: "Assigned from sequence." });
      if (path === "/sales-stock-issues/ssi-1") {
        return Promise.resolve({
          id: "ssi-1",
          issueNumber: "SSI-000001",
          customerId: "customer-1",
          warehouseId: "warehouse-1",
          status: "POSTED",
          lines: [
            {
              id: "ssi-line-1",
              itemId: "item-1",
              quantity: "2.0000",
              item: { id: "item-1", name: "Tracked item", sku: "TRK" },
              salesInvoiceLine: { id: "invoice-line-1", description: "Tracked item sale", quantity: "2.0000", unitPrice: "100.0000" },
            },
          ],
        });
      }
      if (path === "/sales-inventory-returns" && options) return Promise.resolve({ id: "sir-1", salesReturnNumber: "SRN-000001" });
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("copies lines from a posted sales stock issue and saves a draft", async () => {
    render(<SalesInventoryReturnForm />);

    await waitFor(() => expect(screen.getByDisplayValue("SRN-000001")).toBeInTheDocument());
    expect(screen.getByText(/They do not create credit notes, refunds, accounting journals/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "customer-1" } });
    fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "stockIssue" } });
    fireEvent.change(screen.getByLabelText("Sales stock issue"), { target: { value: "ssi-1" } });

    await waitFor(() => expect(screen.getByDisplayValue("Tracked item sale")).toBeInTheDocument());

    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/sales-inventory-returns",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            customerId: "customer-1",
            sourceSalesStockIssueId: "ssi-1",
            lines: [expect.objectContaining({ sourceSalesStockIssueLineId: "ssi-line-1", warehouseId: "warehouse-1", quantity: "2.0000" })],
          }),
        }),
      ),
    );
    expect(pushMock).toHaveBeenCalledWith("/sales/inventory-returns/sir-1");
  });
});
