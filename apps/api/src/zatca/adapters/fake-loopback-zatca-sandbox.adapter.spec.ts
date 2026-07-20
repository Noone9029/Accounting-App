import { FakeLoopbackZatcaSandboxAdapter } from "./fake-loopback-zatca-sandbox.adapter";

describe("FakeLoopbackZatcaSandboxAdapter", () => {
  it("records a metadata-only in-process operation without exposing a network target or request body", async () => {
    const handler = {
      requestComplianceCsid: jest.fn(),
      requestProductionCsid: jest.fn(),
      submitComplianceCheck: jest.fn().mockResolvedValue({ responseCode: "SIMULATED_ACCEPTED", responsePayload: { validationStatus: "SIMULATED_ACCEPTED" } }),
      submitClearance: jest.fn(),
      submitReporting: jest.fn(),
    };
    const adapter = new FakeLoopbackZatcaSandboxAdapter(handler as never);

    await adapter.submitComplianceCheck({ organizationId: "org", invoiceId: "invoice", invoiceMetadataId: "metadata", egsUnitId: "egs", invoiceXml: "synthetic-only", request: { invoiceUuid: "uuid" } });

    expect(adapter.calls).toEqual(["submitComplianceCheck"]);
    expect(adapter.networkTargets).toEqual([]);
    expect(adapter.getEvidence()).toEqual({ inProcessOnly: true, externalNetworkAttempted: false, operationCount: 1 });
    expect(JSON.stringify(adapter.getEvidence())).not.toContain("synthetic-only");
  });
});
