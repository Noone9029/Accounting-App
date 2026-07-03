import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { UaeEinvoiceReadinessPanel } from "./uae-einvoice-readiness-panel";
import type { ComplianceSourceReadinessResponse } from "@/lib/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe("UaeEinvoiceReadinessPanel", () => {
  it("renders invoice readiness with conservative local-only copy", () => {
    render(
      <UaeEinvoiceReadinessPanel
        title="UAE eInvoicing/PINT-AE readiness"
        response={readinessFixture()}
        actionLoading={false}
        canValidate
        onValidate={jest.fn()}
      />,
    );

    expect(screen.getByText("UAE eInvoicing/PINT-AE readiness")).toBeInTheDocument();
    expect(screen.getByText("Seller")).toBeInTheDocument();
    expect(screen.getByText("Buyer")).toBeInTheDocument();
    expect(screen.getByText("Tax identity")).toBeInTheDocument();
    expect(screen.getByText("Peppol participant readiness")).toBeInTheDocument();
    expect(screen.getByText("Official PINT-AE XML can be generated locally")).toBeInTheDocument();
    expect(screen.getByText(/ASP validation is not connected yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate UAE eInvoice readiness" })).toBeEnabled();
    expect(screen.getByText(/ASP validation not connected yet; no network, no ASP submission, no FTA reporting/i)).toBeInTheDocument();
    expect(screen.queryByText(/FTA certified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Peppol certified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/official UAE eInvoicing provider/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/accredited ASP/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ASP accepted/i)).not.toBeInTheDocument();
  });

  it("renders permission-denied state for local validation action", () => {
    render(
      <UaeEinvoiceReadinessPanel
        title="UAE eInvoicing/PINT-AE readiness"
        response={readinessFixture()}
        actionLoading={false}
        canValidate={false}
        onValidate={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Validate UAE eInvoice readiness" })).toBeDisabled();
    expect(screen.getByText(/Requires compliance prepare and local validation permissions/i)).toBeInTheDocument();
  });

  it("renders credit-note original reference readiness", () => {
    render(
      <UaeEinvoiceReadinessPanel
        title="UAE credit-note eInvoicing/PINT-AE readiness"
        response={readinessFixture("credit-note")}
        actionLoading={false}
        canValidate
        onValidate={jest.fn()}
      />,
    );

    expect(screen.getByText("Original invoice/reference readiness")).toBeInTheDocument();
    expect(screen.getByText("Credit-note reason")).toBeInTheDocument();
  });

  it("shows official local XML readiness only when required local fields pass", () => {
    render(
      <UaeEinvoiceReadinessPanel
        title="UAE eInvoicing/PINT-AE readiness"
        response={{
          ...readinessFixture(),
          canAttemptLocalXmlGeneration: false,
          readiness: { ...readinessFixture().readiness, canAttemptLocalXmlGeneration: false, status: "NEEDS_DATA" },
        }}
        actionLoading={false}
        canValidate
        onValidate={jest.fn()}
      />,
    );

    expect(screen.getByText("Needs local readiness data")).toBeInTheDocument();
    expect(screen.queryByText("Official PINT-AE XML can be generated locally")).not.toBeInTheDocument();
  });

  it("renders static readiness panel controls and conservative copy in Arabic", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <UaeEinvoiceReadinessPanel
          title="UAE eInvoicing/PINT-AE readiness"
          response={readinessFixture()}
          actionLoading={false}
          canValidate={false}
          onValidate={jest.fn()}
        />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("يمكن إنشاء XML الرسمي PINT-AE محليا")).toBeInTheDocument();
    expect(screen.getByText(/جاهزية محلية وإنشاء XML رسمي/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "التحقق من جاهزية الفاتورة الإلكترونية الإماراتية" })).toBeDisabled();
    expect(screen.getByText(/يتطلب صلاحيات تحضير الامتثال والتحقق المحلي/)).toBeInTheDocument();
    expect(screen.getByText(/تحقق ASP غير متصل بعد؛ لا شبكة/)).toBeInTheDocument();
  });
});

function readinessFixture(kind: "invoice" | "credit-note" = "invoice"): ComplianceSourceReadinessResponse {
  const section = (label: string) => ({
    label,
    status: "READY_FOR_VALIDATION" as const,
    checks: [{ key: `${label}_CHECK`, label: `${label} check`, status: "PASS" as const, detail: "Configured." }],
  });
  return {
    posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
    sourceType: kind === "invoice" ? "SALES_INVOICE" : "CREDIT_NOTE",
    sourceId: "source-1",
    sourceStatus: "FINALIZED",
    localOnly: true,
    noNetwork: true,
    noAspSubmission: true,
    noFtaReporting: true,
    productionCompliance: false,
    canAttemptLocalXmlGeneration: true,
    readiness: {
      kind,
      status: "READY_FOR_VALIDATION",
      seller: section("Seller"),
      buyer: section("Buyer"),
      invoiceFields: section("Required invoice fields"),
      taxIdentity: section("Tax identity"),
      peppolParticipant: section("Peppol participant readiness"),
      originalReference:
        kind === "credit-note"
          ? {
              label: "Original invoice/reference readiness",
              status: "READY_FOR_VALIDATION",
              checks: [
                { key: "CREDIT_NOTE_REASON", label: "Credit-note reason", status: "PASS", detail: "Configured." },
                { key: "ORIGINAL_INVOICE_REFERENCE", label: "Original invoice reference", status: "PASS", detail: "Configured." },
              ],
            }
          : undefined,
      canAttemptLocalXmlGeneration: true,
      validation: { valid: true, issues: [] },
      warnings: [],
    },
    complianceDocument: {
      id: "doc-1",
      sourceType: kind === "invoice" ? "SALES_INVOICE" : "CREDIT_NOTE",
      sourceId: "source-1",
      documentType: kind === "invoice" ? "TAX_INVOICE" : "TAX_CREDIT_NOTE",
      status: "READY_FOR_ASP",
      documentNumber: kind === "invoice" ? "INV-001" : "CN-001",
      latestValidationStatus: "PASSED",
      validationResults: [{ id: "validation-1", status: "PASSED", summary: "Official local PINT-AE XML serialization passed. ASP validation is not connected." }],
      archiveRecords: [{ id: "archive-1", artifactType: "XML", filename: "INV-001.xml", mimeType: "application/xml", storageProvider: "metadata-only", contentHash: "hash", sizeBytes: 100 }],
    },
  };
}
