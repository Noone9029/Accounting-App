import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ReportsIndexPage } from "./report-pages";

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

describe("reports index first-workflow guidance", () => {
  it("points new users to the first report and back to setup guidance", () => {
    render(<ReportsIndexPage />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("First report path")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profit & Loss" })).toHaveAttribute("href", "/reports/profit-and-loss");
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
  });
});
