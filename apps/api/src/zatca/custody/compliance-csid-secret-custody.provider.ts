import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

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

class WindowsCurrentUserDpapiProtector implements SandboxLocalDpapiProtector {
  async protect(plaintext: Buffer): Promise<Buffer> {
    return this.invoke("protect", plaintext);
  }

  async unprotect(ciphertext: Buffer): Promise<Buffer> {
    return this.invoke("unprotect", ciphertext);
  }

  private async invoke(operation: "protect" | "unprotect", value: Buffer): Promise<Buffer> {
    if (process.platform !== "win32") {
      throw sanitizeProviderError();
    }
    const action = operation === "protect" ? "Protect" : "Unprotect";
    const script = [
      "$ErrorActionPreference='Stop'",
      "Add-Type -AssemblyName System.Security",
      "$encoded=[Console]::In.ReadToEnd().Trim()",
      "$bytes=[Convert]::FromBase64String($encoded)",
      "$entropy=[Text.Encoding]::UTF8.GetBytes('LedgerByte:ZatcaSandboxCustody:v1')",
      `$result=[Security.Cryptography.ProtectedData]::${action}($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)`,
      "[Console]::Out.Write([Convert]::ToBase64String($result))",
    ].join(";");
    return new Promise<Buffer>((resolve, reject) => {
      const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "ignore"],
      });
      const output: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => output.push(Buffer.from(chunk)));
      child.once("error", () => reject(sanitizeProviderError()));
      child.once("close", (code) => {
        if (code !== 0) {
          reject(sanitizeProviderError());
          return;
        }
        try {
          resolve(Buffer.from(Buffer.concat(output).toString("utf8").trim(), "base64"));
        } catch {
          reject(sanitizeProviderError());
        }
      });
      child.stdin.end(value.toString("base64"));
    });
  }
}

export class SandboxLocalDpapiComplianceCsidCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  private readonly now: () => Date;
  private readonly protector: SandboxLocalDpapiProtector;

  constructor(
    private readonly options: {
      environment: "LOCAL_TEST";
      storageDirectory: string;
      protector?: SandboxLocalDpapiProtector;
      now?: () => Date;
    },
  ) {
    this.protector = options.protector ?? new WindowsCurrentUserDpapiProtector();
    this.now = options.now ?? (() => new Date());
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

  async readSecretForOperation<T>(input: SandboxLocalSecretReadInput, operation: (plaintext: Buffer) => Promise<T> | T): Promise<T> {
    this.assertSandboxReference(input);
    let plaintext: Buffer | undefined;
    try {
      const material = await this.readMaterial(input, false);
      if (material.revokedAt || (material.expiresAt && new Date(material.expiresAt).getTime() <= this.now().getTime())) {
        throw sanitizeProviderError();
      }
      const protectedValue = Buffer.from(material.protectedValue, "base64");
      plaintext = await this.protector.unprotect(protectedValue);
      return await operation(plaintext);
    } catch (error) {
      if (error instanceof Error && error.name === "ComplianceCsidSecretCustodyProviderError") {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      plaintext?.fill(0);
    }
  }

  async revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void> {
    const reference = { ...input, environment: "SANDBOX" as const };
    this.assertSandboxReference(reference);
    try {
      const material = await this.readMaterial(reference, false);
      material.revokedAt = this.now().toISOString();
      await this.writeMaterial(reference, material);
    } catch (error) {
      if (error instanceof Error && error.name === "ComplianceCsidSecretCustodyProviderError") {
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
          const material = this.parseMaterial(await readFile(join(this.options.storageDirectory, name)));
          const { protectedValue: _protectedValue, ...metadata } = material;
          return metadata;
        }),
      );
      return records;
    } catch {
      return [];
    }
  }

  private async store(kind: ComplianceCsidSecretMaterialKind, input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    this.assertSandboxReference(input);
    if (!input.value || !input.value.trim()) {
      throw sanitizeProviderError();
    }
    let plaintext = Buffer.from(input.value, "utf8");
    try {
      const protectedValue = await this.protector.protect(plaintext);
      const createdAt = this.now().toISOString();
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
      if (error instanceof Error && error.name === "ComplianceCsidSecretCustodyProviderError") {
        throw error;
      }
      throw sanitizeProviderError();
    } finally {
      plaintext.fill(0);
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
    try {
      const material = this.parseMaterial(await readFile(this.pathFor(input)));
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
    await writeFile(temporary, JSON.stringify(material), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
  }

  private async restrictStorageDirectory(): Promise<void> {
    if (process.platform !== "win32" || !process.env.USERNAME?.trim()) {
      throw sanitizeProviderError();
    }
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "icacls.exe",
        [
          this.options.storageDirectory,
          "/inheritance:r",
          "/grant:r",
          `${process.env.USERNAME}:(OI)(CI)F`,
          "/grant:r",
          "SYSTEM:(OI)(CI)F",
        ],
        { windowsHide: true, stdio: "ignore" },
      );
      child.once("error", () => reject(sanitizeProviderError()));
      child.once("close", (code) => (code === 0 ? resolve() : reject(sanitizeProviderError())));
    });
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
