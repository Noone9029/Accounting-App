import { BadRequestException } from "@nestjs/common";
import { BankIntegrationProvider } from "@prisma/client";
import { redactForDiagnostics } from "../observability/redaction";

export interface BankProviderAdapter {
  readonly provider: BankIntegrationProvider;
  readonly canCreateConnections: boolean;
  readonly canRecordLocalSync: boolean;
  readonly canReleasePayments: boolean;
  readonly stateLabel: "Disabled" | "Local Mock Only" | "Blocked" | "Needs Configuration" | "Future Provider";
  readonly warnings: string[];
  redactPayload(payload: unknown): unknown;
}

export class DisabledBankProviderAdapter implements BankProviderAdapter {
  readonly provider = BankIntegrationProvider.NONE;
  readonly canCreateConnections = false;
  readonly canRecordLocalSync = false;
  readonly canReleasePayments = false;
  readonly stateLabel = "Disabled" as const;
  readonly warnings = ["Bank integration provider is disabled. Manual import and reconciliation remain supported."];

  redactPayload(payload: unknown): unknown {
    return redactForDiagnostics(payload);
  }
}

export class MockWioBankProviderAdapter implements BankProviderAdapter {
  readonly provider = BankIntegrationProvider.MOCK_WIO;
  readonly canCreateConnections = true;
  readonly canRecordLocalSync = true;
  readonly canReleasePayments = false;
  readonly stateLabel = "Local Mock Only" as const;
  readonly warnings = ["MOCK_WIO is local/test-only and never releases money or connects to Wio."];

  redactPayload(payload: unknown): unknown {
    return redactForDiagnostics(payload);
  }
}

export class WioDisabledPlaceholderAdapter implements BankProviderAdapter {
  readonly provider = BankIntegrationProvider.WIO_DISABLED_PLACEHOLDER;
  readonly canCreateConnections = false;
  readonly canRecordLocalSync = false;
  readonly canReleasePayments = false;
  readonly stateLabel = "Future Provider" as const;
  readonly warnings = ["Real Wio integration is a disabled placeholder. No Wio API calls, bank credentials, or payment initiation are implemented."];

  redactPayload(payload: unknown): unknown {
    return redactForDiagnostics(payload);
  }
}

export function resolveBankProviderAdapter(rawProvider: string | undefined, productionLike: boolean): BankProviderAdapter {
  const provider = normalizeBankProvider(rawProvider);
  if (provider === BankIntegrationProvider.MOCK_WIO) {
    if (productionLike) {
      throw new BadRequestException("MOCK_WIO bank provider is not allowed in production-like modes.");
    }
    return new MockWioBankProviderAdapter();
  }
  if (provider === BankIntegrationProvider.WIO_DISABLED_PLACEHOLDER) {
    return new WioDisabledPlaceholderAdapter();
  }
  return new DisabledBankProviderAdapter();
}

export function normalizeBankProvider(value: string | undefined): BankIntegrationProvider {
  const normalized = value?.trim().toUpperCase() || BankIntegrationProvider.NONE;
  if (normalized === BankIntegrationProvider.MOCK_WIO) return BankIntegrationProvider.MOCK_WIO;
  if (normalized === BankIntegrationProvider.WIO_DISABLED_PLACEHOLDER || normalized === "WIO") return BankIntegrationProvider.WIO_DISABLED_PLACEHOLDER;
  return BankIntegrationProvider.NONE;
}
