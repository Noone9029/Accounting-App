import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { GlobalCreateMenu } from "./global-create-menu";

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

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ activeMembership: mockActiveMembership }),
}));

describe("GlobalCreateMenu", () => {
  beforeEach(() => {
    mockActiveMembership = { role: { permissions: ["*"] } };
  });

  it("opens a categorized create menu with the primary accounting actions", () => {
    render(<GlobalCreateMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("dialog", { name: "Create menu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Customers / Sales" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Suppliers / Purchases" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Other / Accounting" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invoice" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.getByRole("link", { name: "Receive payment" })).toHaveAttribute("href", "/sales/customer-payments/new");
    expect(screen.getByRole("link", { name: "Bill" })).toHaveAttribute("href", "/purchases/bills/new");
    expect(screen.getByRole("link", { name: "Expense" })).toHaveAttribute("href", "/purchases/cash-expenses/new");
    expect(screen.getByRole("link", { name: "Journal entry" })).toHaveAttribute("href", "/journal-entries/new");
    expect(screen.getByRole("link", { name: "Add product/service" })).toHaveAttribute("href", "/items");
  });

  it("keeps disabled or unauthorized actions visible but not clickable", () => {
    mockActiveMembership = { role: { permissions: ["salesInvoices.create"] } };

    render(<GlobalCreateMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("link", { name: "Invoice" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.queryByRole("link", { name: "Bill" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bill" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Statement" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Statement" })).toHaveAttribute("title", "Statements are not enabled yet.");
  });

  it("closes on Escape and outside clicks", () => {
    render(
      <div>
        <GlobalCreateMenu />
        <button type="button">Outside</button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("dialog", { name: "Create menu" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Create menu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("dialog", { name: "Create menu" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("dialog", { name: "Create menu" })).not.toBeInTheDocument();
  });

  it("closes after a create action is selected", () => {
    render(<GlobalCreateMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("link", { name: "Invoice" }));

    expect(screen.queryByRole("dialog", { name: "Create menu" })).not.toBeInTheDocument();
  });

  it("renders dense category groups without empty sections", () => {
    render(<GlobalCreateMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    for (const section of screen.getAllByRole("group")) {
      const interactiveCount =
        within(section).queryAllByRole("link").length + within(section).queryAllByRole("button").length;
      expect(interactiveCount).toBeGreaterThan(0);
    }
  });
});
