import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { PurchaseBill } from "@/lib/types";
import { PurchaseBillForm } from "./purchase-bill-form";

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
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("PurchaseBillForm", () => {
  const billId = "00000000-0000-0000-0000-000000000701";

  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/bills/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/purchase-bills" && options?.method === "POST") {
        return Promise.resolve({
          id: "bill-1",
          billNumber: "BILL-000001",
          status: "DRAFT",
        });
      }
      if (path === `/purchase-bills/${billId}` && options?.method === "PATCH") {
        return Promise.resolve({
          id: billId,
          billNumber: "BILL-000001",
          status: "DRAFT",
        });
      }
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("00000000-0000-0000-0000-000000000201", "Beta Supplier"),
          contactFixture("00000000-0000-0000-0000-000000000202", "Second Supplier"),
        ]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000401",
            code: "1000",
            name: "Cash",
            type: "EXPENSE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000501",
            name: "VAT 15%",
            rate: "15.0000",
            scope: "PURCHASES",
            category: "STANDARD",
            isActive: true,
          },
        ]);
      }
      if (path === "/branches") {
        return Promise.resolve([
          {
            id: "00000000-0000-0000-0000-000000000101",
            name: "Riyadh Demo Branch",
            displayName: "Riyadh Demo Branch",
            countryCode: "SA",
            isDefault: true,
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills the supplier from the new-bill route query string", async () => {
    window.history.pushState(
      {},
      "",
      "/purchases/bills/new?supplierId=00000000-0000-0000-0000-000000000202&returnTo=/suppliers/00000000-0000-0000-0000-000000000202",
    );

    render(<PurchaseBillForm />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("00000000-0000-0000-0000-000000000202"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/suppliers/00000000-0000-0000-0000-000000000202",
    );
  });

  it("submits selected branch, account, and tax IDs instead of visible labels", async () => {
    render(<PurchaseBillForm />);

    await waitFor(() => expect(screen.getByRole("option", { name: "Beta Supplier" })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Supplier"), { target: { value: "00000000-0000-0000-0000-000000000201" } });
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "00000000-0000-0000-0000-000000000101" } });

    const lineRow = screen.getAllByRole("row")[1]!;
    const lineControls = within(lineRow);
    const lineTextboxes = lineControls.getAllByRole("textbox");
    const lineComboboxes = lineControls.getAllByRole("combobox");

    fireEvent.change(lineTextboxes[0]!, { target: { value: "TEST" } });
    fireEvent.change(lineComboboxes[1]!, { target: { value: "00000000-0000-0000-0000-000000000401" } });
    fireEvent.change(lineComboboxes[2]!, { target: { value: "00000000-0000-0000-0000-000000000501" } });
    fireEvent.change(lineTextboxes[2]!, { target: { value: "1000" } });

    fireEvent.submit(screen.getByRole("button", { name: "Save draft" }).closest("form")!);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/purchase-bills",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            supplierId: "00000000-0000-0000-0000-000000000201",
            branchId: "00000000-0000-0000-0000-000000000101",
            lines: [
              expect.objectContaining({
                accountId: "00000000-0000-0000-0000-000000000401",
                taxRateId: "00000000-0000-0000-0000-000000000501",
              }),
            ],
          }),
        }),
      ),
    );
  });

  it("uses returnTo from the edit route query string for cancel and post-save redirect", async () => {
    window.history.pushState(
      {},
      "",
      `/purchases/bills/${billId}/edit?returnTo=/suppliers/00000000-0000-0000-0000-000000000201`,
    );

    render(
      <PurchaseBillForm
        initialBill={billFixture({
          id: billId,
          supplierId: "00000000-0000-0000-0000-000000000201",
          branchId: "00000000-0000-0000-0000-000000000101",
          lines: [
            {
              id: "line-1",
              organizationId: "org-1",
              billId,
              itemId: null,
              description: "Office supplies",
              accountId: "00000000-0000-0000-0000-000000000401",
              quantity: "1.0000",
              unitPrice: "100.0000",
              discountRate: "0.0000",
              lineGrossAmount: "100.0000",
              discountAmount: "0.0000",
              taxableAmount: "100.0000",
              taxAmount: "15.0000",
              lineTotal: "115.0000",
              taxRateId: "00000000-0000-0000-0000-000000000501",
              sortOrder: 0,
              account: undefined,
              taxRate: undefined,
              item: undefined,
            },
          ],
        })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
        "href",
        "/suppliers/00000000-0000-0000-0000-000000000201",
      ),
    );

    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/suppliers/00000000-0000-0000-0000-000000000201"),
    );
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "SUPPLIER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function billFixture(overrides: Partial<PurchaseBill> = {}): PurchaseBill {
  return {
    id: "00000000-0000-0000-0000-000000000701",
    organizationId: "org-1",
    billNumber: "BILL-000001",
    supplierId: "00000000-0000-0000-0000-000000000201",
    branchId: null,
    billDate: "2026-06-11T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    supplier: {
      id: "00000000-0000-0000-0000-000000000201",
      name: "Beta Supplier",
      displayName: "Beta Supplier",
      type: "SUPPLIER",
      taxNumber: null,
    },
    branch: null,
    purchaseOrderId: null,
    purchaseOrder: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    paymentAllocations: [],
    supplierPaymentUnappliedAllocations: [],
    debitNotes: [],
    debitNoteAllocations: [],
    ...overrides,
  };
}
