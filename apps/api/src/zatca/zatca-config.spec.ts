import { HttpZatcaSandboxAdapter } from "./adapters/http-zatca-sandbox.adapter";
import { FutureOfficialZatcaSandboxAdapter } from "./adapters/future-official-zatca-sandbox.adapter";
import { FakeLoopbackZatcaSandboxAdapter } from "./adapters/fake-loopback-zatca-sandbox.adapter";
import { SandboxDisabledZatcaOnboardingAdapter } from "./adapters/sandbox-disabled-zatca-onboarding.adapter";
import { readZatcaAdapterConfig, summarizeZatcaAdapterConfig } from "./zatca.config";

describe("ZATCA adapter config", () => {
  it("defaults to disabled mode with real network disabled", () => {
    const config = readZatcaAdapterConfig({});

    expect(config.mode).toBe("sandbox-disabled");
    expect(config.enableRealNetwork).toBe(false);
    expect(summarizeZatcaAdapterConfig(config)).toMatchObject({
      mode: "sandbox-disabled",
      realNetworkEnabled: false,
      effectiveRealNetworkEnabled: false,
    });
  });

  it("falls back safely when adapter mode is invalid", () => {
    const config = readZatcaAdapterConfig({ ZATCA_ADAPTER_MODE: "definitely-real" });

    expect(config.mode).toBe("sandbox-disabled");
    expect(config.invalidMode).toBe("definitely-real");
    expect(summarizeZatcaAdapterConfig(config).effectiveRealNetworkEnabled).toBe(false);
  });

  it("requires sandbox mode, explicit network flag, and sandbox base URL before network can be effective", () => {
    expect(summarizeZatcaAdapterConfig(readZatcaAdapterConfig({ ZATCA_ADAPTER_MODE: "sandbox" })).effectiveRealNetworkEnabled).toBe(false);
    expect(
      summarizeZatcaAdapterConfig(readZatcaAdapterConfig({ ZATCA_ADAPTER_MODE: "sandbox", ZATCA_ENABLE_REAL_NETWORK: "true" })).effectiveRealNetworkEnabled,
    ).toBe(false);
    expect(
      summarizeZatcaAdapterConfig(
        readZatcaAdapterConfig({
          ZATCA_ADAPTER_MODE: "sandbox",
          ZATCA_ENABLE_REAL_NETWORK: "true",
          ZATCA_SANDBOX_BASE_URL: "https://sandbox.example.invalid",
        }),
      ).effectiveRealNetworkEnabled,
    ).toBe(true);
  });

  it("does not treat production URL configuration as sandbox network enablement", () => {
    const summary = summarizeZatcaAdapterConfig(
      readZatcaAdapterConfig({
        ZATCA_ADAPTER_MODE: "sandbox",
        ZATCA_ENABLE_REAL_NETWORK: "true",
        ZATCA_PRODUCTION_BASE_URL: "https://production.example.invalid",
      }),
    );

    expect(summary.productionBaseUrlConfigured).toBe(true);
    expect(summary.sandboxBaseUrlConfigured).toBe(false);
    expect(summary.effectiveRealNetworkEnabled).toBe(false);
  });
});

describe("ZATCA sandbox adapter safety", () => {
  it("defaults to the disabled adapter mode", () => {
    expect(readZatcaAdapterConfig({}).mode).toBe("sandbox-disabled");
  });

  it("does not read credentials or call fetch before rejecting an unverified official contract", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const credentialReader = jest.fn();
    const adapter = new FutureOfficialZatcaSandboxAdapter({
      mode: "sandbox",
      enableRealNetwork: true,
      sandboxBaseUrl: "https://sandbox.example.invalid",
    }, credentialReader);

    await expect(
      adapter.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: { endpointPath: "/ignored" },
      }),
    ).rejects.toMatchObject({ responseCode: "OFFICIAL_CONTRACT_UNCONFIRMED" });

    expect(credentialReader).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sandbox-disabled adapter returns a clear disabled error", async () => {
    const adapter = new SandboxDisabledZatcaOnboardingAdapter();

    await expect(
      adapter.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: {},
      }),
    ).rejects.toMatchObject({ responseCode: "REAL_NETWORK_DISABLED", message: expect.stringContaining("Real ZATCA network calls are disabled") });
  });

  it("routes loopback tests only through the supplied in-process handler", async () => {
    const loopback = new FakeLoopbackZatcaSandboxAdapter(new SandboxDisabledZatcaOnboardingAdapter());

    await expect(
      loopback.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: {},
      }),
    ).rejects.toMatchObject({ responseCode: "REAL_NETWORK_DISABLED" });

    expect(loopback.calls).toEqual(["submitComplianceCheck"]);
  });

  it("sandbox adapter fails safely when real network is not explicitly enabled", async () => {
    const adapter = new HttpZatcaSandboxAdapter({ mode: "sandbox", enableRealNetwork: false, sandboxBaseUrl: "https://sandbox.example.invalid" });

    await expect(
      adapter.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: {},
      }),
    ).rejects.toMatchObject({ responseCode: "REAL_NETWORK_DISABLED" });
  });

  it("sandbox adapter fails safely when sandbox base URL is missing", async () => {
    const adapter = new HttpZatcaSandboxAdapter({ mode: "sandbox", enableRealNetwork: true });

    await expect(
      adapter.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: {},
      }),
    ).rejects.toMatchObject({ responseCode: "REAL_NETWORK_DISABLED" });
  });

  it("does not guess an official endpoint path even when sandbox network flags are enabled", async () => {
    const adapter = new HttpZatcaSandboxAdapter({ mode: "sandbox", enableRealNetwork: true, sandboxBaseUrl: "https://sandbox.example.invalid" });

    await expect(
      adapter.submitComplianceCheck({
        organizationId: "org-1",
        invoiceId: "invoice-1",
        invoiceMetadataId: "metadata-1",
        egsUnitId: "egs-1",
        invoiceXml: "<Invoice />",
        request: {},
      }),
    ).rejects.toMatchObject({ responseCode: "OFFICIAL_CONTRACT_UNCONFIRMED" });
  });
});
