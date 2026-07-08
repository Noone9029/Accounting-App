import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ObservabilityReadiness {
  requestId: {
    enabled: true;
    header: "x-request-id";
    acceptedClientHeader: true;
    generatedWhenMissing: true;
    trustedForAuth: false;
  };
  structuredLogging: {
    enabled: true;
    format: "json";
    safeFieldsOnly: true;
  };
  redaction: {
    enabled: true;
    secretsRedacted: true;
    providerPayloadsRedacted: true;
  };
  safeErrors: {
    enabled: true;
    requestIdIncluded: true;
    productionStackTraces: false;
  };
  externalTelemetry: {
    enabled: boolean;
    sentry: { enabled: boolean; configured: boolean };
    openTelemetry: { enabled: boolean; configured: boolean };
    defaultState: "disabled";
  };
  noSecretsReturned: true;
  warnings: string[];
}

@Injectable()
export class ObservabilityReadinessService {
  constructor(private readonly config: ConfigService) {}

  read(): ObservabilityReadiness {
    const sentryConfigured = Boolean(this.config.get<string>("SENTRY_DSN")?.trim());
    const sentryEnabled = this.booleanConfig("LEDGERBYTE_SENTRY_ENABLED") && sentryConfigured;
    const openTelemetryConfigured = Boolean(this.config.get<string>("OTEL_EXPORTER_OTLP_ENDPOINT")?.trim());
    const openTelemetryEnabled = this.booleanConfig("LEDGERBYTE_OTEL_ENABLED") && openTelemetryConfigured;

    return {
      requestId: {
        enabled: true,
        header: "x-request-id",
        acceptedClientHeader: true,
        generatedWhenMissing: true,
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
        enabled: sentryEnabled || openTelemetryEnabled,
        sentry: { enabled: sentryEnabled, configured: sentryConfigured },
        openTelemetry: { enabled: openTelemetryEnabled, configured: openTelemetryConfigured },
        defaultState: "disabled",
      },
      noSecretsReturned: true,
      warnings: [
        "External telemetry is disabled unless explicitly configured and enabled.",
        "Diagnostics readiness never returns secrets, environment values, provider payloads, or tenant data.",
      ],
    };
  }

  private booleanConfig(key: string): boolean {
    return this.config.get<string>(key)?.trim().toLowerCase() === "true";
  }
}
