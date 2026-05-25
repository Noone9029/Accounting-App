import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { BankAccountProfileForm } from "./bank-account-profile-form";

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

describe("BankAccountProfileForm", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "account-1",
            organizationId: "org-1",
            parentId: null,
            code: "112",
            name: "Bank Account",
            type: "ASSET",
            description: null,
            allowPosting: true,
            isSystem: false,
            isActive: true,
          },
        ]);
      }
      if (path === "/bank-accounts" && !options?.method) {
        return Promise.resolve([]);
      }
      if (path === "/bank-accounts" && options?.method === "POST") {
        return Promise.resolve({ id: "profile-1" });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders currency as a supported-code dropdown instead of free text", async () => {
    render(<BankAccountProfileForm />);

    const currency = screen.getByRole("combobox", { name: "Currency" });

    await waitFor(() => expect(screen.getByLabelText("Linked chart account")).toHaveValue("account-1"));
    expect(currency).toHaveValue("SAR");
    expect(currency).toHaveDisplayValue("SAR - Saudi Riyal");
    expect(screen.getByRole("option", { name: "AED - UAE Dirham" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Currency" })).not.toBeInTheDocument();
  });

  it("requires selecting a supported currency before save", async () => {
    render(<BankAccountProfileForm />);

    await waitFor(() => expect(screen.getByLabelText("Linked chart account")).toHaveValue("account-1"));
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Please select a currency.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/bank-accounts", expect.objectContaining({ method: "POST" }));
  });

  it("submits the selected ISO currency code", async () => {
    render(<BankAccountProfileForm />);

    await waitFor(() => expect(screen.getByLabelText("Linked chart account")).toHaveValue("account-1"));
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), { target: { value: "AED" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-accounts",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ currency: "AED" }),
        }),
      ),
    );
  });

  it("locks currency when the existing profile has ledger transactions", async () => {
    render(<BankAccountProfileForm profile={bankProfile({ transactionCount: 2 })} />);

    expect(screen.getByRole("combobox", { name: "Currency" })).toBeDisabled();
    expect(screen.getByText("Currency is locked after opening balance or transactions have been posted.")).toBeInTheDocument();
  });

  it("flags unsupported existing currency values for correction", async () => {
    render(<BankAccountProfileForm profile={bankProfile({ currency: "SARSS" })} />);

    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveDisplayValue(
      "SARSS - Unsupported currency requires correction",
    );
    expect(screen.getByText("This bank account has an unsupported currency value. Select a supported currency before saving.")).toBeInTheDocument();
  });
});

function bankProfile(overrides: Partial<ReturnType<typeof bankProfileBase>> = {}) {
  return { ...bankProfileBase(), ...overrides };
}

function bankProfileBase() {
  return {
    id: "profile-1",
    organizationId: "org-1",
    accountId: "account-1",
    type: "BANK" as const,
    status: "ACTIVE" as const,
    displayName: "Operating Bank",
    bankName: null,
    accountNumberMasked: null,
    ibanMasked: null,
    currency: "SAR",
    openingBalance: "0.0000",
    openingBalanceDate: null,
    openingBalanceJournalEntryId: null,
    openingBalancePostedAt: null,
    notes: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    account: {
      id: "account-1",
      code: "112",
      name: "Bank Account",
      type: "ASSET" as const,
      allowPosting: true,
      isActive: true,
    },
    openingBalanceJournalEntry: null,
    ledgerBalance: "0.0000",
    latestTransactionDate: null,
    transactionCount: 0,
  };
}
