import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import NewBankReconciliationPage from "./page";
import { apiRequest } from "@/lib/api";
import type { BankAccountSummary } from "@/lib/types";

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
  useParams: () => ({ id: "bank-1" }),
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("new bank reconciliation page", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockedApiRequest.mockImplementation((path) => {
      if (path === "/bank-accounts/bank-1") {
        return Promise.resolve(bankAccountFixture()) as ReturnType<typeof apiRequest>;
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders Arabic create guidance and validation without changing routes", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <NewBankReconciliationPage />
      </AppLocaleProvider>,
    );

    expect(await screen.findByRole("heading", { name: "تسوية جديدة" })).toBeInTheDocument();
    expect(screen.getByText("قبل إغلاق فترة")).toBeInTheDocument();
    expect(screen.getByText(/لا يتم قفل الفترة بعد/)).toBeInTheDocument();
    expect(screen.getByText("رصيد الدفتر الحالي")).toBeInTheDocument();
    expect(screen.getByLabelText("رصيد إغلاق الكشف")).toHaveValue("1250.0000");

    fireEvent.change(screen.getByLabelText("رصيد إغلاق الكشف"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "إنشاء مسودة" }));

    expect(await screen.findByText("تاريخ بداية الفترة وتاريخ نهايتها ورصيد إغلاق الكشف مطلوبة.")).toBeInTheDocument();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledWith("/bank-accounts/bank-1"));
    expect(screen.getByRole("link", { name: "مراجعة الصفوف غير المطابقة" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "استيراد كشف" })).toHaveAttribute("href", "/bank-accounts/bank-1/statement-imports");
    expect(screen.getByRole("link", { name: "راجع الملخص أولا" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
    expect(pushMock).not.toHaveBeenCalled();
  });
});

function bankAccountFixture(): BankAccountSummary {
  return {
    id: "bank-1",
    organizationId: "org-1",
    accountId: "account-1",
    type: "BANK",
    status: "ACTIVE",
    displayName: "Main Bank",
    bankName: "Beta Bank",
    accountNumberMasked: "**** 1234",
    ibanMasked: "SA**1234",
    currency: "SAR",
    openingBalance: "1000.0000",
    openingBalanceDate: "2026-05-01T00:00:00.000Z",
    openingBalanceJournalEntryId: "journal-opening",
    openingBalancePostedAt: "2026-05-01T00:00:00.000Z",
    notes: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ledgerBalance: "1250.0000",
    latestTransactionDate: "2026-05-21T00:00:00.000Z",
    transactionCount: 4,
    account: {
      id: "account-1",
      code: "1010",
      name: "Main Bank",
      type: "ASSET",
      allowPosting: true,
      isActive: true,
    },
    openingBalanceJournalEntry: { id: "journal-opening", entryNumber: "JE-OPEN", status: "POSTED" },
  };
}
