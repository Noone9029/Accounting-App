import { join, win32 } from "node:path";

export const OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE =
  "ZATCA_SDK_CSR_EXECUTION_ENABLED";
export const OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS = Object.freeze([
  "--simulation",
  "--no-network",
  "--metadata-json",
] as const);
export const OFFICIAL_ZATCA_SDK_VERSION = "238-R3.4.8";
export const OFFICIAL_ZATCA_SDK_JAVA_VERSION = "11.0.26";
export const OFFICIAL_ZATCA_SDK_JAR_SHA256 =
  "48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530";
export const OFFICIAL_ZATCA_SDK_CONFIG_SHA256 =
  "5ECA6FFE95659F58319C9B7F831D54EB71860E9434595798628F42E4C3495408";
export const OFFICIAL_ZATCA_SDK_CSR_TIMEOUT_MS = 30_000;
export const OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES = 65_536;

const CONFIG_FILE_NAME = "csr-config.properties";
const PRIVATE_KEY_FILE_NAME = "generated-private-key.pem";
const CSR_FILE_NAME = "generated.csr";
const NETWORK_GUARD_LAUNCHER_FILE_NAME =
  "LedgerByteNoNetworkSdkLauncher.java";
const STAGED_JAR_FILE_NAME =
  "zatca-einvoicing-sdk-238-R3.4.8.jar";
const STAGED_SDK_CONFIG_FILE_NAME = "sdk-config.json";
const DISPOSABLE_CUSTODY_REFERENCE =
  "arc-07b-06h-sdk-csr-private-key";

export const OFFICIAL_SYNTHETIC_CSR_PROFILE = Object.freeze({
  commonName: "TST-886431145-399999999900003",
  serialNumber:
    "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
  organizationIdentifier: "399999999900003",
  organizationalUnitName: "Synthetic Riyadh Branch",
  organizationName: "Synthetic LedgerByte Taxpayer",
  countryName: "SA",
  invoiceType: "1100",
  locationAddress: "RRRD2929",
  businessCategory: "Synthetic accounting software",
});
export const OFFICIAL_SYNTHETIC_CSR_CONFIGURATION = [
  `csr.common.name=${OFFICIAL_SYNTHETIC_CSR_PROFILE.commonName}`,
  `csr.serial.number=${OFFICIAL_SYNTHETIC_CSR_PROFILE.serialNumber}`,
  `csr.organization.identifier=${OFFICIAL_SYNTHETIC_CSR_PROFILE.organizationIdentifier}`,
  `csr.organization.unit.name=${OFFICIAL_SYNTHETIC_CSR_PROFILE.organizationalUnitName}`,
  `csr.organization.name=${OFFICIAL_SYNTHETIC_CSR_PROFILE.organizationName}`,
  `csr.country.name=${OFFICIAL_SYNTHETIC_CSR_PROFILE.countryName}`,
  `csr.invoice.type=${OFFICIAL_SYNTHETIC_CSR_PROFILE.invoiceType}`,
  `csr.location.address=${OFFICIAL_SYNTHETIC_CSR_PROFILE.locationAddress}`,
  `csr.industry.business.category=${OFFICIAL_SYNTHETIC_CSR_PROFILE.businessCategory}`,
  "",
].join("\n");

export const OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE = `import java.io.File;
import java.io.FileOutputStream;
import java.io.FilePermission;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.SocketPermission;
import java.net.URL;
import java.net.URLClassLoader;
import java.security.Permission;
import java.util.jar.JarFile;

public final class LedgerByteNoNetworkSdkLauncher {
  private static final class DenyNetworkSecurityManager extends SecurityManager {
    private final File writableRoot;

    DenyNetworkSecurityManager(File writableRoot) throws Exception {
      this.writableRoot = writableRoot.getCanonicalFile();
    }

    @Override public void checkPermission(Permission permission) {
      if (permission instanceof SocketPermission) {
        throw new SecurityException("network disabled");
      }
      if (permission instanceof FilePermission) {
        FilePermission filePermission = (FilePermission) permission;
        String actions = permission.getActions();
        if ((actions.contains("write") || actions.contains("delete"))
            && !isWorkspaceChild(filePermission.getName())) {
          throw new SecurityException("filesystem mutation disabled");
        }
      }
      if (permission instanceof RuntimePermission
          && "setSecurityManager".equals(permission.getName())) {
        throw new SecurityException("security manager locked");
      }
    }
    @Override public void checkWrite(String file) {
      requireWorkspaceChild(file);
    }
    @Override public void checkDelete(String file) {
      requireWorkspaceChild(file);
    }
    @Override public void checkConnect(String host, int port) {
      throw new SecurityException("network disabled");
    }
    @Override public void checkConnect(String host, int port, Object context) {
      throw new SecurityException("network disabled");
    }
    @Override public void checkListen(int port) {
      throw new SecurityException("network disabled");
    }
    @Override public void checkAccept(String host, int port) {
      throw new SecurityException("network disabled");
    }
    @Override public void checkMulticast(java.net.InetAddress address) {
      throw new SecurityException("network disabled");
    }
    @Override public void checkExec(String command) {
      throw new SecurityException("subprocess disabled");
    }

    private void requireWorkspaceChild(String file) {
      if (!isWorkspaceChild(file)) {
        throw new SecurityException("filesystem mutation disabled");
      }
    }

    private boolean isWorkspaceChild(String file) {
      if (file == null || "<<ALL FILES>>".equals(file)) {
        return false;
      }
      try {
        File candidate = new File(file).getCanonicalFile();
        return !candidate.equals(writableRoot)
            && candidate.toPath().startsWith(writableRoot.toPath());
      } catch (Exception error) {
        return false;
      }
    }
  }

  private static void runGuardSelfTest() throws Exception {
    File workspace = new File(".").getCanonicalFile();
    File workspaceParent = workspace.getParentFile();
    if (workspaceParent == null) {
      throw new SecurityException("guard self-test failed");
    }
    File outsideWorkspace = new File(
        workspaceParent,
        "ledgerbyte-disallowed-write-probe-"
            + Long.toHexString(System.nanoTime())
            + ".tmp").getCanonicalFile();
    DenyNetworkSecurityManager guard =
        new DenyNetworkSecurityManager(workspace);
    System.setSecurityManager(guard);
    boolean socketDenied = false;
    boolean subprocessDenied = false;
    boolean outsideWorkspaceWriteDenied = false;
    boolean outsideWorkspaceFilePermissionDenied = false;
    try (java.net.Socket ignored = new java.net.Socket("127.0.0.1", 9)) {
      // The guarded constructor must never complete.
    } catch (SecurityException expected) {
      socketDenied = true;
    }
    try {
      Runtime.getRuntime().exec(
          new String[] {"ledgerbyte-disallowed-guard-probe"});
    } catch (SecurityException expected) {
      subprocessDenied = true;
    }
    try {
      try (FileOutputStream ignored =
          new FileOutputStream(outsideWorkspace)) {
        throw new SecurityException("guard self-test failed");
      }
    } catch (SecurityException expected) {
      outsideWorkspaceWriteDenied = true;
    }
    try {
      guard.checkPermission(
          new FilePermission(outsideWorkspace.getPath(), "write,delete"));
    } catch (SecurityException expected) {
      outsideWorkspaceFilePermissionDenied = true;
    }
    if (!socketDenied
        || !subprocessDenied
        || !outsideWorkspaceWriteDenied
        || !outsideWorkspaceFilePermissionDenied
        || outsideWorkspace.exists()) {
      throw new SecurityException("guard self-test failed");
    }
  }

  public static void main(String[] args) throws Exception {
    if (args.length == 1 && "--guard-self-test".equals(args[0])) {
      runGuardSelfTest();
      return;
    }
    if (args.length != 10
        || !"-csr".equals(args[1])
        || !"-csrConfig".equals(args[2])
        || !"-privateKey".equals(args[4])
        || !"-generatedCsr".equals(args[6])
        || !"-pem".equals(args[8])
        || !"-sim".equals(args[9])) {
      throw new IllegalArgumentException("unsafe SDK CSR arguments");
    }
    File sdkJar = new File(args[0]).getCanonicalFile();
    File workspace = new File(".").getCanonicalFile();
    if (!workspace.equals(sdkJar.getParentFile())) {
      throw new IllegalArgumentException("SDK workspace mismatch");
    }
    String mainClass;
    try (JarFile jar = new JarFile(sdkJar)) {
      mainClass = jar.getManifest().getMainAttributes().getValue("Main-Class");
    }
    if (mainClass == null || mainClass.trim().isEmpty()) {
      throw new IllegalArgumentException("SDK main class missing");
    }
    String[] sdkArgs = new String[9];
    System.arraycopy(args, 1, sdkArgs, 0, sdkArgs.length);
    System.setSecurityManager(
        new DenyNetworkSecurityManager(workspace));
    URL jarUrl = sdkJar.toURI().toURL();
    try (URLClassLoader loader = new URLClassLoader(
        new URL[] {jarUrl}, ClassLoader.getPlatformClassLoader())) {
      Class<?> entrypoint = Class.forName(mainClass, true, loader);
      Method main = entrypoint.getMethod("main", String[].class);
      try {
        main.invoke(null, (Object) sdkArgs);
      } catch (InvocationTargetException error) {
        Throwable cause = error.getCause();
        if (cause instanceof Exception) throw (Exception) cause;
        if (cause instanceof Error) throw (Error) cause;
        throw error;
      }
    }
  }
}
`;

export type SandboxSdkCsrOracleSafeErrorCode =
  | "ZATCA_SDK_CSR_ORACLE_GATE_INVALID"
  | "ZATCA_SDK_CSR_ORACLE_CLI_MODE_INVALID"
  | "ZATCA_SDK_CSR_ORACLE_INPUT_INVALID"
  | "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_JDK_PIN_MISMATCH"
  | "ZATCA_SDK_CSR_ORACLE_SDK_VERSION_PIN_MISMATCH"
  | "ZATCA_SDK_CSR_ORACLE_SDK_CHECKSUM_MISMATCH"
  | "ZATCA_SDK_CSR_ORACLE_SDK_CONFIG_CHECKSUM_MISMATCH"
  | "ZATCA_SDK_CSR_ORACLE_WORKSPACE_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_PROCESS_TIMEOUT"
  | "ZATCA_SDK_CSR_ORACLE_PROCESS_OUTPUT_LIMIT"
  | "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED"
  | "ZATCA_SDK_CSR_ORACLE_NETWORK_GUARD_SOURCE_UNVERIFIED"
  | "ZATCA_SDK_CSR_ORACLE_NETWORK_ISOLATION_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_RAW_OUTPUT_CLEANUP_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_SOURCE_CHECKSUM_CHANGED"
  | "ZATCA_SDK_CSR_ORACLE_SOURCE_CONFIG_CHECKSUM_CHANGED"
  | "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_ARTIFACT_INSPECTION_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_ARTIFACT_INVALID"
  | "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_CUSTODY_KEY_MISMATCH"
  | "ZATCA_SDK_CSR_ORACLE_CUSTODY_DELETE_FAILED"
  | "ZATCA_SDK_CSR_ORACLE_CUSTODY_METADATA_NOT_EMPTY"
  | "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED";

export interface SandboxSdkCsrOraclePaths {
  javaHome: string;
  javaBin: string;
  sdkJarPath: string;
  sdkConfigPath: string;
  systemRoot: string;
  windowsDirectory: string;
  comSpec: string;
  pathExt: string;
}

export interface SandboxSdkCsrOracleInput {
  environment: Readonly<Record<string, string | undefined>>;
  cliFlags: readonly string[];
  paths: SandboxSdkCsrOraclePaths;
  csrConfiguration: string;
}

export interface SandboxSdkCsrOraclePlan {
  disposition: "SKIP" | "REFUSE" | "EXECUTE";
  safeErrorCodes: SandboxSdkCsrOracleSafeErrorCode[];
}

export interface SandboxSdkCsrRuntimeInspection {
  jdkVersion: string;
  jdkRuntimeChecksumsVerified: boolean;
  sdkVersion: string;
  sdkJarSha256: string;
  sdkConfigSha256: string;
  networkGuardMarkersPresent: boolean;
}

export interface SandboxSdkCsrArtifactInspection {
  csrAlgorithm: "ECDSA_SHA256";
  csrAlgorithmVerified: boolean;
  csrCurve: "secp256k1";
  csrCurveVerified: boolean;
  csrSignatureVerified: boolean;
  csrSubjectVerified: boolean;
  requestedExtensionsVerified: boolean;
  csrTemplate: "PREZATCA-Code-Signing";
  csrTemplateVerified: boolean;
  privateKeyMatchesCsr: boolean;
  publicKeySha256: string;
}

export interface SandboxSdkCsrProcessRequest {
  command: string;
  arguments: readonly string[];
  cwd: string;
  environment: Readonly<Record<string, string>>;
  stdin: "ignore";
  shell: false;
  windowsHide: true;
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface SandboxSdkCsrProcessResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  outputLimitExceeded: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  terminationConfirmed: boolean;
  rawOutputCleared: boolean;
  networkIsolationVerified: boolean;
  networkCallsMade: false | null;
}

export interface SandboxSdkCsrOracleFilesystem {
  createWorkspace(): Promise<string>;
  stagePinnedJar(sourcePath: string, destinationPath: string): Promise<void>;
  stagePinnedConfig(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void>;
  writePrivateFile(
    path: string,
    value: Buffer,
    mode: 0o600,
  ): Promise<void>;
  readPrivateFile(path: string): Promise<Buffer>;
  removeFile(path: string): Promise<boolean>;
  removeDirectory(path: string): Promise<boolean>;
}

export interface SandboxSdkCsrOracleProcess {
  execute(
    request: SandboxSdkCsrProcessRequest,
  ): Promise<SandboxSdkCsrProcessResult>;
}

export interface SandboxSdkCsrOracleInspector {
  inspectRuntime(
    paths: Readonly<SandboxSdkCsrOraclePaths>,
  ): Promise<SandboxSdkCsrRuntimeInspection>;
  inspectStagedJar(path: string): Promise<{ sdkJarSha256: string }>;
  inspectStagedConfig(
    path: string,
  ): Promise<{ sdkConfigSha256: string }>;
  inspectSourceJarAfterRun(
    path: string,
  ): Promise<{ sdkJarSha256: string }>;
  inspectSourceConfigAfterRun(
    path: string,
  ): Promise<{ sdkConfigSha256: string }>;
  inspectArtifacts(input: {
    csr: Buffer;
    privateKey: Buffer;
    csrConfiguration: string;
  }): Promise<SandboxSdkCsrArtifactInspection>;
}

export interface SandboxSdkCsrOracleCustody {
  storePrivateKey(input: {
    reference: string;
    privateKey: Buffer;
    publicKeySha256: string;
  }): Promise<void>;
  verifyPublicKey(
    reference: string,
    expectedPublicKeySha256: string,
  ): Promise<boolean>;
  deleteReference(reference: string): Promise<void>;
  listDisposableMetadata(): Promise<readonly unknown[]>;
}

export interface SandboxSdkCsrOracleDependencies {
  filesystem: SandboxSdkCsrOracleFilesystem;
  process: SandboxSdkCsrOracleProcess;
  inspector: SandboxSdkCsrOracleInspector;
  custody: SandboxSdkCsrOracleCustody;
}

export interface SandboxSdkCsrOracleEvidence {
  arc: "ARC-07B-06H";
  status: "PASSED" | "FAILED";
  officialSdkTier2Executed: boolean;
  jdkVersion: string;
  sdkVersion: string;
  sdkJarSha256: string;
  sdkChecksumMatch: boolean;
  sdkConfigChecksumMatch: boolean;
  jdkRuntimeChecksumsVerified: boolean;
  simulationFlagVerified: boolean;
  noNetworkArgumentVerified: boolean;
  argumentAllowlistVerified: boolean;
  csrSignatureVerified: boolean;
  csrAlgorithm: "ECDSA_SHA256";
  csrAlgorithmVerified: boolean;
  csrCurve: "secp256k1";
  csrCurveVerified: boolean;
  csrSubjectVerified: boolean;
  requestedExtensionsVerified: boolean;
  csrTemplate: "PREZATCA-Code-Signing";
  csrTemplateVerified: boolean;
  privateKeyMatchesCsr: boolean;
  custodyPublicKeyMatchesCsr: boolean;
  plaintextKeyRemovedBeforeCustodyVerification: boolean;
  plaintextKeyFileRemoved: boolean;
  csrFileRemoved: boolean;
  configFileRemoved: boolean;
  sdkConfigFileRemoved: boolean;
  launcherWorkspaceRemoved: boolean;
  rawOutputRemoved: boolean;
  disposableCustodyMetadataEmpty: boolean;
  cleanupComplete: boolean;
  networkGuardMarkersPresent: boolean;
  networkIsolationVerified: boolean;
  networkCallsMade: false;
  otpUsed: false;
  csidRequested: false;
  sensitiveBodiesReturned: false;
  productionExecution: false;
}

export interface SandboxSdkCsrOracleState {
  workspaceCreated: boolean;
  processExecuted: boolean;
  artifactsInspected: boolean;
  custodyStored: boolean;
  custodyVerified: boolean;
  custodyDeleted: boolean;
  cleanupAttempted: boolean;
}

export interface SandboxSdkCsrOracleResult {
  status: "SKIPPED_EXTERNAL_ORACLE" | "PASSED" | "FAILED";
  phase: "SKIPPED" | "PREFLIGHT" | "COMPLETE" | "FAILED";
  safeErrorCodes: SandboxSdkCsrOracleSafeErrorCode[];
  evidence: SandboxSdkCsrOracleEvidence | null;
  state: SandboxSdkCsrOracleState;
}

export function planSandboxSdkCsrOracle(
  input: SandboxSdkCsrOracleInput,
): SandboxSdkCsrOraclePlan {
  const gateValue =
    input.environment[OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE];
  if (gateValue === undefined || gateValue === "") {
    return { disposition: "SKIP", safeErrorCodes: [] };
  }
  if (gateValue !== "true") {
    return {
      disposition: "REFUSE",
      safeErrorCodes: ["ZATCA_SDK_CSR_ORACLE_GATE_INVALID"],
    };
  }
  if (!arraysEqual(input.cliFlags, OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS)) {
    return {
      disposition: "REFUSE",
      safeErrorCodes: ["ZATCA_SDK_CSR_ORACLE_CLI_MODE_INVALID"],
    };
  }
  if (
    !safeNonEmptyString(input.paths.javaHome) ||
    !safeNonEmptyString(input.paths.javaBin) ||
    !safeNonEmptyString(input.paths.sdkJarPath) ||
    !safeNonEmptyString(input.paths.sdkConfigPath) ||
    !safeNonEmptyString(input.paths.systemRoot) ||
    !safeNonEmptyString(input.paths.windowsDirectory) ||
    !safeNonEmptyString(input.paths.comSpec) ||
    !safeNonEmptyString(input.paths.pathExt) ||
    input.csrConfiguration !== OFFICIAL_SYNTHETIC_CSR_CONFIGURATION
  ) {
    return {
      disposition: "REFUSE",
      safeErrorCodes: ["ZATCA_SDK_CSR_ORACLE_INPUT_INVALID"],
    };
  }
  return { disposition: "EXECUTE", safeErrorCodes: [] };
}

export function buildSandboxSdkCsrProcessRequest(
  input: SandboxSdkCsrOracleInput,
  workspace: string,
): SandboxSdkCsrProcessRequest {
  const configPath = join(workspace, CONFIG_FILE_NAME);
  const privateKeyPath = join(workspace, PRIVATE_KEY_FILE_NAME);
  const csrPath = join(workspace, CSR_FILE_NAME);
  const launcherPath = join(
    workspace,
    NETWORK_GUARD_LAUNCHER_FILE_NAME,
  );
  const stagedJarPath = join(workspace, STAGED_JAR_FILE_NAME);
  return {
    command: input.paths.javaBin,
    arguments: [
      "-XX:-UsePerfData",
      launcherPath,
      stagedJarPath,
      "-csr",
      "-csrConfig",
      configPath,
      "-privateKey",
      privateKeyPath,
      "-generatedCsr",
      csrPath,
      "-pem",
      "-sim",
    ],
    cwd: workspace,
    environment: {
      ComSpec: input.paths.comSpec,
      JAVA_HOME: input.paths.javaHome,
      PATH: win32.dirname(input.paths.javaBin),
      PATHEXT: input.paths.pathExt,
      SDK_CONFIG: join(workspace, STAGED_SDK_CONFIG_FILE_NAME),
      SystemRoot: input.paths.systemRoot,
      TEMP: workspace,
      TMP: workspace,
      WINDIR: input.paths.windowsDirectory,
      ZATCA_SDK_JAVA_BIN: input.paths.javaBin,
    },
    stdin: "ignore",
    shell: false,
    windowsHide: true,
    timeoutMs: OFFICIAL_ZATCA_SDK_CSR_TIMEOUT_MS,
    maxOutputBytes: OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES,
  };
}

export async function runSandboxSdkCsrOracle(
  input: SandboxSdkCsrOracleInput,
  dependencies: SandboxSdkCsrOracleDependencies,
): Promise<SandboxSdkCsrOracleResult> {
  const plan = planSandboxSdkCsrOracle(input);
  const state = emptyState();
  if (plan.disposition === "SKIP") {
    return {
      status: "SKIPPED_EXTERNAL_ORACLE",
      phase: "SKIPPED",
      safeErrorCodes: [],
      evidence: null,
      state,
    };
  }
  if (plan.disposition === "REFUSE") {
    return {
      status: "FAILED",
      phase: "PREFLIGHT",
      safeErrorCodes: plan.safeErrorCodes,
      evidence: null,
      state,
    };
  }

  const safeErrorCodes: SandboxSdkCsrOracleSafeErrorCode[] = [];
  let runtime: SandboxSdkCsrRuntimeInspection;
  try {
    runtime = await dependencies.inspector.inspectRuntime(input.paths);
  } catch {
    return preflightFailure(
      state,
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
    );
  }
  if (!validRuntimeInspection(runtime)) {
    return preflightFailure(
      state,
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
    );
  }

  if (
    runtime.jdkVersion !== OFFICIAL_ZATCA_SDK_JAVA_VERSION ||
    runtime.jdkRuntimeChecksumsVerified !== true
  ) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_JDK_PIN_MISMATCH",
    );
  }
  if (runtime.sdkVersion !== OFFICIAL_ZATCA_SDK_VERSION) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_SDK_VERSION_PIN_MISMATCH",
    );
  }
  if (
    runtime.sdkJarSha256.toUpperCase() !== OFFICIAL_ZATCA_SDK_JAR_SHA256
  ) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_SDK_CHECKSUM_MISMATCH",
    );
  }
  if (
    runtime.sdkConfigSha256.toUpperCase() !==
    OFFICIAL_ZATCA_SDK_CONFIG_SHA256
  ) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_SDK_CONFIG_CHECKSUM_MISMATCH",
    );
  }
  if (runtime.networkGuardMarkersPresent !== true) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_NETWORK_GUARD_SOURCE_UNVERIFIED",
    );
  }
  if (safeErrorCodes.length > 0) {
    return {
      status: "FAILED",
      phase: "PREFLIGHT",
      safeErrorCodes,
      evidence: null,
      state,
    };
  }

  let workspace: string | null = null;
  let configPath: string | null = null;
  let privateKeyPath: string | null = null;
  let csrPath: string | null = null;
  let launcherPath: string | null = null;
  let stagedJarPath: string | null = null;
  let stagedSdkConfigPath: string | null = null;
  let privateKey: Buffer | null = null;
  let csr: Buffer | null = null;
  let artifactInspection: SandboxSdkCsrArtifactInspection | null = null;
  let processResult: SandboxSdkCsrProcessResult | null = null;
  let custodyReference: string | null = null;
  let custodyStoreAttempted = false;
  let custodyPublicKeyMatchesCsr = false;
  let plaintextKeyRemovedBeforeCustodyVerification = false;
  let disposableCustodyMetadataEmpty = true;
  let sourceSdkChecksumUnchanged = false;
  let sourceSdkConfigChecksumUnchanged = false;
  let configFileRemoved = false;
  let plaintextKeyFileRemoved = false;
  let csrFileRemoved = false;
  let launcherFileRemoved = false;
  let stagedJarRemoved = false;
  let stagedSdkConfigRemoved = false;
  let launcherWorkspaceRemoved = false;

  try {
    try {
      workspace = await dependencies.filesystem.createWorkspace();
      if (!safeNonEmptyString(workspace)) {
        throw new Error("invalid workspace");
      }
      state.workspaceCreated = true;
      configPath = join(workspace, CONFIG_FILE_NAME);
      privateKeyPath = join(workspace, PRIVATE_KEY_FILE_NAME);
      csrPath = join(workspace, CSR_FILE_NAME);
      launcherPath = join(
        workspace,
        NETWORK_GUARD_LAUNCHER_FILE_NAME,
      );
      stagedJarPath = join(workspace, STAGED_JAR_FILE_NAME);
      stagedSdkConfigPath = join(
        workspace,
        STAGED_SDK_CONFIG_FILE_NAME,
      );
      await dependencies.filesystem.stagePinnedJar(
        input.paths.sdkJarPath,
        stagedJarPath,
      );
      await dependencies.filesystem.stagePinnedConfig(
        input.paths.sdkConfigPath,
        stagedSdkConfigPath,
      );
      const stagedJarInspection =
        await dependencies.inspector.inspectStagedJar(stagedJarPath);
      if (
        stagedJarInspection.sdkJarSha256.toUpperCase() !==
        OFFICIAL_ZATCA_SDK_JAR_SHA256
      ) {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_SDK_CHECKSUM_MISMATCH",
        );
      }
      const stagedConfigInspection =
        await dependencies.inspector.inspectStagedConfig(
          stagedSdkConfigPath,
        );
      if (
        stagedConfigInspection.sdkConfigSha256.toUpperCase() !==
        OFFICIAL_ZATCA_SDK_CONFIG_SHA256
      ) {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_SDK_CONFIG_CHECKSUM_MISMATCH",
        );
      }
      const configBytes = Buffer.from(input.csrConfiguration, "utf8");
      const launcherBytes = Buffer.from(
        OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE,
        "utf8",
      );
      try {
        await dependencies.filesystem.writePrivateFile(
          configPath,
          configBytes,
          0o600,
        );
        await dependencies.filesystem.writePrivateFile(
          launcherPath,
          launcherBytes,
          0o600,
        );
      } finally {
        configBytes.fill(0);
        launcherBytes.fill(0);
      }
    } catch {
      addSafeErrorCode(
        safeErrorCodes,
        "ZATCA_SDK_CSR_ORACLE_WORKSPACE_FAILED",
      );
    }

    if (
      safeErrorCodes.length === 0 &&
      workspace &&
      configPath &&
      privateKeyPath &&
      csrPath &&
      launcherPath &&
      stagedJarPath &&
      stagedSdkConfigPath
    ) {
      try {
        state.processExecuted = true;
        processResult = await dependencies.process.execute(
          buildSandboxSdkCsrProcessRequest(input, workspace),
        );
        addProcessResultErrors(safeErrorCodes, processResult);
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
        );
      }
    }

    if (state.processExecuted) {
      try {
        const sourceAfterRun =
          await dependencies.inspector.inspectSourceJarAfterRun(
            input.paths.sdkJarPath,
          );
        sourceSdkChecksumUnchanged =
          sourceAfterRun.sdkJarSha256.toUpperCase() ===
          OFFICIAL_ZATCA_SDK_JAR_SHA256;
        if (!sourceSdkChecksumUnchanged) {
          addSafeErrorCode(
            safeErrorCodes,
            "ZATCA_SDK_CSR_ORACLE_SOURCE_CHECKSUM_CHANGED",
          );
        }
        const sourceConfigAfterRun =
          await dependencies.inspector.inspectSourceConfigAfterRun(
            input.paths.sdkConfigPath,
          );
        sourceSdkConfigChecksumUnchanged =
          sourceConfigAfterRun.sdkConfigSha256.toUpperCase() ===
          OFFICIAL_ZATCA_SDK_CONFIG_SHA256;
        if (!sourceSdkConfigChecksumUnchanged) {
          addSafeErrorCode(
            safeErrorCodes,
            "ZATCA_SDK_CSR_ORACLE_SOURCE_CONFIG_CHECKSUM_CHANGED",
          );
        }
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_SOURCE_CHECKSUM_CHANGED",
        );
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_SOURCE_CONFIG_CHECKSUM_CHANGED",
        );
      }
    }

    if (
      safeErrorCodes.length === 0 &&
      privateKeyPath &&
      csrPath
    ) {
      try {
        privateKey =
          await dependencies.filesystem.readPrivateFile(privateKeyPath);
        csr = await dependencies.filesystem.readPrivateFile(csrPath);
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
        );
      }
    }

    if (
      safeErrorCodes.length === 0 &&
      privateKey &&
      csr
    ) {
      try {
        artifactInspection = await dependencies.inspector.inspectArtifacts({
          csr,
          privateKey,
          csrConfiguration: input.csrConfiguration,
        });
        state.artifactsInspected = true;
        if (!artifactInspectionPassed(artifactInspection)) {
          addSafeErrorCode(
            safeErrorCodes,
            "ZATCA_SDK_CSR_ORACLE_ARTIFACT_INVALID",
          );
        }
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_ARTIFACT_INSPECTION_FAILED",
        );
      }
    }

    if (
      safeErrorCodes.length === 0 &&
      privateKey &&
      artifactInspection
    ) {
      try {
        custodyReference = DISPOSABLE_CUSTODY_REFERENCE;
        custodyStoreAttempted = true;
        await dependencies.custody.storePrivateKey({
          reference: custodyReference,
          privateKey,
          publicKeySha256: artifactInspection.publicKeySha256,
        });
        state.custodyStored = true;

        privateKey.fill(0);
        privateKey = null;
        plaintextKeyFileRemoved = await safeRemoveFile(
          dependencies.filesystem,
          privateKeyPath,
        );
        if (!plaintextKeyFileRemoved) {
          addSafeErrorCode(
            safeErrorCodes,
            "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
          );
        } else {
          plaintextKeyRemovedBeforeCustodyVerification = true;
          custodyPublicKeyMatchesCsr =
            await dependencies.custody.verifyPublicKey(
              custodyReference,
              artifactInspection.publicKeySha256,
            );
          state.custodyVerified = custodyPublicKeyMatchesCsr;
          if (!custodyPublicKeyMatchesCsr) {
            addSafeErrorCode(
              safeErrorCodes,
              "ZATCA_SDK_CSR_ORACLE_CUSTODY_KEY_MISMATCH",
            );
          }
        }
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED",
        );
      }
    }
  } finally {
    privateKey?.fill(0);
    csr?.fill(0);
    state.cleanupAttempted = workspace !== null || custodyReference !== null;

    if (custodyStoreAttempted && custodyReference) {
      try {
        await dependencies.custody.deleteReference(custodyReference);
        state.custodyDeleted = true;
      } catch {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_CUSTODY_DELETE_FAILED",
        );
      }
    }
    try {
      disposableCustodyMetadataEmpty =
        (await dependencies.custody.listDisposableMetadata()).length === 0;
      if (!disposableCustodyMetadataEmpty) {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_CUSTODY_METADATA_NOT_EMPTY",
        );
      }
    } catch {
      disposableCustodyMetadataEmpty = false;
      addSafeErrorCode(
        safeErrorCodes,
        "ZATCA_SDK_CSR_ORACLE_CUSTODY_METADATA_NOT_EMPTY",
      );
    }

    if (workspace) {
      configFileRemoved = await safeRemoveFile(
        dependencies.filesystem,
        configPath,
      );
      if (!plaintextKeyFileRemoved) {
        plaintextKeyFileRemoved = await safeRemoveFile(
          dependencies.filesystem,
          privateKeyPath,
        );
      }
      csrFileRemoved = await safeRemoveFile(
        dependencies.filesystem,
        csrPath,
      );
      launcherFileRemoved = await safeRemoveFile(
        dependencies.filesystem,
        launcherPath,
      );
      stagedJarRemoved = await safeRemoveFile(
        dependencies.filesystem,
        stagedJarPath,
      );
      stagedSdkConfigRemoved = await safeRemoveFile(
        dependencies.filesystem,
        stagedSdkConfigPath,
      );
      try {
        launcherWorkspaceRemoved =
          await dependencies.filesystem.removeDirectory(workspace);
      } catch {
        launcherWorkspaceRemoved = false;
      }
      if (
        !configFileRemoved ||
        !plaintextKeyFileRemoved ||
        !csrFileRemoved ||
        !launcherFileRemoved ||
        !stagedJarRemoved ||
        !stagedSdkConfigRemoved ||
        !launcherWorkspaceRemoved
      ) {
        addSafeErrorCode(
          safeErrorCodes,
          "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
        );
      }
    }
  }

  const argumentAllowlistVerified =
    workspace !== null &&
    arraysEqual(
      buildSandboxSdkCsrProcessRequest(input, workspace).arguments,
      [
        "-XX:-UsePerfData",
        join(workspace, NETWORK_GUARD_LAUNCHER_FILE_NAME),
        join(workspace, STAGED_JAR_FILE_NAME),
        "-csr",
        "-csrConfig",
        join(workspace, CONFIG_FILE_NAME),
        "-privateKey",
        join(workspace, PRIVATE_KEY_FILE_NAME),
        "-generatedCsr",
        join(workspace, CSR_FILE_NAME),
        "-pem",
        "-sim",
      ],
    );
  const cleanupComplete =
    configFileRemoved &&
    plaintextKeyFileRemoved &&
    csrFileRemoved &&
    launcherFileRemoved &&
    stagedJarRemoved &&
    stagedSdkConfigRemoved &&
    launcherWorkspaceRemoved &&
    (!custodyStoreAttempted || state.custodyDeleted) &&
    disposableCustodyMetadataEmpty &&
    (!state.processExecuted ||
      processResult?.rawOutputCleared === true);
  const passed =
    safeErrorCodes.length === 0 &&
    state.processExecuted &&
    state.artifactsInspected &&
    state.custodyStored &&
    state.custodyVerified &&
    plaintextKeyRemovedBeforeCustodyVerification &&
    cleanupComplete &&
    sourceSdkChecksumUnchanged &&
    sourceSdkConfigChecksumUnchanged &&
    processResult?.rawOutputCleared === true &&
    processResult.networkIsolationVerified === true &&
    processResult.networkCallsMade === false &&
    runtime.networkGuardMarkersPresent === true &&
    artifactInspectionPassed(artifactInspection);
  let evidence: SandboxSdkCsrOracleEvidence | null = null;
  if (isVerifiedNoNetworkProcessResult(processResult)) {
    evidence = buildEvidence({
      passed,
      runtime,
      processExecuted: state.processExecuted,
      processResult,
      artifactInspection,
      argumentAllowlistVerified,
      custodyPublicKeyMatchesCsr,
      plaintextKeyRemovedBeforeCustodyVerification,
      sourceSdkChecksumUnchanged,
      configFileRemoved,
      sdkConfigFileRemoved: stagedSdkConfigRemoved,
      plaintextKeyFileRemoved,
      csrFileRemoved,
      launcherWorkspaceRemoved,
      disposableCustodyMetadataEmpty,
      cleanupComplete,
    });
  }

  return {
    status: passed ? "PASSED" : "FAILED",
    phase: passed ? "COMPLETE" : "FAILED",
    safeErrorCodes,
    evidence,
    state,
  };
}

function buildEvidence(input: {
  passed: boolean;
  runtime: SandboxSdkCsrRuntimeInspection;
  processExecuted: boolean;
  processResult: SandboxSdkCsrProcessResult & {
    networkIsolationVerified: true;
    networkCallsMade: false;
  };
  artifactInspection: SandboxSdkCsrArtifactInspection | null;
  argumentAllowlistVerified: boolean;
  custodyPublicKeyMatchesCsr: boolean;
  plaintextKeyRemovedBeforeCustodyVerification: boolean;
  sourceSdkChecksumUnchanged: boolean;
  configFileRemoved: boolean;
  sdkConfigFileRemoved: boolean;
  plaintextKeyFileRemoved: boolean;
  csrFileRemoved: boolean;
  launcherWorkspaceRemoved: boolean;
  disposableCustodyMetadataEmpty: boolean;
  cleanupComplete: boolean;
}): SandboxSdkCsrOracleEvidence {
  const artifact = input.artifactInspection;
  return {
    arc: "ARC-07B-06H",
    status: input.passed ? "PASSED" : "FAILED",
    officialSdkTier2Executed: input.processExecuted,
    jdkVersion: input.runtime.jdkVersion,
    sdkVersion: input.runtime.sdkVersion,
    sdkJarSha256: input.runtime.sdkJarSha256.toUpperCase(),
    sdkChecksumMatch:
      input.runtime.sdkJarSha256.toUpperCase() ===
        OFFICIAL_ZATCA_SDK_JAR_SHA256 &&
      input.sourceSdkChecksumUnchanged,
    sdkConfigChecksumMatch:
      input.runtime.sdkConfigSha256.toUpperCase() ===
      OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
    jdkRuntimeChecksumsVerified:
      input.runtime.jdkRuntimeChecksumsVerified,
    simulationFlagVerified:
      input.argumentAllowlistVerified &&
      OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS.includes("--simulation"),
    noNetworkArgumentVerified:
      input.argumentAllowlistVerified &&
      OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS.includes("--no-network"),
    argumentAllowlistVerified: input.argumentAllowlistVerified,
    csrSignatureVerified: artifact?.csrSignatureVerified === true,
    csrAlgorithm: "ECDSA_SHA256",
    csrAlgorithmVerified: artifact?.csrAlgorithmVerified === true,
    csrCurve: "secp256k1",
    csrCurveVerified: artifact?.csrCurveVerified === true,
    csrSubjectVerified: artifact?.csrSubjectVerified === true,
    requestedExtensionsVerified:
      artifact?.requestedExtensionsVerified === true,
    csrTemplate: "PREZATCA-Code-Signing",
    csrTemplateVerified: artifact?.csrTemplateVerified === true,
    privateKeyMatchesCsr: artifact?.privateKeyMatchesCsr === true,
    custodyPublicKeyMatchesCsr: input.custodyPublicKeyMatchesCsr,
    plaintextKeyRemovedBeforeCustodyVerification:
      input.plaintextKeyRemovedBeforeCustodyVerification,
    plaintextKeyFileRemoved: input.plaintextKeyFileRemoved,
    csrFileRemoved: input.csrFileRemoved,
    configFileRemoved: input.configFileRemoved,
    sdkConfigFileRemoved: input.sdkConfigFileRemoved,
    launcherWorkspaceRemoved: input.launcherWorkspaceRemoved,
    rawOutputRemoved:
      input.processExecuted &&
      input.processResult?.rawOutputCleared === true,
    disposableCustodyMetadataEmpty:
      input.disposableCustodyMetadataEmpty,
    cleanupComplete: input.cleanupComplete,
    networkGuardMarkersPresent:
      input.runtime.networkGuardMarkersPresent,
    networkIsolationVerified:
      input.processResult.networkIsolationVerified,
    networkCallsMade: input.processResult.networkCallsMade,
    otpUsed: false,
    csidRequested: false,
    sensitiveBodiesReturned: false,
    productionExecution: false,
  };
}

function addProcessResultErrors(
  safeErrorCodes: SandboxSdkCsrOracleSafeErrorCode[],
  result: SandboxSdkCsrProcessResult,
): void {
  if (!result.terminationConfirmed) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
    );
  } else if (result.timedOut) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TIMEOUT",
    );
  } else if (result.outputLimitExceeded) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_OUTPUT_LIMIT",
    );
  } else if (!validBoundedProcessResult(result)) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
    );
  } else if (
    result.stdoutBytes + result.stderrBytes >
    OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES
  ) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_OUTPUT_LIMIT",
    );
  } else if (result.exitCode !== 0) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
    );
  }
  if (!result.rawOutputCleared) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_RAW_OUTPUT_CLEANUP_FAILED",
    );
  }
  if (
    result.networkIsolationVerified !== true ||
    result.networkCallsMade !== false
  ) {
    addSafeErrorCode(
      safeErrorCodes,
      "ZATCA_SDK_CSR_ORACLE_NETWORK_ISOLATION_FAILED",
    );
  }
}

function validBoundedProcessResult(
  result: SandboxSdkCsrProcessResult | null,
): boolean {
  return (
    result !== null &&
    (result.exitCode === null ||
      (Number.isSafeInteger(result.exitCode) && result.exitCode >= 0)) &&
    (result.signal === null || typeof result.signal === "string") &&
    typeof result.timedOut === "boolean" &&
    typeof result.outputLimitExceeded === "boolean" &&
    Number.isSafeInteger(result.stdoutBytes) &&
    result.stdoutBytes >= 0 &&
    Number.isSafeInteger(result.stderrBytes) &&
    result.stderrBytes >= 0 &&
    typeof result.terminationConfirmed === "boolean" &&
    typeof result.rawOutputCleared === "boolean" &&
    typeof result.networkIsolationVerified === "boolean" &&
    (result.networkCallsMade === false || result.networkCallsMade === null)
  );
}

function isVerifiedNoNetworkProcessResult(
  value: SandboxSdkCsrProcessResult | null,
): value is SandboxSdkCsrProcessResult & {
  networkIsolationVerified: true;
  networkCallsMade: false;
} {
  return (
    value !== null &&
    value.networkIsolationVerified === true &&
    value.networkCallsMade === false
  );
}

function validRuntimeInspection(
  value: SandboxSdkCsrRuntimeInspection,
): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.jdkVersion === "string" &&
    value.jdkVersion.length > 0 &&
    typeof value.jdkRuntimeChecksumsVerified === "boolean" &&
    typeof value.sdkVersion === "string" &&
    value.sdkVersion.length > 0 &&
    typeof value.sdkJarSha256 === "string" &&
    /^[a-f0-9]{64}$/iu.test(value.sdkJarSha256) &&
    typeof value.sdkConfigSha256 === "string" &&
    /^[a-f0-9]{64}$/iu.test(value.sdkConfigSha256) &&
    typeof value.networkGuardMarkersPresent === "boolean"
  );
}

function artifactInspectionPassed(
  value: SandboxSdkCsrArtifactInspection | null,
): value is SandboxSdkCsrArtifactInspection {
  return (
    value !== null &&
    value.csrAlgorithm === "ECDSA_SHA256" &&
    value.csrAlgorithmVerified === true &&
    value.csrCurve === "secp256k1" &&
    value.csrCurveVerified === true &&
    value.csrSignatureVerified === true &&
    value.csrSubjectVerified === true &&
    value.requestedExtensionsVerified === true &&
    value.csrTemplate === "PREZATCA-Code-Signing" &&
    value.csrTemplateVerified === true &&
    value.privateKeyMatchesCsr === true &&
    /^[a-f0-9]{64}$/iu.test(value.publicKeySha256)
  );
}

async function safeRemoveFile(
  filesystem: SandboxSdkCsrOracleFilesystem,
  path: string | null,
): Promise<boolean> {
  if (!path) return false;
  try {
    return await filesystem.removeFile(path);
  } catch {
    return false;
  }
}

function preflightFailure(
  state: SandboxSdkCsrOracleState,
  code: SandboxSdkCsrOracleSafeErrorCode,
): SandboxSdkCsrOracleResult {
  return {
    status: "FAILED",
    phase: "PREFLIGHT",
    safeErrorCodes: [code],
    evidence: null,
    state,
  };
}

function emptyState(): SandboxSdkCsrOracleState {
  return {
    workspaceCreated: false,
    processExecuted: false,
    artifactsInspected: false,
    custodyStored: false,
    custodyVerified: false,
    custodyDeleted: false,
    cleanupAttempted: false,
  };
}

function arraysEqual(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function safeNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    !value.includes("\0")
  );
}

function nonEmptyText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("\0")
  );
}

function addSafeErrorCode(
  safeErrorCodes: SandboxSdkCsrOracleSafeErrorCode[],
  code: SandboxSdkCsrOracleSafeErrorCode,
): void {
  if (!safeErrorCodes.includes(code)) {
    safeErrorCodes.push(code);
  }
}
