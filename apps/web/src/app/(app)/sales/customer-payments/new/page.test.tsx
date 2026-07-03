import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import NewCustomerPaymentPage from "./page";

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

describe("NewCustomerPaymentPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/customer-payments/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer")]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "cash-1",
            code: "111",
            name: "Cash on hand",
            type: "ASSET",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([
          {
            id: "invoice-1",
            invoiceNumber: "INV-001",
            issueDate: "2026-05-21T00:00:00.000Z",
            dueDate: null,
            currency: "SAR",
            status: "FINALIZED",
            total: "115.0000",
            balanceDue: "115.0000",
            customerId: "customer-1",
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills customer and invoice allocation from the route query string", async () => {
    window.history.pushState({}, "", "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1");

    render(<NewCustomerPaymentPage />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-1"));
    await waitFor(() => expect(screen.getByLabelText("Amount received")).toHaveValue("115.0000"));
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-1");
  });

  it("renders Arabic payment recording copy without changing return routes", async () => {
    window.history.pushState({}, "", "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1");

    render(
      <AppLocaleProvider initialLocale="ar">
        <NewCustomerPaymentPage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "تسجيل دفعة عميل" })).toBeInTheDocument();
    expect(screen.getByText("خصص الأموال المستلمة للفواتير المفتوحة النهائية. إذا كان هذا أول سير عمل لك، أنه الفاتورة أولا ثم عد هنا لإغلاق دورة الذمم المدينة.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("العميل")).toHaveValue("customer-1"));
    await waitFor(() => expect(screen.getByLabelText("المبلغ المستلم")).toHaveValue("115.0000"));
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByText("حالة التخصيص")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تسجيل دفعة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/customers/customer-1");
  });

  it("points the first payment empty state to the dedicated customers page", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "cash-1",
            code: "111",
            name: "Cash on hand",
            type: "ASSET",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<NewCustomerPaymentPage />);

    expect(await screen.findByRole("link", { name: "Open customers" })).toHaveAttribute("href", "/customers");
  });

  it("keeps the selected customer context when no open invoices exist", async () => {
    window.history.pushState({}, "", "/sales/customer-payments/new?customerId=customer-1&returnTo=/customers/customer-1");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("customer-1", "Beta Customer")]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "cash-1",
            code: "111",
            name: "Cash on hand",
            type: "ASSET",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/bank-accounts") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<NewCustomerPaymentPage />);

    expect(await screen.findByRole("link", { name: "Create and finalize an invoice" })).toHaveAttribute(
      "href",
      "/sales/invoices/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "CUSTOMER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}
