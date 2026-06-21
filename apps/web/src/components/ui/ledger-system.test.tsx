import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerEmptyState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMetadataRow,
  LedgerPageHeader,
  LedgerSegmentedControl,
  LedgerSkeleton,
  LedgerStatusBadge,
  LedgerTableShell,
  LedgerToolbar,
  buttonClassName,
} from "./ledger-system";

describe("ledger UI system", () => {
  it("renders accessible page labels and action buttons with icons", () => {
    render(
      <LedgerPageHeader
        eyebrow="Sales / AR"
        title="Sales invoices"
        description="Draft and finalized customer invoices."
        badge={<LedgerStatusBadge tone="info">Controlled beta</LedgerStatusBadge>}
        actions={
          <LedgerButton icon={Plus} variant="primary">
            Create invoice
          </LedgerButton>
        }
      />,
    );

    expect(screen.getByText("Sales / AR")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales invoices" })).toBeInTheDocument();
    expect(screen.getByText("Controlled beta")).toHaveClass("bg-blue-50");
    expect(screen.getByRole("button", { name: "Create invoice" })).toBeEnabled();
  });

  it("groups toolbar content without hiding actions", () => {
    render(
      <LedgerToolbar title="Review queue" description="Rows that need operator attention." actions={<LedgerButton>Export</LedgerButton>}>
        <p>12 rows</p>
      </LedgerToolbar>,
    );

    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("Rows that need operator attention.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText("12 rows")).toBeInTheDocument();
  });

  it("provides consistent form field primitives and class behavior", () => {
    render(
      <LedgerFieldLabel>
        <LedgerFieldText>Customer</LedgerFieldText>
        <LedgerInput aria-label="Customer" placeholder="Search customer" />
        <LedgerFieldHelp>Choose the customer before entering invoice lines.</LedgerFieldHelp>
      </LedgerFieldLabel>,
    );

    expect(screen.getByLabelText("Customer")).toHaveAttribute("placeholder", "Search customer");
    expect(screen.getByLabelText("Customer")).toHaveClass("focus:border-palm");
    expect(buttonClassName({ variant: "danger" })).toContain("text-rosewood");
    expect(screen.getByText("Choose the customer before entering invoice lines.")).toBeInTheDocument();
  });

  it("supports segmented controls with pressed state", () => {
    const onChange = jest.fn();

    render(
      <LedgerSegmentedControl
        label="Status"
        value="all"
        onChange={onChange}
        options={[
          { value: "all", label: "All" },
          { value: "draft", label: "Draft" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith("draft");
  });

  it("renders empty, loading, and error states with accessible roles", () => {
    render(
      <div>
        <LedgerEmptyState title="No invoices found" description="Create a draft invoice when ready." />
        <LedgerSkeleton label="Loading invoices" rows={2} />
        <LedgerAlert tone="danger" title="Unable to load invoices">
          Try again after checking the selected organization.
        </LedgerAlert>
      </div>,
    );

    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("No invoices found");
    expect(screen.getByLabelText("Loading invoices")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load invoices");
  });

  it("wraps tables and metadata in scan-friendly shells", () => {
    render(
      <div>
        <LedgerTableShell minWidth="1200px">
          <table>
            <tbody>
              <tr>
                <td>INV-1001</td>
              </tr>
            </tbody>
          </table>
        </LedgerTableShell>
        <LedgerMetadataRow items={[{ label: "Currency", value: "AED" }]} />
      </div>,
    );

    expect(screen.getByText("INV-1001")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("AED")).toBeInTheDocument();
  });
});
