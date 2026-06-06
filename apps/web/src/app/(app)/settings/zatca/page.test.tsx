import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ZatcaSettingsPage from "./page";
import type { ZatcaReadinessSection, ZatcaReadinessSummary } from "@/lib/types";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => false,
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadAuthenticatedFile: jest.fn(),
}));

describe("ZATCA settings preparation gates", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/zatca/profile") return Promise.resolve(profile());
      if (path === "/zatca/adapter-config") return Promise.resolve(adapterConfig());
      if (path === "/zatca/compliance-checklist") return Promise.resolve(complianceChecklist());
      if (path === "/zatca/xml-field-mapping") return Promise.resolve(xmlFieldMapping());
      if (path === "/zatca/readiness") return Promise.resolve(readinessSummary());
      if (path === "/zatca-sdk/readiness") return Promise.resolve(sdkReadiness());
      if (path === "/zatca/egs-units") return Promise.resolve([]);
      if (path === "/zatca/submissions") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("shows preparation-only ZATCA gates without production compliance wording", async () => {
    render(<ZatcaSettingsPage />);

    expect(await screen.findByText("Preparation gates")).toBeInTheDocument();
    expect(screen.getByText("ZATCA production compliance is not enabled. This workspace tracks preparation gates only.")).toBeInTheDocument();
    expect(screen.getByText("Environment separation")).toBeInTheDocument();
    expect(screen.getByText("Key custody decision")).toBeInTheDocument();
    expect(screen.getByText("Invoice eligibility matrix")).toBeInTheDocument();
    expect(screen.getByText("Audit evidence standard")).toBeInTheDocument();
    expect(screen.getByText("Sandbox onboarding")).toBeInTheDocument();
    expect(screen.getByText("SDK validation")).toBeInTheDocument();
    expect(screen.getByText("SDK validation pipeline")).toBeInTheDocument();
    expect(screen.getByText("SDK command")).toBeInTheDocument();
    expect(screen.getByText("Fixture registry")).toBeInTheDocument();
    expect(screen.getByText("Evidence format")).toBeInTheDocument();
    expect(screen.getByText("No-network mode")).toBeInTheDocument();
    expect(screen.getByText("Latest SDK evidence")).toBeInTheDocument();
    expect(screen.getByText("Generated standard XML fixture")).toBeInTheDocument();
    expect(screen.getByText("Generated credit-note XML fixture")).toBeInTheDocument();
    expect(screen.getByText("Generated fixture evidence")).toBeInTheDocument();
    expect(screen.getByText("Generated fixture Java")).toBeInTheDocument();
    expect(
      screen.getByText("SDK validation is local/no-network only. It does not request CSID, sign invoices with production keys, clear invoices, report invoices, or enable production compliance."),
    ).toBeInTheDocument();
    expect(screen.getByText("Generated XML fixture validation is local preparation only. Fixture statuses do not expose XML bodies and do not prove ZATCA compliance.")).toBeInTheDocument();
    expect(screen.getAllByText("Signing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clearance/reporting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF/A-3").length).toBeGreaterThan(0);
    expect(screen.getByText("Production compliance claim")).toBeInTheDocument();
    expect(screen.getByText("Real network calls")).toBeInTheDocument();
    expect(screen.queryByText(/production ZATCA compliance is enabled/i)).not.toBeInTheDocument();
  });
});

function profile() {
  return {
    id: "profile-1",
    organizationId: "org-1",
    environment: "SANDBOX",
    registrationStatus: "DRAFT",
    sellerName: "LedgerByte Test",
    vatNumber: "300000000000003",
    companyIdType: null,
    companyIdNumber: null,
    buildingNumber: "1234",
    streetName: "King Fahd Road",
    district: "Olaya",
    city: "Riyadh",
    postalCode: "12345",
    countryCode: "SA",
    additionalAddressNumber: null,
    businessCategory: "Technology",
    readiness: { ready: true, missingFields: [] },
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  };
}

function adapterConfig() {
  return {
    mode: "mock",
    realNetworkEnabled: false,
    sandboxBaseUrlConfigured: false,
    simulationBaseUrlConfigured: false,
    productionBaseUrlConfigured: false,
    effectiveRealNetworkEnabled: false,
  };
}

function complianceChecklist() {
  return {
    warning: "Local checklist only.",
    summary: { total: 0, byStatus: {}, byRisk: {} },
    groups: {},
  };
}

function xmlFieldMapping() {
  return {
    warning: "Local mapping only.",
    summary: { total: 0, byStatus: {}, byCategory: {} },
    items: [],
  };
}

function readinessSummary(): ZatcaReadinessSummary {
  return {
    warning: "This readiness summary is local engineering guidance only and is not legal certification.",
    status: "BLOCKED",
    localOnly: true,
    productionCompliance: false,
    environmentPolicyDocumented: true,
    keyCustodyDecisionDocumented: true,
    invoiceEligibilityDocumented: true,
    auditEvidenceStandardDocumented: true,
    sandboxOnboardingRunbookDocumented: true,
    sdkValidationReadinessDocumented: true,
    sdkValidationPipelineDocumented: true,
    sdkValidationCommandAvailable: true,
    sdkValidationEvidenceFormatDocumented: true,
    officialFixtureRegistryDocumented: true,
    latestSdkValidationEvidenceStatus: "NOT_RUN",
    sdkValidationNoNetworkOnly: true,
    generatedStandardInvoiceFixtureStatus: "READY_TO_VALIDATE",
    generatedCreditNoteFixtureStatus: "BLOCKED_UNSUPPORTED_JAVA",
    lastGeneratedFixtureEvidenceStatus: "BLOCKED_UNSUPPORTED_JAVA",
    generatedFixtureJavaBlocker: "Detected Java 17.0.16 is outside the SDK-supported range >=11 <15.",
    generatedFixtureNoNetworkOnly: true,
    generatedFixtureProductionCompliance: false,
    productionComplianceEnabled: false,
    realNetworkCallsEnabled: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    sellerProfile: section("SELLER_PROFILE", "READY"),
    egs: section("EGS", "BLOCKED"),
    xml: section("XML", "BLOCKED"),
    sdk: section("XML", "BLOCKED"),
    signing: section("SIGNING", "BLOCKED"),
    keyCustody: section("KEY_CUSTODY", "BLOCKED"),
    csr: section("CSR", "BLOCKED"),
    complianceCsidOnboarding: section("COMPLIANCE_CSID_ONBOARDING", "BLOCKED"),
    complianceCsidCustody: section("COMPLIANCE_CSID_CUSTODY", "BLOCKED"),
    signedArtifactPromotion: section("SIGNED_ARTIFACT_PROMOTION", "BLOCKED"),
    signedArtifactStorage: section("SIGNED_ARTIFACT_STORAGE", "BLOCKED"),
    phase2Qr: section("PHASE_2_QR", "BLOCKED"),
    pdfA3: section("PDF_A3", "BLOCKED"),
    checks: [],
    profileReady: true,
    profileMissingFields: [],
    egsReady: false,
    activeEgsUnit: null,
    localXmlReady: false,
    mockCsidReady: false,
    realNetworkEnabled: false,
    productionReady: false,
    blockingReasons: ["Real ZATCA network calls are disabled by configuration."],
  };
}

function section(scope: ZatcaReadinessSection["scope"], status: ZatcaReadinessSection["status"]): ZatcaReadinessSection {
  return { scope, status, checks: [] };
}

function sdkReadiness() {
  return {
    enabled: false,
    referenceFolderFound: false,
    sdkJarFound: false,
    fatooraLauncherFound: false,
    jqFound: false,
    configDirFound: false,
    workingDirectoryWritable: false,
    supportedCommandsKnown: false,
    javaFound: false,
    javaVersion: null,
    javaMajorVersion: null,
    javaVersionSupported: false,
    projectPathHasSpaces: true,
    canAttemptSdkValidation: false,
    canRunLocalValidation: false,
    blockingReasons: ["ZATCA SDK local execution is disabled."],
    warnings: [],
    suggestedFixes: [],
    timeoutMs: 30000,
  };
}
