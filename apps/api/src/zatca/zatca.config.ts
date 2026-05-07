export const ZATCA_ADAPTER_CONFIG = Symbol("ZATCA_ADAPTER_CONFIG");

export type ZatcaAdapterMode = "mock" | "sandbox-disabled" | "sandbox";

export interface ZatcaAdapterConfig {
  mode: ZatcaAdapterMode;
  enableRealNetwork: boolean;
  sandboxBaseUrl?: string;
  simulationBaseUrl?: string;
  productionBaseUrl?: string;
  invalidMode?: string;
}

export interface ZatcaAdapterConfigSummary {
  mode: ZatcaAdapterMode;
  realNetworkEnabled: boolean;
  sandboxBaseUrlConfigured: boolean;
  simulationBaseUrlConfigured: boolean;
  productionBaseUrlConfigured: boolean;
  effectiveRealNetworkEnabled: boolean;
  invalidMode?: string;
}

type EnvSource = Record<string, string | undefined>;

const allowedModes: ZatcaAdapterMode[] = ["mock", "sandbox-disabled", "sandbox"];

export function parseZatcaAdapterMode(value: string | undefined): { mode: ZatcaAdapterMode; invalidMode?: string } {
  const normalized = value?.trim();
  if (!normalized) {
    return { mode: "mock" };
  }

  if (allowedModes.includes(normalized as ZatcaAdapterMode)) {
    return { mode: normalized as ZatcaAdapterMode };
  }

  return { mode: "mock", invalidMode: normalized };
}

export function readZatcaAdapterConfig(env: EnvSource = process.env): ZatcaAdapterConfig {
  const parsedMode = parseZatcaAdapterMode(env.ZATCA_ADAPTER_MODE);

  return {
    mode: parsedMode.mode,
    invalidMode: parsedMode.invalidMode,
    enableRealNetwork: parseBoolean(env.ZATCA_ENABLE_REAL_NETWORK),
    sandboxBaseUrl: optionalText(env.ZATCA_SANDBOX_BASE_URL),
    simulationBaseUrl: optionalText(env.ZATCA_SIMULATION_BASE_URL),
    productionBaseUrl: optionalText(env.ZATCA_PRODUCTION_BASE_URL),
  };
}

export function isZatcaRealNetworkAllowed(config: ZatcaAdapterConfig): boolean {
  return config.mode === "sandbox" && config.enableRealNetwork && Boolean(config.sandboxBaseUrl);
}

export function summarizeZatcaAdapterConfig(config: ZatcaAdapterConfig): ZatcaAdapterConfigSummary {
  return {
    mode: config.mode,
    invalidMode: config.invalidMode,
    realNetworkEnabled: config.enableRealNetwork,
    sandboxBaseUrlConfigured: Boolean(config.sandboxBaseUrl),
    simulationBaseUrlConfigured: Boolean(config.simulationBaseUrl),
    productionBaseUrlConfigured: Boolean(config.productionBaseUrl),
    effectiveRealNetworkEnabled: isZatcaRealNetworkAllowed(config),
  };
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
