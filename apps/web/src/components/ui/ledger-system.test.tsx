import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { DataTable, FieldHelp, FieldLabel, FieldText, LedgerButton, LedgerIconButton, LedgerInput, SegmentedControl, Toolbar } from "../ui-ledger";

describe("ledger UI system", () => {
  it("renders accessible action buttons with icons", () => {
    render(
      <div>
        <LedgerButton icon={Plus} variant="primary">
          Create invoice
        </LedgerButton>
        <LedgerIconButton label="Open help" icon={Plus} />
      </div>,
    );

    expect(screen.getByRole("button", { name: "Create invoice" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Open help" })).toHaveAttribute("title", "Open help");
  });

  it("groups toolbar content without hiding the actions", () => {
    render(
      <Toolbar title="Review queue" description="Rows that need operator attention." actions={<LedgerButton>Export</LedgerButton>}>
        <p>12 rows</p>
      </Toolbar>,
    );

    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByText("Rows that need operator attention.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText("12 rows")).toBeInTheDocument();
  });

  it("provides consistent form field primitives", () => {
    render(
      <FieldLabel>
        <FieldText>Customer</FieldText>
        <LedgerInput aria-label="Customer" placeholder="Search customer" />
        <FieldHelp>Choose the customer before entering invoice lines.</FieldHelp>
      </FieldLabel>,
    );

    expect(screen.getByLabelText("Customer")).toHaveAttribute("placeholder", "Search customer");
    expect(screen.getByText("Choose the customer before entering invoice lines.")).toBeInTheDocument();
  });

  it("supports segmented controls with pressed state", async () => {
    const onChange = jest.fn();

    render(
      <SegmentedControl
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

  it("wraps data tables in a horizontal shell", () => {
    render(
      <DataTable minWidth="1200px">
        <tbody>
          <tr>
            <td>INV-1001</td>
          </tr>
        </tbody>
      </DataTable>,
    );

    expect(screen.getByText("INV-1001")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
