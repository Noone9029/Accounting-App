import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
