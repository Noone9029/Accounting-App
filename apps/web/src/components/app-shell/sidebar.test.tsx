import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { MobileWorkflowNav } from "./sidebar";

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
    expect(screen.getByRole("link", { name: "Customer" })).toHaveAttribute("href", "/contacts");
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
