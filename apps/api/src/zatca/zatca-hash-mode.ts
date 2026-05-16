export type ZatcaHashMode = "LOCAL_DETERMINISTIC" | "SDK_GENERATED";

export interface ZatcaHashModeConfig {
  mode: ZatcaHashMode;
  envValue: "local" | "sdk";
  sdkModeRequested: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export function readZatcaHashModeConfig(sourceEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): ZatcaHashModeConfig {
  const rawValue = String(sourceEnv.ZATCA_HASH_MODE ?? "local").trim().toLowerCase();
  const warnings: string[] = [];

  if (rawValue === "sdk" || rawValue === "sdk_generated") {
    return {
      mode: "SDK_GENERATED",
      envValue: "sdk",
      sdkModeRequested: true,
      blockingReasons: ["SDK hash mode requires explicit per-EGS enablement before LedgerByte stores SDK-generated hashes."],
      warnings: ["SDK hash mode requires ZATCA_SDK_EXECUTION_ENABLED=true, Java 11-14, official SDK paths, and a fresh EGS unit before generating invoice metadata."],
    };
  }

  if (rawValue && rawValue !== "local" && rawValue !== "local_deterministic") {
    warnings.push(`Unknown ZATCA_HASH_MODE '${rawValue}' ignored; local deterministic hash mode remains active.`);
  }

  return {
    mode: "LOCAL_DETERMINISTIC",
    envValue: "local",
    sdkModeRequested: false,
    blockingReasons: [],
    warnings,
  };
}
