import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ComplianceSettingsPage from "./page";

const getComplianceReadinessMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/compliance", () => ({
  complianceStatusLabel: (status: string) => status.replace(/_/g, " "),
  getComplianceReadiness: () => getComplianceReadinessMock(),
}));

describe("ComplianceSettingsPage", () => {
  beforeEach(() => {
    getComplianceReadinessMock.mockReset();
    getComplianceReadinessMock.mockResolvedValue({
      posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
      claim: "UAE eInvoicing-ready / Peppol PINT-AE-ready data preparation with disabled ASP connectivity.",
      prohibitedClaims: ["FTA certified", "Peppol certified", "Official UAE eInvoicing provider", "Accredited ASP"],
      noNetworkByDefault: true,
      countries: [
        { code: "AE", module: "uae-peppol-pint-ae", status: "ACTIVE_FOUNDATION" },
        { code: "SA", module: "ksa-zatca", status: "PARKED_NO_PRODUCTION_NETWORK" },
      ],
      uae: {
        framework: "Five-corner Peppol/ASP model.",
        deadlines: [{ segment: "Annual revenue >= AED 50m", appointAspBy: "2026-07-31", implementBy: "2027-01-01" }],
        sources: ["https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/"],
        expectedParticipantId: "02351234567890",
        readiness: {
          status: "READY_FOR_VALIDATION",
          checks: [{ key: "ORG_TIN", label: "Organization 10-digit TIN", status: "PASS", detail: "Configured." }],
          warnings: ["UAE readiness is local validation only; it is not ASP accreditation, FTA certification, or production submission."],
        },
        buyerEndpointCoverage: { activeBuyerCount: 2, buyerPeppolParticipantCount: 1 },
      },
      documentStatusCounts: {},
    });
  });

  it("renders controlled-beta UAE readiness without accreditation claims", async () => {
    render(<ComplianceSettingsPage />);

    expect(await screen.findByText("Compliance readiness")).toBeInTheDocument();
    expect(screen.getByText(/No ASP, FTA, ZATCA, signing/i)).toBeInTheDocument();
    expect(screen.getByText(/Organization 10-digit TIN/i)).toBeInTheDocument();
    expect(screen.getByText(/Accredited ASP/i)).toBeInTheDocument();
    expect(screen.getByText(/not ASP accreditation/i)).toBeInTheDocument();
  });
});
