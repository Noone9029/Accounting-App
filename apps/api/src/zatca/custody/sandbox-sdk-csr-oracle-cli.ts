import {
  OFFICIAL_ZATCA_SDK_JAR_SHA256,
  OFFICIAL_ZATCA_SDK_JAVA_VERSION,
  OFFICIAL_ZATCA_SDK_VERSION,
} from "./sandbox-sdk-csr-oracle";

const REQUIRED_ARGUMENTS = Object.freeze([
  "--simulation",
  "--no-network",
  "--metadata-json",
]);
const MAX_METADATA_JSON_BYTES = 16 * 1024;
const SKIPPED_METADATA_KEYS = Object.freeze([
  "arc",
  "status",
  "officialSdkTier2Executed",
  "networkCallsMade",
  "otpUsed",
  "csidRequested",
  "productionExecution",
  "sensitiveBodiesReturned",
] as const);
const PASSED_METADATA_KEYS = Object.freeze([
  "arc",
  "status",
  "officialSdkTier2Executed",
  "jdkVersion",
  "sdkVersion",
  "sdkJarSha256",
  "sdkChecksumMatch",
  "sdkConfigChecksumMatch",
  "jdkRuntimeChecksumsVerified",
  "simulationFlagVerified",
  "noNetworkArgumentVerified",
  "argumentAllowlistVerified",
  "csrSignatureVerified",
  "csrAlgorithm",
  "csrAlgorithmVerified",
  "csrCurve",
  "csrCurveVerified",
  "csrSubjectVerified",
  "requestedExtensionsVerified",
  "csrTemplate",
  "csrTemplateVerified",
  "privateKeyMatchesCsr",
  "custodyPublicKeyMatchesCsr",
  "plaintextKeyRemovedBeforeCustodyVerification",
  "plaintextKeyFileRemoved",
  "csrFileRemoved",
  "configFileRemoved",
  "sdkConfigFileRemoved",
  "launcherWorkspaceRemoved",
  "rawOutputRemoved",
  "disposableCustodyMetadataEmpty",
  "cleanupComplete",
  "networkGuardMarkersPresent",
  "networkIsolationVerified",
  "networkCallsMade",
  "otpUsed",
  "csidRequested",
  "sensitiveBodiesReturned",
  "productionExecution",
] as const);

export interface SandboxSdkCsrOracleCliOptions {
  simulation: true;
  noNetwork: true;
  metadataJson: true;
}

export interface SandboxSdkCsrOracleCliStreams {
  output: { write(chunk: string): unknown };
  error: { write(chunk: string): unknown };
}

export class SandboxSdkCsrOracleCliError extends Error {
  readonly code = "ZATCA_SDK_CSR_ARGUMENTS_REJECTED";

  constructor() {
    super("ZATCA SDK CSR oracle arguments were rejected.");
    this.name = "SandboxSdkCsrOracleCliError";
  }
}

export function parseSandboxSdkCsrOracleCliArguments(
  argv: readonly string[],
): SandboxSdkCsrOracleCliOptions {
  const normalized = argv[0] === "--" ? argv.slice(1) : [...argv];
  const unique = new Set(normalized);
  if (
    normalized.length !== REQUIRED_ARGUMENTS.length ||
    unique.size !== REQUIRED_ARGUMENTS.length ||
    REQUIRED_ARGUMENTS.some((argument) => !unique.has(argument))
  ) {
    throw new SandboxSdkCsrOracleCliError();
  }
  return {
    simulation: true,
    noNetwork: true,
    metadataJson: true,
  };
}

export async function runSandboxSdkCsrOracleCli(
  argv: readonly string[],
  execute: (
    options: SandboxSdkCsrOracleCliOptions,
  ) => Promise<Record<string, unknown>>,
  streams: SandboxSdkCsrOracleCliStreams,
): Promise<0 | 1 | 2> {
  let options: SandboxSdkCsrOracleCliOptions;
  try {
    options = parseSandboxSdkCsrOracleCliArguments(argv);
  } catch {
    streams.error.write("ZATCA_SDK_CSR_ARGUMENTS_REJECTED\n");
    return 2;
  }

  try {
    const result = await execute(options);
    const serialized = serializeSafeMetadata(result);
    streams.output.write(`${serialized}\n`);
    return 0;
  } catch {
    streams.error.write("ZATCA_SDK_CSR_ORACLE_FAILED\n");
    return 1;
  }
}

function serializeSafeMetadata(result: Record<string, unknown>): string {
  if (result.arc !== "ARC-07B-06H") {
    throw new Error("Unsafe SDK CSR oracle metadata.");
  }
  if (result.status === "SKIPPED_EXTERNAL_ORACLE") {
    assertExactKeys(result, SKIPPED_METADATA_KEYS);
    assertExactBooleanValues(result, {
      officialSdkTier2Executed: false,
      networkCallsMade: false,
      otpUsed: false,
      csidRequested: false,
      productionExecution: false,
      sensitiveBodiesReturned: false,
    });
  } else if (result.status === "PASSED") {
    assertExactKeys(result, PASSED_METADATA_KEYS);
    if (
      result.jdkVersion !== OFFICIAL_ZATCA_SDK_JAVA_VERSION ||
      result.sdkVersion !== OFFICIAL_ZATCA_SDK_VERSION ||
      result.sdkJarSha256 !== OFFICIAL_ZATCA_SDK_JAR_SHA256 ||
      result.csrAlgorithm !== "ECDSA_SHA256" ||
      result.csrCurve !== "secp256k1" ||
      result.csrTemplate !== "PREZATCA-Code-Signing"
    ) {
      throw new Error("Unsafe SDK CSR oracle metadata.");
    }
    assertExactBooleanValues(result, {
      officialSdkTier2Executed: true,
      sdkChecksumMatch: true,
      sdkConfigChecksumMatch: true,
      jdkRuntimeChecksumsVerified: true,
      simulationFlagVerified: true,
      noNetworkArgumentVerified: true,
      argumentAllowlistVerified: true,
      csrSignatureVerified: true,
      csrAlgorithmVerified: true,
      csrCurveVerified: true,
      csrSubjectVerified: true,
      requestedExtensionsVerified: true,
      csrTemplateVerified: true,
      privateKeyMatchesCsr: true,
      custodyPublicKeyMatchesCsr: true,
      plaintextKeyRemovedBeforeCustodyVerification: true,
      plaintextKeyFileRemoved: true,
      csrFileRemoved: true,
      configFileRemoved: true,
      sdkConfigFileRemoved: true,
      launcherWorkspaceRemoved: true,
      rawOutputRemoved: true,
      disposableCustodyMetadataEmpty: true,
      cleanupComplete: true,
      networkGuardMarkersPresent: true,
      networkIsolationVerified: true,
      networkCallsMade: false,
      otpUsed: false,
      csidRequested: false,
      sensitiveBodiesReturned: false,
      productionExecution: false,
    });
  } else {
    throw new Error("Unsafe SDK CSR oracle metadata.");
  }
  for (const value of Object.values(result)) {
    if (typeof value === "boolean" || value === null) {
      continue;
    }
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > 128 ||
      !/^[A-Za-z0-9_.:+-]+$/u.test(value)
    ) {
      throw new Error("Unsafe SDK CSR oracle metadata.");
    }
  }
  const serialized = JSON.stringify(result);
  if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_JSON_BYTES) {
    throw new Error("Unsafe SDK CSR oracle metadata.");
  }
  return serialized;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error("Unsafe SDK CSR oracle metadata.");
  }
}

function assertExactBooleanValues(
  value: Record<string, unknown>,
  expected: Readonly<Record<string, boolean>>,
): void {
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) {
      throw new Error("Unsafe SDK CSR oracle metadata.");
    }
  }
}
