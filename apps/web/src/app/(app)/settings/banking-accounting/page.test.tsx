import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BankingAccountingSettingsPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Account, BankingClearingAccountConfigResponse } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
  }),
}));

describe("BankingAccountingSettingsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([PERMISSIONS.accounts.view, PERMISSIONS.accounts.manage]);
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/banking-accounting/clearing-config" && options?.method === "PUT") {
        return Promise.resolve(configResponse({ enabled: true, undepositedFundsAccountId: "undeposited-funds" }));
      }
      if (path === "/banking-accounting/clearing-config/validate") {
        return Promise.resolve({ valid: true, reasons: [], warnings: [] });
      }
      if (path === "/banking-accounting/clearing-config") {
        return Promise.resolve(configResponse());
      }
      if (path === "/accounts") {
        return Promise.resolve(accounts());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders clearing account selectors, validates, and saves existing accounts", async () => {
    render(<BankingAccountingSettingsPage />);

    expect(await screen.findByText("Banking accounting settings")).toBeInTheDocument();
    expect(screen.getByText(/does not connect a live bank feed/i)).toBeInTheDocument();
    expect(screen.getByText(/send bank payments/i)).toBeInTheDocument();
    expect((await screen.findAllByRole("option", { name: /1090 - Undeposited funds/i })).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Undeposited funds/i), { target: { value: "undeposited-funds" } });
    fireEvent.click(screen.getByRole("button", { name: "Validate config" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/banking-accounting/clearing-config/validate",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ undepositedFundsAccountId: "undeposited-funds" }),
        }),
      );
    });

    fireEvent.click(screen.getByLabelText(/Enable configured clearing-account journal posting/i));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/banking-accounting/clearing-config",
        expect.objectContaining({
          method: "PUT",
          body: expect.objectContaining({ enabled: true, undepositedFundsAccountId: "undeposited-funds" }),
        }),
      );
    });
  });
});

function configResponse(overrides: Partial<NonNullable<BankingClearingAccountConfigResponse["config"]>> = {}): BankingClearingAccountConfigResponse {
  return {
    config: {
      id: "cfg-1",
      organizationId: "org-1",
      enabled: false,
      undepositedFundsAccountId: null,
      chequeInHandAccountId: null,
      outstandingChequesAccountId: null,
      cardClearingAccountId: null,
      creditCardLiabilityAccountId: null,
      prepaidCardAssetAccountId: null,
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
      ...overrides,
    },
    validation: { valid: false, enabled: false, reasons: ["Banking clearing-account config has not been saved."] },
    warnings: ["Existing operational deposit, card, and cheque records are not silently converted or posted."],
  };
}

function accounts(): Account[] {
  return [
    account("bank-account", "1010", "Main Bank", "ASSET"),
    account("undeposited-funds", "1090", "Undeposited funds", "ASSET"),
    account("card-liability", "2100", "Credit-card liability", "LIABILITY"),
    account("prepaid-card", "1200", "Prepaid card", "ASSET"),
  ];
}

function account(id: string, code: string, name: string, type: Account["type"]): Account {
  return {
    id,
    organizationId: "org-1",
    parentId: null,
    code,
    name,
    type,
    description: null,
    allowPosting: true,
    isSystem: false,
    isActive: true,
  };
}
