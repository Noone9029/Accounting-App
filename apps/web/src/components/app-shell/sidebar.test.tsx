import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { MobileWorkflowNav, Sidebar } from "./sidebar";
import { sidebarNavItemsForMarket } from "@/lib/sidebar-nav";

let mockPathname = "/dashboard";
let mockActiveMembership: unknown = { role: { permissions: ["*"] } };

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
  usePathname: () => mockPathname,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ activeMembership: mockActiveMembership }),
}));

describe("mobile first-workflow navigation", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockActiveMembership = { role: { permissions: ["*"] } };
  });

  it("shows compact first-workflow links for permitted users", () => {
    render(<MobileWorkflowNav />);

    const nav = screen.getByRole("navigation", { name: "First workflow navigation" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByRole("link", { name: "Customer" })).toHaveAttribute("href", "/customers");
    expect(screen.getByRole("link", { name: "Supplier" })).toHaveAttribute("href", "/suppliers");
    expect(screen.getByRole("link", { name: "Invoice" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.getByRole("link", { name: "Payment" })).toHaveAttribute("href", "/sales/customer-payments/new");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
  });

  it("does not render links when the user has no matching permissions", () => {
    mockActiveMembership = { role: { permissions: [] } };

    render(<MobileWorkflowNav />);

    expect(screen.queryByRole("navigation", { name: "First workflow navigation" })).not.toBeInTheDocument();
  });
});

describe("sidebar create shortcut", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    mockActiveMembership = { role: { permissions: ["*"] } };
  });

  it("shows the global Create shortcut in the main sidebar", () => {
    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("groups workflow navigation for faster accounting scanning", () => {
    render(<Sidebar />);

    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Daily books")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
  });

  it("keeps module children collapsed until a category is opened", () => {
    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sales" }));

    expect(screen.getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Invoices" })).toHaveAttribute("href", "/sales/invoices");
    expect(screen.getByRole("link", { name: "Credit notes" })).toHaveAttribute("href", "/sales/credit-notes");
  });

  it("keeps only one expandable category open at a time", () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Sales" }));
    expect(screen.getByRole("link", { name: "Invoices" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Purchases" }));

    expect(screen.getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Purchases" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Bills" })).toHaveAttribute("href", "/purchases/bills");
  });

  it("auto-expands the category for the current route", () => {
    mockPathname = "/sales/quotes";

    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Quotes" })).toHaveAttribute("href", "/sales/quotes");
  });

  it("keeps permission-filtered children hidden from expanded categories", () => {
    mockActiveMembership = { role: { permissions: ["salesInvoices.view"] } };

    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Sales" }));

    expect(screen.getByRole("link", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quotes" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Credit notes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Customer payments" })).not.toBeInTheDocument();
  });

  it("uses collapsed module categories in the mobile navigation drawer", () => {
    render(<MobileWorkflowNav />);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawerNav = screen.getByRole("navigation", { name: "Workspace navigation" });

    expect(within(drawerNav).getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "false");
    expect(within(drawerNav).queryByRole("link", { name: "Invoices" })).not.toBeInTheDocument();

    fireEvent.click(within(drawerNav).getByRole("button", { name: "Sales" }));

    expect(within(drawerNav).getByRole("button", { name: "Sales" })).toHaveAttribute("aria-expanded", "true");
    expect(within(drawerNav).getByRole("link", { name: "Invoices" })).toHaveAttribute("href", "/sales/invoices");
  });
});

describe("edition-aware compliance navigation", () => {
  function complianceLabels(market: "GENERIC" | "KSA" | "UAE") {
    return sidebarNavItemsForMarket(market).find((item) => item.label === "Compliance")?.children?.map((child) => child.label) ?? [];
  }

  it("keeps generic compliance navigation neutral", () => {
    const labels = complianceLabels("GENERIC");

    expect(labels).toContain("VAT readiness");
    expect(labels).not.toEqual(expect.arrayContaining(["ZATCA readiness", "UAE eInvoicing readiness", "Local PINT-AE QA"]));
  });

  it("shows only KSA ZATCA readiness for KSA", () => {
    const labels = complianceLabels("KSA");

    expect(labels).toContain("ZATCA readiness");
    expect(labels).not.toEqual(expect.arrayContaining(["UAE eInvoicing readiness", "Local PINT-AE QA"]));
  });

  it("shows only UAE eInvoicing/PINT-AE readiness for UAE", () => {
    const labels = complianceLabels("UAE");

    expect(labels).toEqual(expect.arrayContaining(["UAE eInvoicing readiness", "Local PINT-AE QA"]));
    expect(labels).not.toContain("ZATCA readiness");
  });
});
