import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { StatementImportGuidance } from "./page";

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

describe("statement import guidance", () => {
  it("states that imports are manual and links to matching surfaces", () => {
    render(<StatementImportGuidance profileId="bank-1" />);

    expect(screen.getByText("Manual statement import")).toBeInTheDocument();
    expect(screen.getByText(/do not connect to a live bank feed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Reconciliation summary" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
  });
});
