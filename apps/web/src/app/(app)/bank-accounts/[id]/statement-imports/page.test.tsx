import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ClientParserPreview, ImportResultPanel, StatementImportGuidance } from "./page";
import type { BankStatementImport } from "@/lib/types";

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

  it("renders parser preview counts, warnings, and mobile-safe table", () => {
    render(
      <ClientParserPreview
        currency="SAR"
        preview={{
          format: "CSV",
          rowCount: 2,
          validRowCount: 1,
          invalidRowCount: 1,
          duplicateCandidateCount: 1,
          detectedColumns: ["date", "description", "amount"],
          errors: [{ rowNumber: 2, message: "Invalid date." }],
          warnings: [{ rowNumber: 1, message: "This row may duplicate another row in this file." }],
          rows: [
            {
              rowNumber: 1,
              date: "2026-05-13",
              description: "Receipt",
              reference: "PAY-1",
              debit: "0.0000",
              credit: "100.0000",
              duplicateCandidate: true,
              errors: [],
              warnings: ["This row may duplicate another row in this file."],
            },
            {
              rowNumber: 2,
              date: "bad-date",
              description: "Fee",
              debit: "0.0000",
              credit: "0.0000",
              duplicateCandidate: false,
              errors: ["Invalid date."],
              warnings: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Local parser preview")).toBeInTheDocument();
    expect(screen.getByText("Duplicate candidates")).toBeInTheDocument();
    expect(screen.getByText("Row 2: Invalid date.")).toBeInTheDocument();
    expect(screen.getByText(/does not upload bank credentials or connect to a live bank feed/)).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
  });

  it("renders import result next actions without live bank wording", () => {
    render(
      <ImportResultPanel
        profileId="bank-1"
        imported={{
          id: "import-1",
          organizationId: "org-1",
          bankAccountProfileId: "bank-1",
          importedById: "user-1",
          filename: "statement.csv",
          sourceType: "CSV",
          status: "IMPORTED",
          statementStartDate: "2026-05-13",
          statementEndDate: "2026-05-14",
          openingStatementBalance: null,
          closingStatementBalance: null,
          rowCount: 2,
          importedAt: "2026-05-14",
          createdAt: "2026-05-14",
          updatedAt: "2026-05-14",
          importSummary: {
            sourceRowCount: 3,
            importedRowCount: 2,
            invalidRowCount: 1,
            totalCredits: "100.0000",
            totalDebits: "15.0000",
            warnings: ["Row 3 may duplicate an existing statement transaction."],
          },
        } satisfies BankStatementImport}
      />,
    );

    expect(screen.getByText("Statement import saved")).toBeInTheDocument();
    expect(screen.getByText(/manual statement batch with 2 rows and skipped 1 invalid rows/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Open reconciliation" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
    expect(screen.queryByText(/live bank sync/i)).not.toBeInTheDocument();
  });
});
