import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import NewBankTransferPage from "./page";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();
let mockOrganizationId = "org-1";
let mockBaseCurrency = "AED";
let mockProfileCurrency = "AED";
let holdProfileLoad = false;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganization: () => ({ id: mockOrganizationId, baseCurrency: mockBaseCurrency }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("NewBankTransferPage base-currency guard", () => {
  beforeEach(() => {
    mockOrganizationId = "org-1";
    mockBaseCurrency = "AED";
    mockProfileCurrency = "AED";
    holdProfileLoad = false;
    pushMock.mockReset();
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/bank-accounts") {
        if (holdProfileLoad) {
          return new Promise(() => undefined);
        }
        return Promise.resolve([
          bankProfile("bank-1", "account-1", mockProfileCurrency, mockOrganizationId),
          bankProfile("bank-2", "account-2", mockProfileCurrency, mockOrganizationId),
        ]);
      }
      if (path === "/bank-transfers" && options?.method === "POST") {
        return Promise.resolve({ id: "transfer-1" });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it.each(["AED", "SAR"])("posts a direct transfer in the organization's %s base currency", async (baseCurrency) => {
    mockBaseCurrency = baseCurrency;
    mockProfileCurrency = baseCurrency;
    render(<NewBankTransferPage />);

    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue("bank-1"));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100.0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Post transfer" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/bank-transfers",
        expect.objectContaining({ method: "POST", body: expect.objectContaining({ currency: baseCurrency }) }),
      ),
    );
  });

  it("blocks a foreign-profile transfer before mutation", async () => {
    mockProfileCurrency = "USD";
    render(<NewBankTransferPage />);

    expect(await screen.findByText(/do not use the organization base currency/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post transfer" })).toBeDisabled();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/bank-transfers", expect.objectContaining({ method: "POST" }));
  });

  it("blocks stale same-base bank profiles immediately after the active organization changes", async () => {
    const { rerender } = render(<NewBankTransferPage />);

    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue("bank-1"));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100.0000" } });

    holdProfileLoad = true;
    mockOrganizationId = "org-2";
    rerender(<NewBankTransferPage />);

    await waitFor(() => expect(apiRequestMock.mock.calls.filter(([path]) => path === "/bank-accounts")).toHaveLength(2));
    const postButton = screen.getByRole("button", { name: "Post transfer" });
    expect(postButton).toBeDisabled();
    fireEvent.click(postButton);
    expect(apiRequestMock).not.toHaveBeenCalledWith("/bank-transfers", expect.objectContaining({ method: "POST" }));
  });
});

function bankProfile(id: string, accountId: string, currency: string, organizationId: string) {
  return {
    id,
    organizationId,
    accountId,
    displayName: id === "bank-1" ? "Main bank" : "Reserve bank",
    type: "BANK",
    status: "ACTIVE",
    currency,
    account: { id: accountId, code: id === "bank-1" ? "1110" : "1120", name: id === "bank-1" ? "Main bank" : "Reserve bank" },
  };
}
