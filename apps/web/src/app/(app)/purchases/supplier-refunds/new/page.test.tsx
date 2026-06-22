import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import NewSupplierRefundPage from "./page";

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

describe("NewSupplierRefundPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/supplier-refunds/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier")]);
      }
      if (path === "/accounts") {
        return Promise.resolve([{ id: "cash-1", code: "111", name: "Cash on hand", type: "ASSET", isActive: true, allowPosting: true }]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/supplier-refunds/refundable-sources?supplierId=supplier-1") {
        return Promise.resolve({
          payments: [refundableSource("payment-1", "SP-001")],
          debitNotes: [refundableSource("debit-note-1", "PDN-001")],
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills supplier and source from the route query string", async () => {
    window.history.pushState({}, "", "/purchases/supplier-refunds/new?supplierId=supplier-1&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=debit-note-1");

    render(<NewSupplierRefundPage />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-1"));
    await waitFor(() => expect(screen.getByLabelText("Source type")).toHaveValue("PURCHASE_DEBIT_NOTE"));
    expect(screen.getByLabelText("Refund source")).toHaveValue("debit-note-1");
    expect(screen.getByText(/does not call bank transfers, payment gateways, bank reconciliation, or ZATCA services/i)).toBeInTheDocument();
    expect(screen.getByText("Remaining after refund")).toBeInTheDocument();
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

function refundableSource(id: string, number: string) {
  return {
    id,
    number,
    sourceNumber: number,
    supplierId: "supplier-1",
    currency: "SAR",
    unappliedAmount: "25.0000",
    date: "2026-05-22T00:00:00.000Z",
  };
}
