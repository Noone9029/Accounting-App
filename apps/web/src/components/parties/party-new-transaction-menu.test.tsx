import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import { PartyNewTransactionMenu } from "./party-new-transaction-menu";

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

describe("PartyNewTransactionMenu", () => {
  it("shows customer transaction actions with customer context", () => {
    render(<PartyNewTransactionMenu partyId="customer-1" partyType="customer" userPermissions={{ role: { permissions: ["*"] } }} />);

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));

    expect(screen.getByRole("menuitem", { name: "Invoice" })).toHaveAttribute(
      "href",
      "/sales/invoices/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.getByRole("menuitem", { name: "Receive Payment" })).toHaveAttribute(
      "href",
      "/sales/customer-payments/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.getByRole("menuitem", { name: "Credit Note" })).toHaveAttribute(
      "href",
      "/sales/credit-notes/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.getByRole("menuitem", { name: "Delivery Note" })).toHaveAttribute(
      "href",
      "/sales/delivery-notes/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(screen.queryByRole("menuitem", { name: "Bill" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sales Order" })).toBeDisabled();
  });

  it("shows supplier transaction actions with supplier context", () => {
    render(<PartyNewTransactionMenu partyId="supplier-1" partyType="supplier" userPermissions={{ role: { permissions: ["*"] } }} />);

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));

    expect(screen.getByRole("menuitem", { name: "Bill" })).toHaveAttribute(
      "href",
      "/purchases/bills/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(screen.getByRole("menuitem", { name: "Expense" })).toHaveAttribute(
      "href",
      "/purchases/cash-expenses/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(screen.getByRole("menuitem", { name: "Purchase Order" })).toHaveAttribute(
      "href",
      "/purchases/purchase-orders/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(screen.getByRole("menuitem", { name: "Item Receipt" })).toHaveAttribute(
      "href",
      "/inventory/purchase-receipts/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1&sourceType=standalone",
    );
    expect(screen.queryByRole("menuitem", { name: "Invoice" })).not.toBeInTheDocument();
  });

  it("hides actions without create permission and closes on Escape", () => {
    render(
      <PartyNewTransactionMenu
        partyId="supplier-1"
        partyType="supplier"
        userPermissions={{ role: { permissions: [PERMISSIONS.cashExpenses.create] } }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));

    expect(screen.getByRole("menuitem", { name: "Expense" })).toHaveAttribute(
      "href",
      "/purchases/cash-expenses/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(screen.queryByRole("menuitem", { name: "Bill" })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "New transaction" })).not.toBeInTheDocument();
  });
});
