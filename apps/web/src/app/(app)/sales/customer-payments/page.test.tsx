import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import CustomerPaymentsPage from "./page";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
let searchParams = new URLSearchParams();

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
  useSearchParams: () => searchParams,
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CustomerPaymentsPage", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("customerId=customer-1&returnTo=/customers/customer-1");
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockResolvedValue([
      paymentFixture("payment-1", "CP-001", "customer-1", "Beta Customer"),
      paymentFixture("payment-2", "CP-002", "customer-2", "Other Customer"),
    ]);
  });

  it("keeps the customer workspace context on filtered payment lists", async () => {
    render(<CustomerPaymentsPage />);

    expect(await screen.findByText("CP-001")).toBeInTheDocument();
    expect(screen.queryByText("CP-002")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/payment-1?returnTo=%2Fsales%2Fcustomer-payments%3FcustomerId%3Dcustomer-1%26returnTo%3D%252Fcustomers%252Fcustomer-1",
    );
  });

  it("renders the filtered payment list in Arabic without changing route continuity", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <CustomerPaymentsPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("CP-001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "دفعات العملاء" })).toBeInTheDocument();
    expect(screen.getByText(/دفعات العملاء المسجلة لمساحة العمل هذه/)).toBeInTheDocument();
    expect(screen.getByText("مرحلة")).toBeInTheDocument();
    expect(screen.getByText("لا توجد تخصيصات")).toBeInTheDocument();
    expect(screen.getByText("دفع عبر")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى مساحة العمل" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "تسجيل دفعة" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.getByRole("link", { name: "عرض" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/payment-1?returnTo=%2Fsales%2Fcustomer-payments%3FcustomerId%3Dcustomer-1%26returnTo%3D%252Fcustomers%252Fcustomer-1",
    );
  });
});

function paymentFixture(id: string, paymentNumber: string, customerId: string, customerName: string) {
  return {
    id,
    organizationId: "org-1",
    paymentNumber,
    customerId,
    paymentDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountReceived: "115.0000",
    unappliedAmount: "0.0000",
    description: null,
    accountId: "account-1",
    journalEntryId: "je-1",
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    customer: { id: customerId, name: customerName, displayName: customerName, type: "CUSTOMER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001" },
    allocations: [],
    unappliedAllocations: [],
  };
}
