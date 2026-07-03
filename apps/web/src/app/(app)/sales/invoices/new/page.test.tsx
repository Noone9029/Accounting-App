import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import NewSalesInvoicePage from "./page";

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
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/forms/sales-invoice-form", () => ({
  SalesInvoiceForm: () => <div data-testid="sales-invoice-form" />,
}));

describe("NewSalesInvoicePage", () => {
  it("renders Arabic create copy without changing the setup route", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <NewSalesInvoicePage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "إنشاء فاتورة مبيعات" })).toBeInTheDocument();
    expect(screen.getByText("أنشئ عملية البيع الأولى من عميل وحساب إيراد وبند أو معدل ضريبة اختياري. احفظ المسودة أولا، ثم راجعها وأنهها من صفحة الفاتورة.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الإعداد الموجه" })).toHaveAttribute("href", "/setup");
    expect(screen.getByTestId("sales-invoice-form")).toBeInTheDocument();
  });
});
