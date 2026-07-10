import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import NewSupplierPaymentPage from "./page";
import { AppLocaleProvider } from "@/components/app-locale-provider";

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
  useActiveOrganization: () => ({ id: "org-1", baseCurrency: "SAR" }),
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("NewSupplierPaymentPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier")]);
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
      if (path === "/purchase-bills/open?supplierId=supplier-1") {
        return Promise.resolve([
          {
            id: "bill-1",
            billNumber: "BILL-001",
            billDate: "2026-05-21T00:00:00.000Z",
            dueDate: null,
            currency: "SAR",
            status: "FINALIZED",
            total: "115.0000",
            balanceDue: "115.0000",
            supplierId: "supplier-1",
          },
        ]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills supplier and bill allocation from the route query string", async () => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new?supplierId=supplier-1&billId=bill-1&returnTo=/suppliers/supplier-1");

    render(<NewSupplierPaymentPage />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-1"));
    await waitFor(() => expect(screen.getByLabelText("Amount paid")).toHaveValue("115.0000"));
    expect(screen.getByText("BILL-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/suppliers/supplier-1");
  });

  it("keeps the selected supplier context when no open bills exist", async () => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new?supplierId=supplier-1&returnTo=/suppliers/supplier-1");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier")]);
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
      if (path === "/purchase-bills/open?supplierId=supplier-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<NewSupplierPaymentPage />);

    expect(await screen.findByRole("link", { name: "Create and finalize a bill" })).toHaveAttribute(
      "href",
      "/purchases/bills/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
  });

  it("renders the prefilled supplier payment form in Arabic without changing route continuity", async () => {
    window.history.pushState({}, "", "/purchases/supplier-payments/new?supplierId=supplier-1&billId=bill-1&returnTo=/suppliers/supplier-1");

    render(
      <AppLocaleProvider initialLocale="ar">
        <NewSupplierPaymentPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("المورد")).toHaveValue("supplier-1"));
    await waitFor(() => expect(screen.getByLabelText("المبلغ المدفوع")).toHaveValue("115.0000"));
    expect(screen.getByRole("heading", { name: "تسجيل دفعة مورد" })).toBeInTheDocument();
    expect(screen.getByText("ادفع للموردين وخصص الدفعة للفواتير المفتوحة النهائية.")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة المستلمة")).toBeInTheDocument();
    expect(screen.getByText("الرصيد المستحق")).toBeInTheDocument();
    expect(screen.getByText("الرصيد الكامل")).toBeInTheDocument();
    expect(screen.getByText("ينشئ ترحيل دفعة المورد قيد دائنين واحدا. تخصيص الفاتورة يحدث أرصدة الفواتير فقط.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("button", { name: "تسجيل دفعة" })).toBeInTheDocument();
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
