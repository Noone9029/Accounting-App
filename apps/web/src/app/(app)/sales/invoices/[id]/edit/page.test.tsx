import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import EditSalesInvoicePage from "./page";
import type { SalesInvoice } from "@/lib/types";

const apiRequestMock = jest.fn();

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
  useParams: () => ({ id: "invoice-1" }),
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/forms/sales-invoice-form", () => ({
  SalesInvoiceForm: ({ initialInvoice }: { initialInvoice: SalesInvoice }) => <div data-testid="sales-invoice-form">{initialInvoice.invoiceNumber}</div>,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("EditSalesInvoicePage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(invoiceFixture());
  });

  it("renders Arabic edit copy and preserves the invoice detail route", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <EditSalesInvoicePage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "تعديل فاتورة المبيعات" })).toBeInTheDocument();
    expect(screen.getByText("يمكن تعديل الفواتير المسودة قبل إنهائها.")).toBeInTheDocument();
    expect(await screen.findByTestId("sales-invoice-form")).toHaveTextContent("INV-001");
    expect(screen.getByRole("link", { name: "رجوع" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
  });
});

function invoiceFixture(): SalesInvoice {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-001",
    status: "DRAFT",
  } as SalesInvoice;
}
