import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
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
    refresh: jest.fn(),
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
    window.history.pushState(
      {},
      "",
      "/purchases/supplier-refunds/new?supplierId=supplier-1&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=debit-note-1",
    );
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([{ id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", isActive: true }]);
      }
      if (path === "/accounts") {
        return Promise.resolve([{ id: "cash-1", code: "111", name: "Cash on hand", type: "ASSET", isActive: true, allowPosting: true }]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/supplier-refunds/refundable-sources?supplierId=supplier-1") {
        return Promise.resolve({
          payments: [],
          debitNotes: [
            {
              id: "debit-note-1",
              debitNoteNumber: "PDN-001",
              issueDate: "2026-05-21T00:00:00.000Z",
              status: "FINALIZED",
              total: "115.0000",
              unappliedAmount: "115.0000",
              currency: "SAR",
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders Arabic supplier refund form without changing return routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <NewSupplierRefundPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("المورد")).toHaveValue("supplier-1"));
    await waitFor(() => expect(screen.getByLabelText("المبلغ المردود")).toHaveValue("115.0000"));
    expect(screen.getByRole("heading", { name: "تسجيل رد مورد" })).toBeInTheDocument();
    expect(screen.getByText("سجل مبلغا مستلما من مورد مقابل رصيد دائنين غير مخصص. لا يتم استدعاء أي تكامل بنكي.")).toBeInTheDocument();
    expect(screen.getByText("مصدر الرد")).toBeInTheDocument();
    expect(screen.getByText("رصيد المصدر المتاح")).toBeInTheDocument();
    expect(screen.getByText("المتبقي غير المخصص")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "رجوع" })).toHaveAttribute("href", "/purchases/supplier-refunds");
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/purchases/supplier-refunds");
    expect(screen.getByRole("button", { name: "تسجيل رد" })).toBeInTheDocument();
  });
});
