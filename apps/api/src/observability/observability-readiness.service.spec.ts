import { ObservabilityReadinessService } from "./observability-readiness.service";

describe("ObservabilityReadinessService", () => {
  it("reports observability foundations and external telemetry disabled by default", () => {
    const service = makeService();

    expect(service.read()).toMatchObject({
      requestId: {
        enabled: true,
        header: "x-request-id",
        trustedForAuth: false,
      },
      structuredLogging: {
        enabled: true,
        format: "json",
        safeFieldsOnly: true,
      },
      redaction: {
        enabled: true,
        secretsRedacted: true,
        providerPayloadsRedacted: true,
      },
      safeErrors: {
        enabled: true,
        requestIdIncluded: true,
        productionStackTraces: false,
      },
      externalTelemetry: {
        enabled: false,
        sentry: { enabled: false, configured: false },
        openTelemetry: { enabled: false, configured: false },
        defaultState: "disabled",
      },
      noSecretsReturned: true,
    });
  });

  it("does not enable external telemetry when credentials exist but flags are off", () => {
    const service = makeService({
      SENTRY_DSN: "https://public@example.invalid/1",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.invalid",
    });

    expect(service.read().externalTelemetry).toEqual({
      enabled: false,
      sentry: { enabled: false, configured: true },
      openTelemetry: { enabled: false, configured: true },
      defaultState: "disabled",
    });
  });

  it("reports external telemetry enabled only when both configured and explicitly enabled", () => {
    const service = makeService({
      SENTRY_DSN: "https://public@example.invalid/1",
      LEDGERBYTE_SENTRY_ENABLED: "true",
      OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.invalid",
      LEDGERBYTE_OTEL_ENABLED: "true",
    });

    expect(service.read().externalTelemetry).toMatchObject({
      enabled: true,
      sentry: { enabled: true, configured: true },
      openTelemetry: { enabled: true, configured: true },
    });
  });
});

function makeService(env: Record<string, string | undefined> = {}) {
  return new ObservabilityReadinessService({ get: jest.fn((key: string) => env[key]) } as never);
}
