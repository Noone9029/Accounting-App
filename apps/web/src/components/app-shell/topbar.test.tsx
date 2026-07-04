import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { apiRequest, logoutSession, setActiveOrganizationId } from "@/lib/api";
import { Topbar } from "./topbar";

let mockPathname = "/dashboard";
let mockPermissions = permissionState();
const mockReplace = jest.fn();

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
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn(), replace: mockReplace }),
  usePathname: () => mockPathname,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => mockPermissions,
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    apiRequest: jest.fn(),
    logoutSession: jest.fn(),
    setActiveOrganizationId: jest.fn(),
  };
});

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;
const logoutSessionMock = logoutSession as jest.MockedFunction<typeof logoutSession>;
const setActiveOrganizationIdMock = setActiveOrganizationId as jest.MockedFunction<typeof setActiveOrganizationId>;

describe("Topbar action menus", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockPermissions = permissionState();
    apiRequestMock.mockReset();
    logoutSessionMock.mockReset();
    logoutSessionMock.mockResolvedValue();
    setActiveOrganizationIdMock.mockReset();
    mockReplace.mockReset();
  });

  it("opens notifications and renders dashboard attention links", async () => {
    apiRequestMock.mockResolvedValueOnce({
      attentionItems: [
        {
          type: "OVERDUE_INVOICES",
          severity: "warning",
          title: "Overdue invoices need follow-up",
          description: "2 invoices are overdue.",
          href: "/reports/aged-receivables",
        },
      ],
    } as never);

    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/dashboard/summary");
    expect(await screen.findByRole("link", { name: /Overdue invoices need follow-up/i })).toHaveAttribute(
      "href",
      "/reports/aged-receivables",
    );
    expect(screen.getByText("2 invoices are overdue.")).toBeInTheDocument();
  });

  it("shows a useful empty notification state", async () => {
    apiRequestMock.mockResolvedValueOnce({ attentionItems: [] } as never);

    render(<Topbar />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(await screen.findByText("No attention items")).toBeInTheDocument();
    expect(screen.getByText("No dashboard alerts were generated from current data.")).toBeInTheDocument();
  });

  it("opens help with existing resource links and current-page context", () => {
    mockPathname = "/sales/invoices";
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    const menu = screen.getByRole("dialog", { name: "Help" });
    expect(within(menu).getByRole("link", { name: "Current workspace Sales workflow" })).toHaveAttribute(
      "href",
      "/sales/invoices",
    );
    expect(within(menu).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(within(menu).getByRole("link", { name: "Document archive" })).toHaveAttribute("href", "/documents");
    expect(within(menu).getByRole("link", { name: "Audit logs" })).toHaveAttribute("href", "/settings/audit-logs");
    expect(within(menu).getByText(/existing beta resources/i)).toBeInTheDocument();
  });

  it("opens the account menu with organization controls and signs out", async () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    const menu = screen.getByRole("dialog", { name: "Account menu" });
    expect(within(menu).getByText("Admin User")).toBeInTheDocument();
    expect(within(menu).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(menu).getByLabelText("Active organization")).toHaveValue("org-1");
    expect(within(menu).getByRole("link", { name: "Organization settings" })).toHaveAttribute("href", "/organization/setup");
    expect(within(menu).getByRole("link", { name: "Users and roles" })).toHaveAttribute("href", "/settings/team");

    fireEvent.change(within(menu).getByLabelText("Active organization"), { target: { value: "org-2" } });
    expect(setActiveOrganizationIdMock).toHaveBeenCalledWith("org-2");

    fireEvent.click(within(menu).getByRole("button", { name: "Sign out" }));
    expect(logoutSessionMock).toHaveBeenCalled();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });

  it("renders Arabic topbar labels when the locale provider is Arabic", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <Topbar />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
    expect(screen.getByRole("button", { name: "التنبيهات" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "المساعدة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "قائمة الحساب" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
  });

  it("closes action menus on Escape and outside click", async () => {
    apiRequestMock.mockResolvedValueOnce({ attentionItems: [] } as never);
    render(
      <div>
        <Topbar />
        <button type="button">Outside</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("dialog", { name: "Help" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Help" })).not.toBeInTheDocument());
  });
});

function permissionState() {
  const organization = {
    id: "org-1",
    name: "Acme Trading",
    legalName: "Acme Trading LLC",
    taxNumber: null,
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
  };
  const secondOrganization = { ...organization, id: "org-2", name: "Beta Books", baseCurrency: "SAR", countryCode: "SA" };
  const activeMembership = {
    id: "membership-1",
    status: "ACTIVE",
    organization,
    role: { id: "role-1", name: "Admin", permissions: ["*"] },
  };

  return {
    user: {
      id: "user-1",
      name: "Admin User",
      email: "admin@example.com",
      memberships: [
        activeMembership,
        {
          id: "membership-2",
          status: "ACTIVE",
          organization: secondOrganization,
          role: { id: "role-1", name: "Admin", permissions: ["*"] },
        },
      ],
    },
    activeMembership,
    loading: false,
    error: "",
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    reload: jest.fn(),
  };
}
