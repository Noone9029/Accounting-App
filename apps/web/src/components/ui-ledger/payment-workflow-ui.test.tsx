import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { AllocationTable } from "./allocation-table";
import { PaymentStatusBadge } from "./payment-method-badge";
import { PaymentSummaryCard } from "./payment-summary-card";

describe("payment workflow UI wrappers", () => {
  it("renders payment summary rows with emphasized totals", () => {
    render(
      <PaymentSummaryCard
        rows={[
          { label: "Amount paid", value: "SAR 115.00" },
          { label: "Allocated", value: "SAR 100.00" },
          { label: "Unapplied", value: "SAR 15.00", emphasized: true },
        ]}
      />,
    );

    expect(screen.getByText("Payment summary")).toBeInTheDocument();
    expect(screen.getByText("Amount paid")).toBeInTheDocument();
    expect(screen.getByText("SAR 15.00")).toBeInTheDocument();
  });

  it("maps payment statuses to readable badges", () => {
    const { rerender } = render(<PaymentStatusBadge status="POSTED" />);

    expect(screen.getByText("Posted")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="VOIDED" />);
    expect(screen.getByText("Voided")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="DRAFT" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders allocation rows without changing linked document labels", () => {
    render(
      <AllocationTable
        columns={[
          { key: "document", label: "Document" },
          { key: "balance", label: "Balance due" },
        ]}
        rows={[{ id: "row-1", document: "INV-001", balance: "SAR 115.00" }]}
        rowKey={(row) => row.id}
        renderCell={(row, columnKey) => (columnKey === "document" ? row.document : row.balance)}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByText("SAR 115.00")).toBeInTheDocument();
  });
});
