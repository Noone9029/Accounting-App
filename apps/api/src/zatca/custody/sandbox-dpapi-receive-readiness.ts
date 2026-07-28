import { createHash, randomBytes } from "node:crypto";
import { lstat, readdir, realpath, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  SandboxLocalDpapiComplianceCsidCustodyProvider,
  readComplianceCsidCustodyProviderConfig,
  type SandboxLocalDpapiProtector,
  type StoreComplianceCsidSecretInput,
} from "./compliance-csid-secret-custody.provider";

const DISPOSABLE_DIRECTORY_PREFIX = "ledgerbyte-zatca-custody-proof-";
const REVIEWED_ENVIRONMENT_IDENTITY = "FATOORA_SIMULATION";
const INTERNAL_CUSTODY_ENVIRONMENT = "SANDBOX";

type ProofMaterialKind = "TOKEN" | "SECRET" | "CERTIFICATE";
type SafeProofErrorCode =
  | "ZATCA_DPAPI_RECEIVE_PROOF_TARGET_INVALID"
  | "ZATCA_DPAPI_RECEIVE_PROOF_RUNTIME_NOT_LOCAL_TEST"
  | "ZATCA_DPAPI_RECEIVE_PROOF_STORAGE_NOT_DISPOSABLE"
  | "ZATCA_DPAPI_RECEIVE_PROOF_TOKEN_FAILED"
  | "ZATCA_DPAPI_RECEIVE_PROOF_SECRET_FAILED"
  | "ZATCA_DPAPI_RECEIVE_PROOF_CERTIFICATE_FAILED"
  | "ZATCA_DPAPI_RECEIVE_PROOF_CLEANUP_FAILED";

export interface SandboxDpapiReceiveCustodyReadinessProof {
  status:
    | "DPAPI_PROOF_PASSED"
    | "BEHAVIORAL_TEST_PASSED"
    | "FAILED";
  safeErrorCodes: SafeProofErrorCode[];
  environmentIdentity: "FATOORA_SIMULATION" | "INVALID";
  internalCustodyEnvironment: "SANDBOX" | "UNMAPPED";
  provider: "SANDBOX_LOCAL_DPAPI";
  actualDpapiUsed: boolean;
  tokenReceiveReady: boolean;
  secretReceiveReady: boolean;
  certificateReceiveReady: boolean;
  revokeReady: boolean;
  deleteReady: boolean;
  cleanupReady: boolean;
  receiveCustodyReady: boolean;
  ciphertextDiffersFromPlaintext: boolean;
  systemBinaryPathsPinned: boolean;
  childProcessEnvironmentScrubbed: boolean;
  syntheticMaterialOnly: true;
  networkCallsMade: false | null;
  networkIsolationProven: false;
  sensitiveBodiesRetained: false;
  bodyReturned: false;
  productionCompliance: false;
}

export interface SandboxDpapiReceiveCustodyReadinessOptions {
  storageDirectory: string;
  environmentIdentity: "FATOORA_SIMULATION";
}

interface SandboxDpapiReceiveCustodyReadinessTestOptions
  extends SandboxDpapiReceiveCustodyReadinessOptions {
  processEnvironment: NodeJS.ProcessEnv;
  protector: SandboxLocalDpapiProtector;
}

interface MaterialProof {
  receiveReady: boolean;
  ciphertextDiffersFromPlaintext: boolean;
  revokeReady: boolean;
  deleteReady: boolean;
}

interface ClaimedDisposableDirectory {
  requestedPath: string;
  canonicalPath: string;
  device: number;
  inode: number;
  birthtimeMs: number;
  ownedFileNames: ReadonlySet<string>;
}

export async function proveSandboxDpapiReceiveCustodyReadiness(
  options: SandboxDpapiReceiveCustodyReadinessOptions,
): Promise<SandboxDpapiReceiveCustodyReadinessProof> {
  return proveSandboxDpapiReceiveCustodyReadinessInternal({
    ...options,
    processEnvironment: process.env,
  });
}

export async function __testOnlyProveSandboxDpapiReceiveCustodyReadiness(
  options: SandboxDpapiReceiveCustodyReadinessTestOptions,
): Promise<SandboxDpapiReceiveCustodyReadinessProof> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("ZATCA custody proof test-only override is unavailable.");
  }
  return proveSandboxDpapiReceiveCustodyReadinessInternal(options);
}

async function proveSandboxDpapiReceiveCustodyReadinessInternal(
  options: SandboxDpapiReceiveCustodyReadinessOptions & {
    processEnvironment: NodeJS.ProcessEnv;
    protector?: SandboxLocalDpapiProtector;
  },
): Promise<SandboxDpapiReceiveCustodyReadinessProof> {
  const safeErrorCodes: SafeProofErrorCode[] = [];
  const materialProofs = new Map<ProofMaterialKind, MaterialProof>();
  const targetMapped =
    options.environmentIdentity === REVIEWED_ENVIRONMENT_IDENTITY;
  const actualDpapiSelected =
    options.protector === undefined && process.platform === "win32";
  const custodyConfiguration = readComplianceCsidCustodyProviderConfig(
    options.processEnvironment,
  );
  const localTestRuntimeReady =
    custodyConfiguration.configuredProvider === "SANDBOX_LOCAL_DPAPI" &&
    custodyConfiguration.providerEnabled === true &&
    custodyConfiguration.providerConfigurationReady === true &&
    custodyConfiguration.tokenStorageReady === true &&
    custodyConfiguration.secretStorageReady === true &&
    custodyConfiguration.certificateStorageReady === true &&
    custodyConfiguration.productionCompliance === false;
  let claimedDirectory: ClaimedDisposableDirectory | null = null;
  let cleanupReady = false;
  let activeMaterialKind: ProofMaterialKind | null = null;

  try {
    claimedDirectory = await claimDisposableStorageDirectory(
      options.storageDirectory,
    );
    if (!claimedDirectory) {
      addSafeErrorCode(
        safeErrorCodes,
        "ZATCA_DPAPI_RECEIVE_PROOF_STORAGE_NOT_DISPOSABLE",
      );
    } else if (!targetMapped) {
      addSafeErrorCode(
        safeErrorCodes,
        "ZATCA_DPAPI_RECEIVE_PROOF_TARGET_INVALID",
      );
    } else if (!localTestRuntimeReady) {
      addSafeErrorCode(
        safeErrorCodes,
        "ZATCA_DPAPI_RECEIVE_PROOF_RUNTIME_NOT_LOCAL_TEST",
      );
    } else {
      const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
        environment: "LOCAL_TEST",
        storageDirectory: options.storageDirectory,
        protector: options.protector,
      });

      for (const materialKind of [
        "TOKEN",
        "SECRET",
        "CERTIFICATE",
      ] as const) {
        activeMaterialKind = materialKind;
        materialProofs.set(
          materialKind,
          await proveMaterialLifecycle(provider, materialKind),
        );
      }
      activeMaterialKind = null;
    }
  } catch {
    addSafeErrorCode(
      safeErrorCodes,
      materialFailureCode(activeMaterialKind),
    );
  } finally {
    if (claimedDirectory) {
      cleanupReady = await removeOwnedDisposableDirectory(
        claimedDirectory,
      );
      if (!cleanupReady) {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_DPAPI_RECEIVE_PROOF_CLEANUP_FAILED",
        );
      }
    }
  }

  const tokenReceiveReady =
    materialProofs.get("TOKEN")?.receiveReady === true;
  const secretReceiveReady =
    materialProofs.get("SECRET")?.receiveReady === true;
  const certificateReceiveReady =
    materialProofs.get("CERTIFICATE")?.receiveReady === true;
  const allMaterialsProven =
    tokenReceiveReady && secretReceiveReady && certificateReceiveReady;
  const ciphertextDiffersFromPlaintext =
    allMaterialsProven &&
    [...materialProofs.values()].every(
      (proof) => proof.ciphertextDiffersFromPlaintext,
    );
  const revokeReady =
    allMaterialsProven &&
    [...materialProofs.values()].every((proof) => proof.revokeReady);
  const deleteReady =
    allMaterialsProven &&
    [...materialProofs.values()].every((proof) => proof.deleteReady);
  const proofPassed =
    safeErrorCodes.length === 0 &&
    targetMapped &&
    localTestRuntimeReady &&
    allMaterialsProven &&
    ciphertextDiffersFromPlaintext &&
    revokeReady &&
    deleteReady &&
    cleanupReady;
  const hardenedActualDpapiProof =
    proofPassed && actualDpapiSelected && ciphertextDiffersFromPlaintext;

  return {
    status: proofPassed
      ? actualDpapiSelected
        ? "DPAPI_PROOF_PASSED"
        : "BEHAVIORAL_TEST_PASSED"
      : "FAILED",
    safeErrorCodes,
    environmentIdentity: targetMapped ? "FATOORA_SIMULATION" : "INVALID",
    internalCustodyEnvironment: targetMapped ? "SANDBOX" : "UNMAPPED",
    provider: "SANDBOX_LOCAL_DPAPI",
    actualDpapiUsed: hardenedActualDpapiProof,
    tokenReceiveReady,
    secretReceiveReady,
    certificateReceiveReady,
    revokeReady,
    deleteReady,
    cleanupReady,
    receiveCustodyReady: hardenedActualDpapiProof,
    ciphertextDiffersFromPlaintext,
    systemBinaryPathsPinned: hardenedActualDpapiProof,
    childProcessEnvironmentScrubbed: hardenedActualDpapiProof,
    syntheticMaterialOnly: true,
    networkCallsMade: hardenedActualDpapiProof ? false : null,
    networkIsolationProven: false,
    sensitiveBodiesRetained: false,
    bodyReturned: false,
    productionCompliance: false,
  };
}

async function proveMaterialLifecycle(
  provider: SandboxLocalDpapiComplianceCsidCustodyProvider,
  materialKind: ProofMaterialKind,
): Promise<MaterialProof> {
  const referenceId = `receive-proof-${materialKind.toLowerCase()}`;
  const syntheticBytes = randomBytes(32);
  const serializedSyntheticValue = syntheticBytes.toString("base64");
  const expectedPlaintext = Buffer.from(serializedSyntheticValue, "utf8");
  const input: StoreComplianceCsidSecretInput = {
    organizationId: "00000000-0000-4000-8000-000000000001",
    egsUnitId: "00000000-0000-4000-8000-000000000002",
    referenceId,
    environment: INTERNAL_CUSTODY_ENVIRONMENT,
    value: serializedSyntheticValue,
  };

  try {
    const stored = await storeMaterial(provider, materialKind, input);
    const bodySafe =
      stored.provider === "SANDBOX_LOCAL_DPAPI" &&
      stored.bodyReturned === false &&
      stored.productionCompliance === false &&
      !stored.referenceId.includes(referenceId);
    const ciphertextDiffersFromPlaintext =
      await provider.storedCiphertextDiffersFromExpectedValue(
        {
          organizationId: input.organizationId,
          egsUnitId: input.egsUnitId,
          referenceId,
          environment: INTERNAL_CUSTODY_ENVIRONMENT,
        },
        expectedPlaintext,
      );
    const readMatches = await provider.secretMatchesExpectedValue(
      {
        organizationId: input.organizationId,
        egsUnitId: input.egsUnitId,
        referenceId,
        environment: INTERNAL_CUSTODY_ENVIRONMENT,
      },
      expectedPlaintext,
    );
    await provider.revokeReference({
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      referenceId,
    });
    const revokedReferenceRejected = await rejectsWithSafeProviderError(() =>
      provider.secretMatchesExpectedValue(
        {
          organizationId: input.organizationId,
          egsUnitId: input.egsUnitId,
          referenceId,
          environment: INTERNAL_CUSTODY_ENVIRONMENT,
        },
        expectedPlaintext,
      ),
    );
    await provider.deleteReference({
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      referenceId,
      environment: INTERNAL_CUSTODY_ENVIRONMENT,
    });
    const metadataRemoved = (await provider.listMetadataOnly()).length === 0;

    if (
      !bodySafe ||
      !ciphertextDiffersFromPlaintext ||
      !readMatches ||
      !revokedReferenceRejected ||
      !metadataRemoved
    ) {
      throw new Error("bounded receive-custody proof failed");
    }
    return {
      receiveReady: true,
      ciphertextDiffersFromPlaintext: true,
      revokeReady: true,
      deleteReady: true,
    };
  } finally {
    syntheticBytes.fill(0);
    expectedPlaintext.fill(0);
  }
}

function storeMaterial(
  provider: SandboxLocalDpapiComplianceCsidCustodyProvider,
  materialKind: ProofMaterialKind,
  input: StoreComplianceCsidSecretInput,
) {
  if (materialKind === "TOKEN") {
    return provider.storeComplianceToken(input);
  }
  if (materialKind === "SECRET") {
    return provider.storeComplianceSecret(input);
  }
  return provider.storeComplianceCertificate(input);
}

async function rejectsWithSafeProviderError(
  operation: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch (error) {
    return (
      error instanceof Error &&
      error.name === "ComplianceCsidSecretCustodyProviderError"
    );
  }
}

async function claimDisposableStorageDirectory(
  storageDirectory: string,
): Promise<ClaimedDisposableDirectory | null> {
  try {
    const candidate = resolve(storageDirectory);
    const candidateInputStat = await lstat(candidate);
    const candidateRealPath = await realpath(candidate);
    const tempRealPath = await realpath(tmpdir());
    const candidateRealStat = await lstat(candidateRealPath);
    const safe =
      candidateInputStat.isDirectory() &&
      !candidateInputStat.isSymbolicLink() &&
      candidateRealStat.isDirectory() &&
      samePath(dirname(candidateRealPath), tempRealPath) &&
      basename(candidateRealPath).startsWith(DISPOSABLE_DIRECTORY_PREFIX) &&
      (await readdir(candidateRealPath)).length === 0;
    if (!safe) {
      return null;
    }
    return {
      requestedPath: candidate,
      canonicalPath: candidateRealPath,
      device: candidateInputStat.dev,
      inode: candidateInputStat.ino,
      birthtimeMs: candidateInputStat.birthtimeMs,
      ownedFileNames: proofOwnedFileNames(),
    };
  } catch {
    return null;
  }
}

async function removeOwnedDisposableDirectory(
  claimed: ClaimedDisposableDirectory,
): Promise<boolean> {
  try {
    const currentInputStat = await lstat(claimed.requestedPath);
    if (
      !currentInputStat.isDirectory() ||
      currentInputStat.isSymbolicLink() ||
      currentInputStat.dev !== claimed.device ||
      currentInputStat.ino !== claimed.inode ||
      currentInputStat.birthtimeMs !== claimed.birthtimeMs
    ) {
      return false;
    }
    const currentRealPath = await realpath(claimed.requestedPath);
    if (!samePath(currentRealPath, claimed.canonicalPath)) {
      return false;
    }

    let foreignEntryPresent = false;
    for (const name of await readdir(claimed.canonicalPath)) {
      if (!claimed.ownedFileNames.has(name)) {
        foreignEntryPresent = true;
        continue;
      }
      const ownedPath = join(claimed.canonicalPath, name);
      const ownedStat = await lstat(ownedPath);
      if (!ownedStat.isFile() || ownedStat.isSymbolicLink()) {
        foreignEntryPresent = true;
        continue;
      }
      await unlink(ownedPath);
    }
    if (foreignEntryPresent || (await readdir(claimed.canonicalPath)).length > 0) {
      return false;
    }
    await rmdir(claimed.canonicalPath);
    return true;
  } catch {
    return false;
  }
}

function proofOwnedFileNames(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const materialKind of ["TOKEN", "SECRET", "CERTIFICATE"] as const) {
    const referenceId = `receive-proof-${materialKind.toLowerCase()}`;
    const digest = createHash("sha256")
      .update(
        [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
          INTERNAL_CUSTODY_ENVIRONMENT,
          referenceId,
        ].join("\u0000"),
      )
      .digest("hex");
    names.add(`${digest}.json`);
    names.add(`${digest}.json.tmp`);
  }
  return names;
}

function samePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function materialFailureCode(
  materialKind: ProofMaterialKind | null,
): SafeProofErrorCode {
  if (materialKind === "SECRET") {
    return "ZATCA_DPAPI_RECEIVE_PROOF_SECRET_FAILED";
  }
  if (materialKind === "CERTIFICATE") {
    return "ZATCA_DPAPI_RECEIVE_PROOF_CERTIFICATE_FAILED";
  }
  return "ZATCA_DPAPI_RECEIVE_PROOF_TOKEN_FAILED";
}

function addSafeErrorCode(
  safeErrorCodes: SafeProofErrorCode[],
  code: SafeProofErrorCode,
): void {
  if (!safeErrorCodes.includes(code)) {
    safeErrorCodes.push(code);
  }
}
