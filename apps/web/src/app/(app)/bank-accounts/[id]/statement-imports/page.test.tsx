import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  ClientParserPreview,
  ImportResultPanel,
  ServerImportPreviewPanel,
  STATEMENT_IMPORT_FILE_ACCEPT,
  StatementImportGuidance,
  StatementImportTemplateActions,
} from "./page";
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
    expect(screen.getByText(/CSV, XLSX, JSON, OFX, CAMT XML, and MT940/)).toBeInTheDocument();
    expect(screen.getByText(/date, description, reference, bankReference, debit, credit, amount, balance, counterparty, currency/)).toBeInTheDocument();
    expect(screen.getByText(/Use either debit\/credit columns or a signed amount/)).toBeInTheDocument();
    expect(screen.getByText(/ISO currency codes such as SAR, AED, or USD/)).toBeInTheDocument();
    expect(screen.getByText(/do not connect to a live bank feed/)).toBeInTheDocument();
    expect(screen.getByText(/limited parser support for variants/)).toBeInTheDocument();
    expect(screen.getByText(/not a live feed/)).toBeInTheDocument();
    expect(screen.getByText(/Raw bank file bodies are not archived in beta/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Reconciliation summary" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
  });

  it("shows template download action and accepts XLSX uploads", () => {
    const onDownload = jest.fn();

    render(<StatementImportTemplateActions onDownload={onDownload} />);

    expect(screen.getByText("Statement template")).toBeInTheDocument();
    expect(screen.getByText(/canonical CSV template/)).toBeInTheDocument();
    expect(screen.getByText(/first worksheet of an XLSX workbook/)).toBeInTheDocument();
    expect(screen.getByText(/Manual import only; no live bank feed or credentials/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download template" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(STATEMENT_IMPORT_FILE_ACCEPT).toContain(".xlsx");
    expect(STATEMENT_IMPORT_FILE_ACCEPT).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
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
    expect(screen.getByText(/unsupported bank-specific variants fail safely/)).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement?.parentElement).toHaveClass("overflow-x-auto");
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
            skippedRowCount: 1,
            invalidRowCount: 1,
            duplicateExistingCount: 0,
            blockedByClosedReconciliationCount: 0,
            totalCredits: "100.0000",
            totalDebits: "15.0000",
            warnings: ["Row 3 may duplicate an existing statement transaction."],
          },
        } satisfies BankStatementImport}
      />,
    );

    expect(screen.getByText("Statement import saved")).toBeInTheDocument();
    expect(screen.getByText(/manual statement batch with 2 rows and skipped 1 rows/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review unmatched rows" })).toHaveAttribute(
      "href",
      "/bank-accounts/bank-1/statement-transactions?status=UNMATCHED",
    );
    expect(screen.getByRole("link", { name: "Open reconciliation" })).toHaveAttribute("href", "/bank-accounts/bank-1/reconciliation");
    expect(screen.queryByText(/live bank sync/i)).not.toBeInTheDocument();
  });

  it("renders server preview safety summary and row warning badges", () => {
    render(
      <ServerImportPreviewPanel
        currency="SAR"
        preview={{
          filename: "statement.csv",
          rowCount: 3,
          totalCredits: "100.0000",
          totalDebits: "15.0000",
          detectedColumns: ["date", "description", "bankReference", "credit"],
          sourceFormat: "CSV",
          sourceSheetName: null,
          warnings: ["1 row duplicates another row in this file."],
          summary: {
            sourceRowCount: 3,
            validRowCount: 2,
            invalidRowCount: 1,
            importableRowCount: 1,
            duplicateInFileCount: 1,
            duplicateExistingHighConfidenceCount: 1,
            duplicateExistingPossibleCount: 0,
            duplicateExistingCount: 1,
            closedReconciliationOverlapCount: 1,
            openReconciliationOverlapCount: 1,
            currencyMismatchCount: 0,
            blockedRowCount: 3,
          },
          rowWarnings: [
            {
              rowNumber: 2,
              code: "DUPLICATE_EXISTING_HIGH_CONFIDENCE",
              severity: "blocking",
              message: "Row 2 has the same bank reference, date, amount, and currency as an existing statement transaction.",
              action: "Skip this row unless the existing transaction has been voided and reviewed.",
            },
            {
              rowNumber: 3,
              code: "CLOSED_RECONCILIATION_OVERLAP",
              severity: "blocking",
              message: "Row 3 falls inside closed reconciliation REC-000001.",
              action: "Do not import this row into a closed reconciliation period.",
            },
            {
              rowNumber: 2,
              code: "OPEN_RECONCILIATION_OVERLAP",
              severity: "warning",
              message: "Row 2 overlaps open reconciliation REC-OPEN-1.",
              action: "Review the open reconciliation before closing it.",
            },
          ],
          validRows: [
            {
              rowNumber: 2,
              date: "2026-05-13T00:00:00.000Z",
              description: "Customer receipt",
              reference: "PAY-1",
              bankReference: "BANK-REF-1",
              type: "CREDIT",
              amount: "100.0000",
              rawData: {},
            },
            {
              rowNumber: 3,
              date: "2026-05-14T00:00:00.000Z",
              description: "Bank fee",
              reference: "FEE-1",
              type: "DEBIT",
              amount: "15.0000",
              rawData: {},
            },
          ],
          invalidRows: [{ rowNumber: 4, errors: ["Row 4 duplicates row 2 in this import file."], rawData: {} }],
        }}
      />,
    );

    expect(screen.getByText("Importable")).toBeInTheDocument();
    expect(screen.getByText("Duplicate rows")).toBeInTheDocument();
    expect(screen.getByText("Closed overlaps")).toBeInTheDocument();
    expect(screen.getByText(/1 rows are importable, 2 duplicate rows need review, 3 rows block full import/)).toBeInTheDocument();
    expect(screen.getByText("Existing duplicate")).toBeInTheDocument();
    expect(screen.getByText("Closed period")).toBeInTheDocument();
    expect(screen.getByText("Open reconciliation")).toBeInTheDocument();
    expect(screen.getByText(/Row 4 duplicates row 2 in this import file/)).toBeInTheDocument();
  });
});
