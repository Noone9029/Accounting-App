import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signData,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import { dirname, join, resolve, win32 } from "node:path";
import { spawn } from "node:child_process";

const LOCAL_DPAPI_PROCESS_TIMEOUT_MS = 10_000;
const LOCAL_PROCESS_TERMINATION_GRACE_MS = 2_000;
const LOCAL_DPAPI_MAX_IO_BYTES = 1024 * 1024;
const LOCAL_CUSTODY_MATERIAL_MAX_BYTES =
  LOCAL_DPAPI_MAX_IO_BYTES * 2;
const LOCAL_ICACLS_MAX_OUTPUT_BYTES = 64 * 1024;
const LOCAL_WHOAMI_MAX_OUTPUT_BYTES = 4 * 1024;
const PINNED_WINDOWS_SYSTEM_ROOT = "C:\\Windows";
const WINDOWS_POWERSHELL_RELATIVE_PATH = Object.freeze([
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
]);
const WINDOWS_ICACLS_RELATIVE_PATH = Object.freeze(["icacls.exe"]);
const WINDOWS_WHOAMI_RELATIVE_PATH = Object.freeze(["whoami.exe"]);
const WINDOWS_TASKKILL_RELATIVE_PATH = Object.freeze(["taskkill.exe"]);

interface SandboxLocalBoundedChildProcess {
  pid?: number;
  stdin: {
    end(value?: Uint8Array): void;
    once(event: "error", listener: () => void): unknown;
  };
  stdout: {
    on(event: "data", listener: (chunk: Buffer | Uint8Array) => void): unknown;
    once(event: "error", listener: () => void): unknown;
  };
  once(event: "error", listener: () => void): unknown;
  once(
    event: "close",
    listener: (code: number | null, signal: string | null) => void,
  ): unknown;
  kill(signal?: NodeJS.Signals | number): boolean;
}

export type SandboxLocalBoundedChildSpawn = (
  command: string,
  args: readonly string[],
  options: {
    windowsHide: boolean;
    stdio: ["pipe", "pipe", "ignore"];
    cwd: string;
    env: NodeJS.ProcessEnv;
  },
) => SandboxLocalBoundedChildProcess;

interface TrustedWindowsSystemBinary {
  command: string;
  systemDirectory: string;
  childEnvironment: NodeJS.ProcessEnv;
}

interface WindowsStorageDirectoryAclOptions {
  spawnProcess?: SandboxLocalBoundedChildSpawn;
  platform?: NodeJS.Platform;
  systemRoot?: string;
}

export type ComplianceCsidSecretCustodyProviderKind = "DISABLED" | "SANDBOX_LOCAL_DPAPI" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";

export interface ComplianceCsidCustodyProviderConfigurationPlan {
  configuredProvider: ComplianceCsidSecretCustodyProviderKind;
  providerEnabled: boolean;
  providerConfigPresent: boolean;
  providerConfigurationReady: boolean;
  mockProviderContractsAvailable: boolean;
  realProviderImplementationReady: boolean;
  defaultProvider: "DISABLED";
  configurationPresent: {
    provider: boolean;
    kmsKeyId: boolean;
    secretPrefix: boolean;
    region: boolean;
    encryptedDbApproval: boolean;
    allowBodyStorage: boolean;
  };
  redactedConfigurationSummary: {
    provider: ComplianceCsidSecretCustodyProviderKind;
    kmsKeyId: string;
    secretPrefix: string;
    region: string;
    encryptedDbApproved: boolean;
    allowBodyStorageRequested: boolean;
  };
  tokenStorageReady: boolean;
  secretStorageReady: boolean;
  certificateStorageReady: boolean;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  bodyStorageAllowed: false;
  productionCompliance: false;
  futureProviderModes: ("FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB")[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface CustodyProviderReadiness {
  provider: ComplianceCsidSecretCustodyProviderKind;
  enabled: boolean;
  configuredProvider: ComplianceCsidSecretCustodyProviderKind;
  providerConfigPresent: boolean;
  providerEnabled: boolean;
  providerConfigurationReady: boolean;
  mockProviderContractsAvailable: boolean;
  realProviderImplementationReady: boolean;
  defaultProvider: "DISABLED";
  configurationPlanSummary: Pick<
    ComplianceCsidCustodyProviderConfigurationPlan,
    | "configuredProvider"
    | "providerEnabled"
    | "providerConfigPresent"
    | "providerConfigurationReady"
    | "mockProviderContractsAvailable"
    | "realProviderImplementationReady"
    | "defaultProvider"
    | "redactedConfigurationSummary"
    | "bodyStorageAllowed"
  >;
  tokenStorageReady: boolean;
  secretStorageReady: boolean;
  certificateStorageReady: boolean;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  productionCompliance: false;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface StoredSecretReference {
  provider: ComplianceCsidSecretCustodyProviderKind;
  referenceId: string;
  versionId: string | null;
  createdAt: Date;
  bodyReturned: false;
  productionCompliance: false;
}

export interface StoreComplianceCsidSecretInput {
  organizationId: string;
  egsUnitId: string;
  certificateRequestId?: string | null;
  referenceId?: string;
  environment?: "SANDBOX" | "SIMULATION" | "PRODUCTION";
  expiresAt?: Date | string | null;
  certificateFingerprint?: string | null;
  certificateSerialNumber?: string | null;
  certificateIssuer?: string | null;
  value: string;
}

export interface RevokeStoredSecretReferenceInput {
  organizationId: string;
  egsUnitId: string;
  referenceId: string;
}

export type ComplianceCsidSecretMaterialKind = "TOKEN" | "SECRET" | "CERTIFICATE";

export interface SecretsManagerLikeClient {
  putSecret(input: StoreComplianceCsidSecretInput & { kind: ComplianceCsidSecretMaterialKind }): Promise<{ referenceId: string; versionId?: string | null }>;
  revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void>;
}

export interface KmsLikeClient {
  encrypt(input: Omit<StoreComplianceCsidSecretInput, "value"> & { kind: ComplianceCsidSecretMaterialKind; plaintext: string }): Promise<{
    ciphertextReference: string;
    keyReference: string;
    versionId?: string | null;
  }>;
  revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void>;
}

export interface ComplianceCsidSecretCustodyProvider {
  getReadiness(): CustodyProviderReadiness;
  storeComplianceToken(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  storeComplianceSecret(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  storeComplianceCertificate(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void>;
}

export interface SandboxLocalSecretReadInput {
  organizationId: string;
  egsUnitId: string;
  referenceId: string;
  environment: "SANDBOX";
}

export interface SandboxLocalDpapiProtector {
  protect(plaintext: Buffer): Promise<Buffer>;
  unprotect(ciphertext: Buffer): Promise<Buffer>;
}

interface SandboxLocalStoredMaterial {
  schemaVersion: 1;
  kind: ComplianceCsidSecretMaterialKind;
  environment: "SANDBOX";
  referenceDigest: string;
  protectedValue: string;
  certificateRequestId: string | null;
  certificateFingerprint: string | null;
  certificateSerialNumber: string | null;
  certificateIssuer: string | null;
  expiresAt: string | null;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
}

function normalizeProvider(value: string | undefined): ComplianceCsidSecretCustodyProviderKind {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "sandbox-local-dpapi" || normalized === "local-dpapi" || normalized === "dpapi") {
    return "SANDBOX_LOCAL_DPAPI";
  }
  if (normalized === "secrets-manager" || normalized === "secret-manager" || normalized === "secrets_manager") {
    return "FUTURE_SECRETS_MANAGER";
  }
  if (normalized === "kms") {
    return "FUTURE_KMS";
  }
  if (normalized === "encrypted-db" || normalized === "encrypted_db") {
    return "FUTURE_ENCRYPTED_DB";
  }
  return "DISABLED";
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "y"].includes(value?.trim().toLowerCase() ?? "");
}

function redactConfigValue(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "NOT_CONFIGURED";
  }
  return `[redacted:${label}:length-${trimmed.length}]`;
}

export function redactSecretReference(rawReference: string | null | undefined): string {
  const trimmed = rawReference?.trim();
  if (!trimmed) {
    return "[redacted-reference:empty]";
  }
  return `[redacted-reference:length-${trimmed.length}]`;
}

function createStoredReference(provider: ComplianceCsidSecretCustodyProviderKind, referenceId: string, versionId?: string | null): StoredSecretReference {
  return {
    provider,
    referenceId: redactSecretReference(referenceId),
    versionId: versionId ? redactSecretReference(versionId) : null,
    createdAt: new Date(),
    bodyReturned: false,
    productionCompliance: false,
  };
}

function sanitizeProviderError(): Error {
  const error = new Error("CSID secret custody provider operation failed. Sensitive provider details were redacted.");
  error.name = "ComplianceCsidSecretCustodyProviderError";
  return error;
}

export class ComplianceCsidCustodyProcessTerminationUnconfirmedError extends Error {
  readonly processTerminationConfirmed = false;

  constructor() {
    super(
      "CSID secret custody provider operation failed. Sensitive provider details were redacted.",
    );
    this.name =
      "ComplianceCsidCustodyProcessTerminationUnconfirmedError";
  }
}

function isSanitizedProviderError(error: unknown): error is Error {
  return (
    error instanceof ComplianceCsidCustodyProcessTerminationUnconfirmedError ||
    (error instanceof Error &&
      error.name === "ComplianceCsidSecretCustodyProviderError")
  );
}

async function writeExclusiveVerifiedCustodyMaterial(
  storageDirectory: string,
  temporary: string,
  target: string,
  material: SandboxLocalStoredMaterial,
): Promise<void> {
  const storageDetails = await lstat(storageDirectory);
  const canonicalStorageDirectory = await realpath(storageDirectory);
  if (
    !storageDetails.isDirectory() ||
    storageDetails.isSymbolicLink() ||
    resolve(canonicalStorageDirectory).toLowerCase() !==
      resolve(storageDirectory).toLowerCase() ||
    resolve(dirname(temporary)).toLowerCase() !==
      resolve(storageDirectory).toLowerCase() ||
    resolve(dirname(target)).toLowerCase() !==
      resolve(storageDirectory).toLowerCase()
  ) {
    throw sanitizeProviderError();
  }

  const serialized = Buffer.from(JSON.stringify(material), "utf8");
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    // "wx" is an exclusive create. It rejects an existing regular file,
    // hardlink, symlink, junction, or dangling symlink before any write.
    handle = await open(temporary, "wx", 0o600);
    const created = await handle.stat();
    assertTaskOwnedCustodyFile(created, null, 0);

    await handle.writeFile(serialized);
    await handle.sync();
    const written = await handle.stat();
    assertTaskOwnedCustodyFile(written, created, serialized.length);

    // Keep the verified handle open through publication so a path swap cannot
    // turn the rename into a write to, or publication of, an external target.
    await rename(temporary, target);
    const publishedByHandle = await handle.stat();
    const publishedByPath = await lstat(target);
    assertTaskOwnedCustodyFile(
      publishedByHandle,
      written,
      serialized.length,
    );
    assertTaskOwnedCustodyFile(
      publishedByPath,
      publishedByHandle,
      serialized.length,
    );
  } finally {
    serialized.fill(0);
    await handle?.close();
  }
}

async function readVerifiedCustodyMaterial(path: string): Promise<Buffer> {
  const before = await lstat(path);
  if (
    before.size < 1 ||
    before.size > LOCAL_CUSTODY_MATERIAL_MAX_BYTES
  ) {
    throw sanitizeProviderError();
  }
  assertTaskOwnedCustodyFile(before, null, before.size);

  const handle = await open(path, "r");
  let value: Buffer | undefined;
  try {
    const opened = await handle.stat();
    assertTaskOwnedCustodyFile(opened, before, before.size);
    const visibleBeforeRead = await lstat(path);
    assertTaskOwnedCustodyFile(
      visibleBeforeRead,
      opened,
      opened.size,
    );

    value = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < value.length) {
      const read = await handle.read(
        value,
        offset,
        value.length - offset,
        offset,
      );
      if (read.bytesRead === 0) {
        throw sanitizeProviderError();
      }
      offset += read.bytesRead;
    }
    const overflowProbe = Buffer.alloc(1);
    try {
      const overflow = await handle.read(
        overflowProbe,
        0,
        1,
        offset,
      );
      if (overflow.bytesRead !== 0) {
        throw sanitizeProviderError();
      }
    } finally {
      overflowProbe.fill(0);
    }

    const openedAfterRead = await handle.stat();
    const visibleAfterRead = await lstat(path);
    assertTaskOwnedCustodyFile(
      openedAfterRead,
      opened,
      opened.size,
    );
    assertTaskOwnedCustodyFile(
      visibleAfterRead,
      openedAfterRead,
      opened.size,
    );
  } catch (error) {
    value?.fill(0);
    try {
      await handle.close();
    } catch {
      // The original fail-closed read result remains authoritative.
    }
    if (isSanitizedProviderError(error)) {
      throw error;
    }
    throw sanitizeProviderError();
  }
  try {
    await handle.close();
  } catch {
    value!.fill(0);
    throw sanitizeProviderError();
  }
  return value!;
}

function assertTaskOwnedCustodyFile(
  actual: Awaited<ReturnType<typeof lstat>>,
  expected:
    | Awaited<ReturnType<typeof lstat>>
    | null,
  expectedBytes: number,
): void {
  if (
    !actual.isFile() ||
    actual.isSymbolicLink() ||
    actual.nlink !== 1 ||
    actual.size !== expectedBytes ||
    (expected !== null &&
      (actual.dev !== expected.dev || actual.ino !== expected.ino))
  ) {
    throw sanitizeProviderError();
  }
}

export function readComplianceCsidCustodyProviderConfig(env: NodeJS.ProcessEnv = process.env): ComplianceCsidCustodyProviderConfigurationPlan {
  const configuredProvider = normalizeProvider(env.ZATCA_CSID_CUSTODY_PROVIDER);
  const kmsKeyId = env.ZATCA_CSID_CUSTODY_KMS_KEY_ID?.trim();
  const secretPrefix = env.ZATCA_CSID_CUSTODY_SECRET_PREFIX?.trim();
  const region = env.ZATCA_CSID_CUSTODY_REGION?.trim();
  const encryptedDbApproved = isTruthy(env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED);
  const allowBodyStorageRequested = isTruthy(env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE);
  const sandboxLocalEnabled = isTruthy(env.ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED);
  const sandboxLocalClassification = env.ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION?.trim() === "LOCAL_TEST";
  const runtimeEnvironment = (env.APP_ENV ?? env.NODE_ENV ?? "").trim().toUpperCase();
  const sandboxLocalRuntime = runtimeEnvironment === "LOCAL" || runtimeEnvironment === "TEST";
  const sandboxLocalReady = configuredProvider === "SANDBOX_LOCAL_DPAPI" && sandboxLocalEnabled && sandboxLocalClassification && sandboxLocalRuntime;
  const providerConfigPresent = Boolean(
    env.ZATCA_CSID_CUSTODY_PROVIDER?.trim() ||
      kmsKeyId ||
      secretPrefix ||
      region ||
      env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED?.trim() ||
      env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE?.trim() ||
      env.ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED?.trim() ||
      env.ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION?.trim(),
  );
  const kmsConfigured = Boolean(kmsKeyId || configuredProvider === "FUTURE_KMS");
  const secretsManagerConfigured = Boolean(secretPrefix || configuredProvider === "FUTURE_SECRETS_MANAGER");
  const warnings = [
    "Provider configuration is inspected locally only; no secrets-manager, KMS, cloud provider, database, or ZATCA network call is made.",
    "Raw provider configuration values are redacted and must not be used as proof of secure custody.",
  ];
  if (allowBodyStorageRequested) {
    warnings.push("ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE was requested but is ignored in this phase.");
  }

  return {
    configuredProvider,
    providerEnabled: sandboxLocalReady,
    providerConfigPresent,
    providerConfigurationReady: sandboxLocalReady,
    mockProviderContractsAvailable: true,
    realProviderImplementationReady: sandboxLocalReady,
    defaultProvider: "DISABLED",
    configurationPresent: {
      provider: Boolean(env.ZATCA_CSID_CUSTODY_PROVIDER?.trim()),
      kmsKeyId: Boolean(kmsKeyId),
      secretPrefix: Boolean(secretPrefix),
      region: Boolean(region),
      encryptedDbApproval: Boolean(env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED?.trim()),
      allowBodyStorage: Boolean(env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE?.trim()),
    },
    redactedConfigurationSummary: {
      provider: configuredProvider,
      kmsKeyId: redactConfigValue(kmsKeyId, "kmsKeyId"),
      secretPrefix: redactConfigValue(secretPrefix, "secretPrefix"),
      region: redactConfigValue(region, "region"),
      encryptedDbApproved,
      allowBodyStorageRequested,
    },
    tokenStorageReady: sandboxLocalReady,
    secretStorageReady: sandboxLocalReady,
    certificateStorageReady: sandboxLocalReady,
    kmsConfigured,
    secretsManagerConfigured,
    encryptedDbApproved,
    bodyStorageAllowed: false,
    productionCompliance: false,
    futureProviderModes: ["FUTURE_SECRETS_MANAGER", "FUTURE_KMS", "FUTURE_ENCRYPTED_DB"],
    blockers: sandboxLocalReady
      ? ["sandbox-only local custody is not production-compliant", "future KMS/HSM custody remains unimplemented"]
      : [
          "provider configuration not approved",
          "provider implementation disabled",
          "real provider implementation not enabled",
          "body storage explicitly blocked",
          "real secure storage not tested",
          "reference ID strategy not approved",
          "rotation/renewal not implemented",
          "production compliance false",
        ],
    warnings,
    recommendedNextSteps: [
      "Set the explicit LOCAL_TEST classification only for controlled synthetic sandbox custody; production remains rejected.",
      "Use mocked provider client contract tests only as interface validation; they do not enable real secrets-manager, KMS, or encrypted DB custody.",
      "Define redacted reference IDs, version handling, access review, audit logging, rotation, renewal, backup, and recovery controls.",
      "Keep token, secret, certificate, CSR, OTP, private key, signed XML, and QR bodies out of API/UI responses.",
    ],
  };
}

export class ComplianceCsidSecretCustodyDisabledError extends Error {
  constructor() {
    super("CSID secret custody provider is disabled. No token, secret, certificate, CSR, OTP, or private key body was stored.");
    this.name = "ComplianceCsidSecretCustodyDisabledError";
  }
}

export class DisabledComplianceCsidSecretCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  getReadiness(): CustodyProviderReadiness {
    const configurationPlan = readComplianceCsidCustodyProviderConfig();
    return {
      provider: "DISABLED",
      enabled: false,
      configuredProvider: configurationPlan.configuredProvider,
      providerConfigPresent: configurationPlan.providerConfigPresent,
      providerEnabled: false,
      providerConfigurationReady: false,
      mockProviderContractsAvailable: configurationPlan.mockProviderContractsAvailable,
      realProviderImplementationReady: false,
      defaultProvider: "DISABLED",
      configurationPlanSummary: {
        configuredProvider: configurationPlan.configuredProvider,
        providerEnabled: false,
        providerConfigPresent: configurationPlan.providerConfigPresent,
        providerConfigurationReady: false,
        mockProviderContractsAvailable: configurationPlan.mockProviderContractsAvailable,
        realProviderImplementationReady: false,
        defaultProvider: "DISABLED",
        redactedConfigurationSummary: configurationPlan.redactedConfigurationSummary,
        bodyStorageAllowed: false,
      },
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      kmsConfigured: configurationPlan.kmsConfigured,
      secretsManagerConfigured: configurationPlan.secretsManagerConfigured,
      encryptedDbApproved: configurationPlan.encryptedDbApproved,
      productionCompliance: false,
      blockers: [
        ...configurationPlan.blockers,
        "custody provider disabled",
        "real provider implementation not enabled",
        "token storage not ready",
        "secret storage not ready",
        "certificate storage not ready",
        "KMS/secrets manager not configured",
        "encrypted DB custody not approved",
      ],
      warnings: [
        ...configurationPlan.warnings,
        "No real secrets-manager, KMS, or encrypted DB custody provider is configured.",
        "Mocked provider client contracts are available for tests only and are not wired as runtime providers.",
        "This provider boundary is metadata-only and must not receive real ZATCA CSID response bodies in normal application paths.",
      ],
      recommendedNextSteps: [
        "Select and approve a secrets-manager/KMS custody provider before real sandbox CSID response persistence.",
        "Define redacted reference IDs, rotation, renewal, audit logging, and disaster recovery before enabling any provider.",
      ],
    };
  }

  async storeComplianceToken(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async storeComplianceSecret(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async storeComplianceCertificate(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async revokeReference(_input: RevokeStoredSecretReferenceInput): Promise<void> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }
}

export class MockedSecretsManagerComplianceCsidCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  constructor(private readonly client: SecretsManagerLikeClient) {}

  getReadiness(): CustodyProviderReadiness {
    const configurationPlan = readComplianceCsidCustodyProviderConfig();
    return {
      provider: "FUTURE_SECRETS_MANAGER",
      enabled: false,
      configuredProvider: configurationPlan.configuredProvider,
      providerConfigPresent: configurationPlan.providerConfigPresent,
      providerEnabled: false,
      providerConfigurationReady: false,
      mockProviderContractsAvailable: true,
      realProviderImplementationReady: false,
      defaultProvider: "DISABLED",
      configurationPlanSummary: {
        configuredProvider: configurationPlan.configuredProvider,
        providerEnabled: false,
        providerConfigPresent: configurationPlan.providerConfigPresent,
        providerConfigurationReady: false,
        mockProviderContractsAvailable: true,
        realProviderImplementationReady: false,
        defaultProvider: "DISABLED",
        redactedConfigurationSummary: configurationPlan.redactedConfigurationSummary,
        bodyStorageAllowed: false,
      },
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      kmsConfigured: configurationPlan.kmsConfigured,
      secretsManagerConfigured: configurationPlan.secretsManagerConfigured,
      encryptedDbApproved: configurationPlan.encryptedDbApproved,
      productionCompliance: false,
      blockers: ["mock secrets-manager provider is test-only", "real provider implementation not enabled", "body storage explicitly blocked"],
      warnings: ["No real secrets-manager SDK, credentials, or network call is used by this mocked provider."],
      recommendedNextSteps: ["Implement and approve a real custody provider only after secure custody review."],
    };
  }

  async storeComplianceToken(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("TOKEN", input);
  }

  async storeComplianceSecret(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("SECRET", input);
  }

  async storeComplianceCertificate(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("CERTIFICATE", input);
  }

  async revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void> {
    try {
      await this.client.revokeReference(input);
    } catch {
      throw sanitizeProviderError();
    }
  }

  private async store(kind: ComplianceCsidSecretMaterialKind, input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    try {
      const result = await this.client.putSecret({ ...input, kind });
      return createStoredReference("FUTURE_SECRETS_MANAGER", result.referenceId, result.versionId);
    } catch {
      throw sanitizeProviderError();
    }
  }
}

export class MockedKmsComplianceCsidCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  constructor(private readonly client: KmsLikeClient) {}

  getReadiness(): CustodyProviderReadiness {
    const configurationPlan = readComplianceCsidCustodyProviderConfig();
    return {
      provider: "FUTURE_KMS",
      enabled: false,
      configuredProvider: configurationPlan.configuredProvider,
      providerConfigPresent: configurationPlan.providerConfigPresent,
      providerEnabled: false,
      providerConfigurationReady: false,
      mockProviderContractsAvailable: true,
      realProviderImplementationReady: false,
      defaultProvider: "DISABLED",
      configurationPlanSummary: {
        configuredProvider: configurationPlan.configuredProvider,
        providerEnabled: false,
        providerConfigPresent: configurationPlan.providerConfigPresent,
        providerConfigurationReady: false,
        mockProviderContractsAvailable: true,
        realProviderImplementationReady: false,
        defaultProvider: "DISABLED",
        redactedConfigurationSummary: configurationPlan.redactedConfigurationSummary,
        bodyStorageAllowed: false,
      },
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      kmsConfigured: configurationPlan.kmsConfigured,
      secretsManagerConfigured: configurationPlan.secretsManagerConfigured,
      encryptedDbApproved: configurationPlan.encryptedDbApproved,
      productionCompliance: false,
      blockers: ["mock KMS provider is test-only", "real provider implementation not enabled", "body storage explicitly blocked"],
      warnings: ["No real KMS SDK, credentials, key operation, or network call is used by this mocked provider."],
      recommendedNextSteps: ["Implement and approve a real custody provider only after secure custody review."],
    };
  }

  async storeComplianceToken(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("TOKEN", input);
  }

  async storeComplianceSecret(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("SECRET", input);
  }

  async storeComplianceCertificate(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("CERTIFICATE", input);
  }

  async revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void> {
    try {
      await this.client.revokeReference(input);
    } catch {
      throw sanitizeProviderError();
    }
  }

  private async store(kind: ComplianceCsidSecretMaterialKind, input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    try {
      const result = await this.client.encrypt({
        organizationId: input.organizationId,
        egsUnitId: input.egsUnitId,
        certificateRequestId: input.certificateRequestId,
        kind,
        plaintext: input.value,
      });
      return createStoredReference("FUTURE_KMS", `${result.ciphertextReference}|${result.keyReference}`, result.versionId);
    } catch {
      throw sanitizeProviderError();
    }
  }
}

async function resolveTrustedWindowsSystemBinary(
  relativePath: readonly string[],
  options: {
    systemRoot?: string;
    skipFilesystemValidation?: boolean;
  } = {},
): Promise<TrustedWindowsSystemBinary> {
  const configuredSystemRoot =
    options.systemRoot ?? PINNED_WINDOWS_SYSTEM_ROOT;
  const configuredWindowsDirectory =
    options.systemRoot ?? PINNED_WINDOWS_SYSTEM_ROOT;
  if (
    !configuredSystemRoot ||
    !configuredWindowsDirectory ||
    !win32.isAbsolute(configuredSystemRoot) ||
    configuredSystemRoot.startsWith("\\\\") ||
    configuredSystemRoot.toLowerCase() !==
      configuredWindowsDirectory.toLowerCase() ||
    relativePath.length === 0 ||
    relativePath.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.includes("/") ||
        part.includes("\\"),
    )
  ) {
    throw sanitizeProviderError();
  }

  const systemRoot = win32.normalize(configuredSystemRoot);
  const systemDirectory = win32.join(systemRoot, "System32");
  const candidate = win32.join(systemDirectory, ...relativePath);
  let command = candidate;
  let canonicalSystemDirectory = systemDirectory;
  if (!options.skipFilesystemValidation) {
    try {
      canonicalSystemDirectory = await realpath(systemDirectory);
      command = await realpath(candidate);
    } catch {
      throw sanitizeProviderError();
    }
    const expectedPrefix = `${canonicalSystemDirectory.toLowerCase()}\\`;
    if (
      !command.toLowerCase().startsWith(expectedPrefix) ||
      win32.basename(command).toLowerCase() !==
        relativePath.at(-1)!.toLowerCase()
    ) {
      throw sanitizeProviderError();
    }
  }

  return {
    command,
    systemDirectory: canonicalSystemDirectory,
    childEnvironment: {
      SystemRoot: systemRoot,
      WINDIR: systemRoot,
      ComSpec: win32.join(systemDirectory, "cmd.exe"),
      PATHEXT: ".COM;.EXE;.BAT;.CMD",
    },
  };
}

async function resolveCurrentWindowsTokenSid(
  options: WindowsStorageDirectoryAclOptions = {},
): Promise<string> {
  const trustedWhoami = await resolveTrustedWindowsSystemBinary(
    WINDOWS_WHOAMI_RELATIVE_PATH,
    {
      systemRoot: options.systemRoot,
      skipFilesystemValidation: Boolean(options.spawnProcess),
    },
  );
  const output = await runSandboxLocalBoundedChildProcess({
    command: trustedWhoami.command,
    args: ["/user", "/fo", "csv", "/nh"],
    input: Buffer.alloc(0),
    timeoutMs: LOCAL_DPAPI_PROCESS_TIMEOUT_MS,
    maxOutputBytes: LOCAL_WHOAMI_MAX_OUTPUT_BYTES,
    spawnProcess: options.spawnProcess,
    childEnvironment: trustedWhoami.childEnvironment,
    workingDirectory: trustedWhoami.systemDirectory,
  });
  try {
    const value = output.toString("utf8").trim();
    const match = value.match(
      /^"[^"\r\n]{1,256}","(S-1-(?:\d+-){1,14}\d+)"$/u,
    );
    if (!match) {
      throw sanitizeProviderError();
    }
    return match[1]!;
  } finally {
    output.fill(0);
  }
}

async function restrictWindowsStorageDirectoryAcl(
  storageDirectory: string,
  options: WindowsStorageDirectoryAclOptions = {},
): Promise<void> {
  if ((options.platform ?? process.platform) !== "win32") {
    throw sanitizeProviderError();
  }
  const currentUserSid = await resolveCurrentWindowsTokenSid(options);
  const trustedIcacls = await resolveTrustedWindowsSystemBinary(
    WINDOWS_ICACLS_RELATIVE_PATH,
    {
      systemRoot: options.systemRoot,
      skipFilesystemValidation: Boolean(options.spawnProcess),
    },
  );
  const output = await runSandboxLocalBoundedChildProcess({
    command: trustedIcacls.command,
    args: [
      storageDirectory,
      "/inheritance:r",
      "/grant:r",
      `*${currentUserSid}:(OI)(CI)F`,
      "/grant:r",
      "SYSTEM:(OI)(CI)F",
    ],
    input: Buffer.alloc(0),
    timeoutMs: LOCAL_DPAPI_PROCESS_TIMEOUT_MS,
    maxOutputBytes: LOCAL_ICACLS_MAX_OUTPUT_BYTES,
    spawnProcess: options.spawnProcess,
    childEnvironment: trustedIcacls.childEnvironment,
    workingDirectory: trustedIcacls.systemDirectory,
  });
  output.fill(0);
}

class WindowsCurrentUserDpapiProtector implements SandboxLocalDpapiProtector {
  constructor(
    private readonly options: {
      spawnProcess?: SandboxLocalBoundedChildSpawn;
      timeoutMs?: number;
      maxOutputBytes?: number;
      platform?: NodeJS.Platform;
      systemRoot?: string;
      terminationGraceMs?: number;
    } = {},
  ) {}

  async protect(plaintext: Buffer): Promise<Buffer> {
    return this.invoke("protect", plaintext);
  }

  async unprotect(ciphertext: Buffer): Promise<Buffer> {
    return this.invoke("unprotect", ciphertext);
  }

  private async invoke(operation: "protect" | "unprotect", value: Buffer): Promise<Buffer> {
    if ((this.options.platform ?? process.platform) !== "win32") {
      throw sanitizeProviderError();
    }
    const maxOutputBytes =
      this.options.maxOutputBytes ?? LOCAL_DPAPI_MAX_IO_BYTES;
    if (
      value.length === 0 ||
      value.length > LOCAL_DPAPI_MAX_IO_BYTES ||
      maxOutputBytes <= 0 ||
      maxOutputBytes > LOCAL_DPAPI_MAX_IO_BYTES
    ) {
      throw sanitizeProviderError();
    }
    const action = operation === "protect" ? "Protect" : "Unprotect";
    const script = [
      "$ErrorActionPreference='Stop'",
      "Add-Type -AssemblyName System.Security",
      "$inputStream=[Console]::OpenStandardInput()",
      "$outputStream=[Console]::OpenStandardOutput()",
      "$memory=[IO.MemoryStream]::new()",
      "$bytes=$null",
      "$entropy=$null",
      "$result=$null",
      "try {",
      "  $inputStream.CopyTo($memory)",
      "  $bytes=$memory.ToArray()",
      "  $entropy=[Text.Encoding]::UTF8.GetBytes('LedgerByte:ZatcaSandboxCustody:v1')",
      `  $result=[Security.Cryptography.ProtectedData]::${action}($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)`,
      "  $outputStream.Write($result,0,$result.Length)",
      "  $outputStream.Flush()",
      "} finally {",
      "  if ($bytes -ne $null) { [Array]::Clear($bytes,0,$bytes.Length) }",
      "  if ($entropy -ne $null) { [Array]::Clear($entropy,0,$entropy.Length) }",
      "  if ($result -ne $null) { [Array]::Clear($result,0,$result.Length) }",
      "  $memory.Dispose()",
      "}",
    ].join("\n");
    const trustedPowerShell = await resolveTrustedWindowsSystemBinary(
      WINDOWS_POWERSHELL_RELATIVE_PATH,
      {
        systemRoot: this.options.systemRoot,
        skipFilesystemValidation: Boolean(this.options.spawnProcess),
      },
    );
    const result = await runSandboxLocalBoundedChildProcess({
      command: trustedPowerShell.command,
      args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
      input: value,
      timeoutMs: this.options.timeoutMs ?? LOCAL_DPAPI_PROCESS_TIMEOUT_MS,
      maxOutputBytes,
      spawnProcess: this.options.spawnProcess,
      childEnvironment: trustedPowerShell.childEnvironment,
      workingDirectory: trustedPowerShell.systemDirectory,
      terminationGraceMs: this.options.terminationGraceMs,
    });
    if (result.length === 0) {
      result.fill(0);
      throw sanitizeProviderError();
    }
    return result;
  }
}

async function runSandboxLocalBoundedChildProcess(input: {
  command: string;
  args: readonly string[];
  input: Buffer;
  timeoutMs: number;
  maxOutputBytes: number;
  spawnProcess?: SandboxLocalBoundedChildSpawn;
  childEnvironment: NodeJS.ProcessEnv;
  workingDirectory: string;
  terminationGraceMs?: number;
}): Promise<Buffer> {
  const terminationGraceMs =
    input.terminationGraceMs ?? LOCAL_PROCESS_TERMINATION_GRACE_MS;
  if (
    input.timeoutMs <= 0 ||
    input.timeoutMs > 60_000 ||
    input.maxOutputBytes <= 0 ||
    input.maxOutputBytes > LOCAL_DPAPI_MAX_IO_BYTES ||
    terminationGraceMs <= 0 ||
    terminationGraceMs > LOCAL_PROCESS_TERMINATION_GRACE_MS
  ) {
    throw sanitizeProviderError();
  }

  const spawnProcess =
    input.spawnProcess ??
    (spawn as unknown as SandboxLocalBoundedChildSpawn);
  const trustedTaskkill = await resolveTrustedWindowsSystemBinary(
    WINDOWS_TASKKILL_RELATIVE_PATH,
    {
      systemRoot: input.childEnvironment.SystemRoot,
      skipFilesystemValidation: Boolean(input.spawnProcess),
    },
  );
  let child: SandboxLocalBoundedChildProcess;
  try {
    child = spawnProcess(input.command, input.args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "ignore"],
      cwd: input.workingDirectory,
      env: input.childEnvironment,
    });
  } catch {
    throw sanitizeProviderError();
  }

  return new Promise<Buffer>((resolve, reject) => {
    const outputChunks: Buffer[] = [];
    let outputLength = 0;
    let settled = false;
    let terminationRequested = false;
    let primaryClosed = false;
    let taskkillStarted = false;
    let taskkillCompleted = false;
    let terminationConfirmationTimer: NodeJS.Timeout | undefined;
    let taskkillTimer: NodeJS.Timeout | undefined;
    let postTaskkillConfirmationTimer: NodeJS.Timeout | undefined;
    const timer = setTimeout(() => failAndTerminate(), input.timeoutMs);
    timer.unref?.();

    const zeroOutputChunks = () => {
      for (const chunk of outputChunks) {
        chunk.fill(0);
      }
      outputChunks.length = 0;
      outputLength = 0;
    };
    const finishFailure = (
      error: Error = sanitizeProviderError(),
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (terminationConfirmationTimer) {
        clearTimeout(terminationConfirmationTimer);
      }
      if (taskkillTimer) {
        clearTimeout(taskkillTimer);
      }
      if (postTaskkillConfirmationTimer) {
        clearTimeout(postTaskkillConfirmationTimer);
      }
      zeroOutputChunks();
      reject(error);
    };
    const finishUnconfirmedTermination = () => {
      finishFailure(
        new ComplianceCsidCustodyProcessTerminationUnconfirmedError(),
      );
    };
    const finishIfTerminationConfirmed = () => {
      if (
        primaryClosed &&
        (!taskkillStarted || taskkillCompleted)
      ) {
        finishFailure();
      }
    };
    const waitForPrimaryCloseAfterTaskkill = () => {
      if (primaryClosed) {
        finishFailure();
        return;
      }
      postTaskkillConfirmationTimer = setTimeout(
        finishUnconfirmedTermination,
        terminationGraceMs,
      );
      postTaskkillConfirmationTimer.unref?.();
    };
    const startPinnedTaskkill = () => {
      if (settled) {
        return;
      }
      if (primaryClosed) {
        finishFailure();
        return;
      }
      if (
        !Number.isSafeInteger(child.pid) ||
        (child.pid ?? 0) <= 0
      ) {
        finishUnconfirmedTermination();
        return;
      }

      taskkillStarted = true;
      let taskkillChild: SandboxLocalBoundedChildProcess;
      try {
        taskkillChild = spawnProcess(
          trustedTaskkill.command,
          ["/PID", String(child.pid), "/T", "/F"],
          {
            windowsHide: true,
            stdio: ["pipe", "pipe", "ignore"],
            cwd: trustedTaskkill.systemDirectory,
            env: trustedTaskkill.childEnvironment,
          },
        );
      } catch {
        finishUnconfirmedTermination();
        return;
      }

      let taskkillOutputBytes = 0;
      const failTaskkill = () => {
        if (settled) {
          return;
        }
        try {
          taskkillChild.kill("SIGKILL");
        } catch {
          // The unconfirmed-termination result remains authoritative.
        }
        // The primary may already be closed, but this helper has not emitted
        // close. Never claim complete process containment or allow cleanup
        // while the helper's own termination remains unconfirmed.
        finishUnconfirmedTermination();
      };
      taskkillChild.stdout.on("data", (value) => {
        const source = Buffer.isBuffer(value)
          ? value
          : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
        taskkillOutputBytes += source.length;
        source.fill(0);
        if (taskkillOutputBytes > LOCAL_ICACLS_MAX_OUTPUT_BYTES) {
          failTaskkill();
        }
      });
      taskkillChild.stdout.once("error", failTaskkill);
      taskkillChild.once("error", failTaskkill);
      taskkillChild.stdin.once("error", failTaskkill);
      taskkillChild.once("close", (code) => {
        if (settled) {
          return;
        }
        taskkillCompleted = true;
        if (taskkillTimer) {
          clearTimeout(taskkillTimer);
        }
        if (code !== 0) {
          if (primaryClosed) {
            finishFailure();
          } else {
            finishUnconfirmedTermination();
          }
          return;
        }
        waitForPrimaryCloseAfterTaskkill();
      });
      try {
        taskkillChild.stdin.end();
      } catch {
        failTaskkill();
        return;
      }
      taskkillTimer = setTimeout(failTaskkill, terminationGraceMs);
      taskkillTimer.unref?.();
    };
    const failAndTerminate = () => {
      if (settled || terminationRequested) {
        return;
      }
      terminationRequested = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // The close event or bounded confirmation timeout remains authoritative.
      }
      if (!settled) {
        terminationConfirmationTimer = setTimeout(
          startPinnedTaskkill,
          terminationGraceMs,
        );
        terminationConfirmationTimer.unref?.();
      }
    };

    child.stdout.on("data", (value) => {
      const source = Buffer.isBuffer(value)
        ? value
        : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      const copy = Buffer.from(source);
      source.fill(0);
      if (settled) {
        copy.fill(0);
        return;
      }
      outputLength += copy.length;
      if (outputLength > input.maxOutputBytes) {
        copy.fill(0);
        failAndTerminate();
        return;
      }
      outputChunks.push(copy);
    });
    child.stdout.once("error", failAndTerminate);
    child.once("error", failAndTerminate);
    child.stdin.once("error", failAndTerminate);
    child.once("close", (code) => {
      if (settled) {
        return;
      }
      primaryClosed = true;
      if (terminationRequested) {
        finishIfTerminationConfirmed();
        return;
      }
      if (code !== 0) {
        finishFailure();
        return;
      }
      const output = Buffer.concat(outputChunks, outputLength);
      settled = true;
      clearTimeout(timer);
      if (terminationConfirmationTimer) {
        clearTimeout(terminationConfirmationTimer);
      }
      zeroOutputChunks();
      resolve(output);
    });
    try {
      child.stdin.end(input.input);
    } catch {
      failAndTerminate();
    }
  });
}

export async function __testOnlyInvokeWindowsCurrentUserDpapi(
  operation: "protect" | "unprotect",
  value: Buffer,
  options: {
    spawnProcess: SandboxLocalBoundedChildSpawn;
    timeoutMs: number;
    maxOutputBytes: number;
    platform: NodeJS.Platform;
    systemRoot?: string;
    terminationGraceMs?: number;
  },
): Promise<Buffer> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("ZATCA custody DPAPI test-only override is unavailable.");
  }
  const protector = new WindowsCurrentUserDpapiProtector(options);
  if (operation === "protect") {
    return protector.protect(value);
  }
  return protector.unprotect(value);
}

export async function __testOnlyRestrictWindowsStorageDirectoryAcl(
  storageDirectory: string,
  options: {
    spawnProcess: SandboxLocalBoundedChildSpawn;
    platform: NodeJS.Platform;
    systemRoot?: string;
  },
): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("ZATCA custody ACL test-only override is unavailable.");
  }
  await restrictWindowsStorageDirectoryAcl(storageDirectory, options);
}

export class SandboxLocalDpapiComplianceCsidCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  readonly #now: () => Date;
  readonly #protector: SandboxLocalDpapiProtector;
  readonly #usingTestProtector: boolean;

  constructor(
    private readonly options: {
      environment: "LOCAL_TEST";
      storageDirectory: string;
      disposableStorage?: true;
      protector?: SandboxLocalDpapiProtector;
      now?: () => Date;
    },
  ) {
    const runtimeEnvironment = (
      process.env.APP_ENV ??
      process.env.NODE_ENV ??
      ""
    )
      .trim()
      .toUpperCase();
    const testProtectorOverride =
      Boolean(options.protector) && process.env.NODE_ENV === "test";
    if (
      (runtimeEnvironment !== "LOCAL" && runtimeEnvironment !== "TEST") ||
      (options.protector && !testProtectorOverride)
    ) {
      throw sanitizeProviderError();
    }
    this.#protector = options.protector ?? new WindowsCurrentUserDpapiProtector();
    this.#usingTestProtector = Boolean(options.protector);
    this.#now = options.now ?? (() => new Date());
  }

  getReadiness(): CustodyProviderReadiness {
    return {
      provider: "SANDBOX_LOCAL_DPAPI",
      enabled: true,
      configuredProvider: "SANDBOX_LOCAL_DPAPI",
      providerConfigPresent: true,
      providerEnabled: true,
      providerConfigurationReady: true,
      mockProviderContractsAvailable: true,
      realProviderImplementationReady: true,
      defaultProvider: "DISABLED",
      configurationPlanSummary: {
        configuredProvider: "SANDBOX_LOCAL_DPAPI",
        providerEnabled: true,
        providerConfigPresent: true,
        providerConfigurationReady: true,
        mockProviderContractsAvailable: true,
        realProviderImplementationReady: true,
        defaultProvider: "DISABLED",
        redactedConfigurationSummary: {
          provider: "SANDBOX_LOCAL_DPAPI",
          kmsKeyId: "NOT_CONFIGURED",
          secretPrefix: "NOT_CONFIGURED",
          region: "NOT_CONFIGURED",
          encryptedDbApproved: false,
          allowBodyStorageRequested: false,
        },
        bodyStorageAllowed: false,
      },
      tokenStorageReady: true,
      secretStorageReady: true,
      certificateStorageReady: true,
      kmsConfigured: false,
      secretsManagerConfigured: false,
      encryptedDbApproved: false,
      productionCompliance: false,
      blockers: ["sandbox-only local custody is not production-compliant", "future KMS/HSM custody remains unimplemented"],
      warnings: ["Material is protected with Windows DPAPI for the current user and is stored outside the repository as ciphertext only."],
      recommendedNextSteps: ["Use only synthetic sandbox material and replace this provider with an approved KMS/HSM before production."],
    };
  }

  async storeComplianceToken(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("TOKEN", input);
  }

  async storeComplianceSecret(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("SECRET", input);
  }

  async storeComplianceCertificate(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    return this.store("CERTIFICATE", input);
  }

  async importSyntheticPrivateKeyForOperation(
    input: SandboxLocalSecretReadInput & { privateKey: Buffer },
  ): Promise<StoredSecretReference> {
    this.assertDisposableStorage();
    this.assertSandboxReference(input);
    this.assertBoundedOperationInput(input.privateKey);
    const plaintext = Buffer.from(input.privateKey);
    try {
      const privateKey = createPrivateKey(plaintext);
      this.assertSecp256k1PrivateKey(privateKey);
      return await this.storePlaintextBuffer("SECRET", input, plaintext);
    } catch (error) {
      if (isSanitizedProviderError(error)) {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      plaintext.fill(0);
    }
  }

  async secretMatchesExpectedValue(
    input: SandboxLocalSecretReadInput,
    expectedPlaintext: Buffer,
  ): Promise<boolean> {
    this.assertBoundedOperationInput(expectedPlaintext);
    const expectedCopy = Buffer.from(expectedPlaintext);
    try {
      return await this.#withSecretPlaintext(input, (plaintext) =>
        plaintext.length === expectedCopy.length &&
        timingSafeEqual(plaintext, expectedCopy),
      );
    } finally {
      expectedCopy.fill(0);
    }
  }

  async signSha256ForOperation(
    input: SandboxLocalSecretReadInput,
    data: Buffer,
  ): Promise<Buffer> {
    this.assertBoundedOperationInput(data);
    return this.#withSecretPlaintext(input, (plaintext) => {
      const privateKey = createPrivateKey(plaintext);
      this.assertSecp256k1PrivateKey(privateKey);
      const signature = signData("sha256", data, privateKey);
      if (signature.length === 0 || signature.length > LOCAL_DPAPI_MAX_IO_BYTES) {
        signature.fill(0);
        throw sanitizeProviderError();
      }
      return signature;
    });
  }

  async deriveSpkiPublicKeyForOperation(
    input: SandboxLocalSecretReadInput,
  ): Promise<Buffer> {
    return this.#withSecretPlaintext(input, (plaintext) => {
      const privateKey = createPrivateKey(plaintext);
      this.assertSecp256k1PrivateKey(privateKey);
      const exported = createPublicKey(privateKey).export({
        type: "spki",
        format: "der",
      });
      const publicKey = Buffer.isBuffer(exported)
        ? Buffer.from(exported)
        : Buffer.from(exported, "utf8");
      if (
        publicKey.length === 0 ||
        publicKey.length > LOCAL_DPAPI_MAX_IO_BYTES
      ) {
        publicKey.fill(0);
        throw sanitizeProviderError();
      }
      return publicKey;
    });
  }

  async storedCiphertextDiffersFromExpectedValue(
    input: SandboxLocalSecretReadInput,
    expectedPlaintext: Buffer,
  ): Promise<boolean> {
    this.assertBoundedOperationInput(expectedPlaintext);
    const expectedCopy = Buffer.from(expectedPlaintext);
    let protectedValue: Buffer | undefined;
    try {
      this.assertSandboxReference(input);
      const material = await this.readMaterial(input, false);
      protectedValue = Buffer.from(material.protectedValue, "base64");
      return !(
        protectedValue.length === expectedCopy.length &&
        timingSafeEqual(protectedValue, expectedCopy)
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ComplianceCsidSecretCustodyProviderError"
      ) {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      protectedValue?.fill(0);
      expectedCopy.fill(0);
    }
  }

  async revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void> {
    const reference = { ...input, environment: "SANDBOX" as const };
    this.assertSandboxReference(reference);
    try {
      const material = await this.readMaterial(reference, false);
      material.revokedAt = this.#now().toISOString();
      await this.writeMaterial(reference, material);
    } catch (error) {
      if (isSanitizedProviderError(error)) {
        throw error;
      }
      throw sanitizeProviderError();
    }
  }

  async deleteReference(input: SandboxLocalSecretReadInput): Promise<void> {
    this.assertSandboxReference(input);
    try {
      await rm(this.pathFor(input), { force: false });
    } catch {
      throw sanitizeProviderError();
    }
  }

  async listMetadataOnly(): Promise<Array<Omit<SandboxLocalStoredMaterial, "protectedValue">>> {
    try {
      const names = await readdir(this.options.storageDirectory);
      const records = await Promise.all(
        names.filter((name) => name.endsWith(".json")).map(async (name) => {
          let serialized: Buffer | undefined;
          try {
            serialized = await readVerifiedCustodyMaterial(
              join(this.options.storageDirectory, name),
            );
            const material = this.parseMaterial(serialized);
            const { protectedValue: _protectedValue, ...metadata } =
              material;
            return metadata;
          } finally {
            serialized?.fill(0);
          }
        }),
      );
      return records;
    } catch {
      return [];
    }
  }

  async assertDisposableStoreEmptyForOperation(): Promise<true> {
    this.assertDisposableStorage();
    try {
      const names = await readdir(this.options.storageDirectory);
      if (names.length !== 0) {
        throw sanitizeProviderError();
      }
      return true;
    } catch (error) {
      if (isSanitizedProviderError(error)) {
        throw error;
      }
      throw sanitizeProviderError();
    }
  }

  private async store(kind: ComplianceCsidSecretMaterialKind, input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    this.assertSandboxReference(input);
    if (!input.value || !input.value.trim()) {
      throw sanitizeProviderError();
    }
    const plaintext = Buffer.from(input.value, "utf8");
    try {
      return await this.storePlaintextBuffer(
        kind,
        input as SandboxLocalSecretReadInput &
          Partial<
            Pick<
              StoreComplianceCsidSecretInput,
              | "certificateRequestId"
              | "certificateFingerprint"
              | "certificateSerialNumber"
              | "certificateIssuer"
              | "expiresAt"
            >
          >,
        plaintext,
      );
    } finally {
      plaintext.fill(0);
    }
  }

  private async storePlaintextBuffer(
    kind: ComplianceCsidSecretMaterialKind,
    input: SandboxLocalSecretReadInput &
      Partial<
        Pick<
          StoreComplianceCsidSecretInput,
          | "certificateRequestId"
          | "certificateFingerprint"
          | "certificateSerialNumber"
          | "certificateIssuer"
          | "expiresAt"
        >
      >,
    plaintext: Buffer,
  ): Promise<StoredSecretReference> {
    let protectedValue: Buffer | undefined;
    try {
      protectedValue = await this.#protector.protect(plaintext);
      const createdAt = this.#now().toISOString();
      await this.writeMaterial(input as SandboxLocalSecretReadInput, {
        schemaVersion: 1,
        kind,
        environment: "SANDBOX",
        referenceDigest: this.referenceDigest(input as SandboxLocalSecretReadInput),
        protectedValue: protectedValue.toString("base64"),
        certificateRequestId: input.certificateRequestId?.trim() || null,
        certificateFingerprint: input.certificateFingerprint?.trim() || null,
        certificateSerialNumber: input.certificateSerialNumber?.trim() || null,
        certificateIssuer: input.certificateIssuer?.trim() || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        createdAt,
        rotatedAt: null,
        revokedAt: null,
      });
      return createStoredReference("SANDBOX_LOCAL_DPAPI", input.referenceId!);
    } catch (error) {
      if (isSanitizedProviderError(error)) {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      protectedValue?.fill(0);
    }
  }

  private assertDisposableStorage(): void {
    if (this.options.disposableStorage !== true) {
      throw sanitizeProviderError();
    }
  }

  private assertSandboxReference(input: {
    organizationId?: string;
    egsUnitId?: string;
    referenceId?: string;
    environment?: string;
  }): asserts input is SandboxLocalSecretReadInput {
    if (this.options.environment !== "LOCAL_TEST" || input.environment !== "SANDBOX" || !input.organizationId?.trim() || !input.egsUnitId?.trim() || !input.referenceId?.trim()) {
      throw sanitizeProviderError();
    }
  }

  private referenceDigest(input: SandboxLocalSecretReadInput): string {
    return createHash("sha256").update(`${input.organizationId}\u0000${input.egsUnitId}\u0000${input.environment}\u0000${input.referenceId}`).digest("hex");
  }

  private pathFor(input: SandboxLocalSecretReadInput): string {
    return join(this.options.storageDirectory, `${this.referenceDigest(input)}.json`);
  }

  private async readMaterial(input: SandboxLocalSecretReadInput, allowMissing: boolean): Promise<SandboxLocalStoredMaterial> {
    let serialized: Buffer | undefined;
    try {
      serialized = await readVerifiedCustodyMaterial(
        this.pathFor(input),
      );
      const material = this.parseMaterial(serialized);
      if (material.environment !== input.environment || material.referenceDigest !== this.referenceDigest(input)) {
        throw sanitizeProviderError();
      }
      return material;
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException)?.code === "ENOENT") {
        throw sanitizeProviderError();
      }
      if (error instanceof Error && error.name === "ComplianceCsidSecretCustodyProviderError") {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      serialized?.fill(0);
    }
  }

  private parseMaterial(value: Buffer): SandboxLocalStoredMaterial {
    const parsed = JSON.parse(value.toString("utf8")) as SandboxLocalStoredMaterial;
    if (
      parsed.schemaVersion !== 1 ||
      parsed.environment !== "SANDBOX" ||
      !parsed.referenceDigest ||
      !parsed.protectedValue ||
      !["TOKEN", "SECRET", "CERTIFICATE"].includes(parsed.kind)
    ) {
      throw sanitizeProviderError();
    }
    return parsed;
  }

  private async writeMaterial(input: SandboxLocalSecretReadInput, material: SandboxLocalStoredMaterial): Promise<void> {
    await mkdir(this.options.storageDirectory, { recursive: true, mode: 0o700 });
    await this.restrictStorageDirectory();
    const target = this.pathFor(input);
    const temporary = `${target}.tmp`;
    await writeExclusiveVerifiedCustodyMaterial(
      this.options.storageDirectory,
      temporary,
      target,
      material,
    );
  }

  private async restrictStorageDirectory(): Promise<void> {
    if (this.#usingTestProtector) {
      return;
    }
    await restrictWindowsStorageDirectoryAcl(this.options.storageDirectory);
  }

  async #withSecretPlaintext<T>(
    input: SandboxLocalSecretReadInput,
    operation: (plaintext: Buffer) => Promise<T> | T,
  ): Promise<T> {
    this.assertSandboxReference(input);
    let protectedValue: Buffer | undefined;
    let plaintext: Buffer | undefined;
    try {
      const material = await this.readMaterial(input, false);
      if (
        material.revokedAt ||
        (material.expiresAt &&
          new Date(material.expiresAt).getTime() <= this.#now().getTime())
      ) {
        throw sanitizeProviderError();
      }
      protectedValue = Buffer.from(material.protectedValue, "base64");
      plaintext = await this.#protector.unprotect(protectedValue);
      if (
        !Buffer.isBuffer(plaintext) ||
        plaintext.length === 0 ||
        plaintext.length > LOCAL_DPAPI_MAX_IO_BYTES
      ) {
        throw sanitizeProviderError();
      }
      return await operation(plaintext);
    } catch (error) {
      if (isSanitizedProviderError(error)) {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      plaintext?.fill(0);
      protectedValue?.fill(0);
    }
  }

  private assertBoundedOperationInput(value: Buffer): void {
    if (
      !Buffer.isBuffer(value) ||
      value.length === 0 ||
      value.length > LOCAL_DPAPI_MAX_IO_BYTES
    ) {
      throw sanitizeProviderError();
    }
  }

  private assertSecp256k1PrivateKey(privateKey: KeyObject): void {
    if (
      privateKey.type !== "private" ||
      privateKey.asymmetricKeyType !== "ec" ||
      privateKey.asymmetricKeyDetails?.namedCurve !== "secp256k1"
    ) {
      throw sanitizeProviderError();
    }
  }
}

export function createComplianceCsidSecretCustodyProvider(config: ComplianceCsidCustodyProviderConfigurationPlan = readComplianceCsidCustodyProviderConfig()): ComplianceCsidSecretCustodyProvider {
  if (config.configuredProvider === "SANDBOX_LOCAL_DPAPI" && config.providerEnabled && config.providerConfigurationReady) {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    if (localAppData) {
      const storageDirectory = join(localAppData, "LedgerByte", "ZatcaSandboxCustody");
      return new SandboxLocalDpapiComplianceCsidCustodyProvider({ environment: "LOCAL_TEST", storageDirectory });
    }
  }
  return new DisabledComplianceCsidSecretCustodyProvider();
}
