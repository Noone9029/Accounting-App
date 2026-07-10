import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import NewCustomerRefundPage from "./page";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();
let mockBaseCurrency = "SAR";
let mockSourceCurrency = "SAR";

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
  useActiveOrganization: () => ({ id: "org-1", baseCurrency: mockBaseCurrency }),
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("NewCustomerRefundPage", () => {
  beforeEach(() => {
    window.history.pushState(
      {},
      "",
      "/sales/customer-refunds/new?customerId=customer-1&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=payment-1&returnTo=/customers/customer-1",
    );
    apiRequestMock.mockReset();
    pushMock.mockReset();
    mockBaseCurrency = "SAR";
    mockSourceCurrency = "SAR";
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([{ id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", isActive: true }]);
      }
      if (path === "/accounts") {
        return Promise.resolve([{ id: "cash-1", code: "111", name: "Cash on hand", type: "ASSET", isActive: true, allowPosting: true }]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/customer-refunds/refundable-sources?customerId=customer-1") {
        return Promise.resolve({
          customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer" },
          payments: [
            {
              id: "payment-1",
              paymentNumber: "PAY-001",
              paymentDate: "2026-05-21T00:00:00.000Z",
              status: "POSTED",
              amountReceived: "115.0000",
              unappliedAmount: "115.0000",
              currency: mockSourceCurrency,
            },
          ],
          creditNotes: [],
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders Arabic customer refund form without changing return routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <NewCustomerRefundPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("العميل")).toHaveValue("customer-1"));
    await waitFor(() => expect(screen.getByLabelText("المبلغ المردود")).toHaveValue("115.0000"));
    expect(screen.getByRole("heading", { name: "تسجيل رد عميل" })).toBeInTheDocument();
    expect(screen.getByText("رد رصيد العميل غير المخصص يدويا. لا يتم إنشاء رد عبر بوابة دفع.")).toBeInTheDocument();
    expect(screen.getByText("مصدر الرد")).toBeInTheDocument();
    expect(screen.getByText("رصيد المصدر المتاح")).toBeInTheDocument();
    expect(screen.getByText("يسجل هذا قيد رد محاسبي فقط. لا يستدعي بوابة دفع أو تغذية بنكية أو خدمة زاتكا.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "رجوع" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("button", { name: "تسجيل رد" })).toBeInTheDocument();
  });

  it("blocks a refund source whose currency differs from the active base currency", async () => {
    mockBaseCurrency = "AED";
    mockSourceCurrency = "SAR";

    render(<NewCustomerRefundPage />);

    expect(await screen.findByText(/source currency does not match the organization base currency/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record refund" })).toBeDisabled();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/customer-refunds", expect.objectContaining({ method: "POST" }));
  });
});
