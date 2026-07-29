import { EventEmitter } from "node:events";
import {
  createHash,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import {
  OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES,
  OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE,
  OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
  OFFICIAL_ZATCA_SDK_JAR_SHA256,
  OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE,
} from "./sandbox-sdk-csr-oracle";
import {
  ComplianceCsidCustodyProcessTerminationUnconfirmedError,
  SandboxLocalDpapiComplianceCsidCustodyProvider,
} from "./compliance-csid-secret-custody.provider";
import {
  executeSandboxSdkCsrOracleRuntime,
  runSandboxSdkCsrBoundedChildProcess,
  type SandboxSdkCsrRuntimeSpawn,
} from "./sandbox-sdk-csr-oracle-runtime";

const cliOptions = {
  simulation: true,
  noNetwork: true,
  metadataJson: true,
} as const;

const SYNTHETIC_USER_SID =
  "S-1-5-21-1111111111-2222222222-3333333333-1001";
const SYNTHETIC_SDK_CONFIG = '{"synthetic":true}\n';
const PINNED_SYNTHETIC_JDK_COMPONENTS = Object.freeze([
  {
    relativePath: join("bin", "java.exe"),
    byteLength: 49_696,
    sha256:
      "821E8A51DEA921D444BB366BC19747A92F55711251486CF0BB530A55D66FC76C",
  },
  {
    relativePath: join("bin", "server", "jvm.dll"),
    byteLength: 12_119_096,
    sha256:
      "E74495C828B767809D994CF4E7BF60577033FEB97D098D21D748028BB6F41938",
  },
  {
    relativePath: join("bin", "java.dll"),
    byteLength: 158_264,
    sha256:
      "23F02A226FF1C5C1DE8E4638E5057196A502546E2FEDFB4000519BCC81EDDEB5",
  },
  {
    relativePath: join("bin", "jli.dll"),
    byteLength: 89_136,
    sha256:
      "4296B7396036006F37D7694A59D998246BE0515D65012165E8BE368B3BF67570",
  },
  {
    relativePath: join("lib", "modules"),
    byteLength: 141_348_230,
    sha256:
      "96A1716CDD6D50205F34E3BF5B7F807DB66900E8BF038FA1BAC76E19EE414C58",
  },
] as const);

interface SyntheticChildScenario {
  stdout?: Buffer;
  stderr?: Buffer;
  exitCode?: number;
  neverClose?: boolean;
  closeAfterKill?: boolean;
  emitError?: boolean;
  stdoutError?: boolean;
  stderrError?: boolean;
  closeDelayMs?: number;
  suppressStdinEndCallback?: boolean;
  beforeClose?: () => void;
  afterStdout?: (controls: SyntheticChildControls) => void;
  afterClose?: () => void;
  afterKill?: () => void;
  onStdin?: (
    value: Buffer,
    controls: SyntheticChildControls,
  ) => void;
  onStdinEnd?: (controls: SyntheticChildControls) => void;
}

interface SyntheticChildControls {
  writeStdout(value: Buffer | string): void;
  writeStderr(value: Buffer | string): void;
  close(exitCode?: number | null, signal?: string | null): void;
}

function syntheticSpawn(
  select: (
    command: string,
    args: readonly string[],
    options: Readonly<Record<string, unknown>>,
  ) => SyntheticChildScenario,
): SandboxSdkCsrRuntimeSpawn {
  let nextSyntheticPid = 20_000;
  return ((command, args, options) => {
    const scenario = select(command, args, options);
    const child = new EventEmitter() as EventEmitter & {
      pid: number;
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      kill: jest.Mock<boolean, [NodeJS.Signals?]>;
    };
    let closeEmitted = false;
    const emitClose = (
      exitCode: number | null = scenario.exitCode ?? 0,
      signal: string | null = null,
    ) => {
      if (closeEmitted) return;
      closeEmitted = true;
      child.emit("close", exitCode, signal);
      scenario.afterClose?.();
    };
    const controls: SyntheticChildControls = {
      writeStdout: (value) => child.stdout.write(value),
      writeStderr: (value) => child.stderr.write(value),
      close: (exitCode, signal) => {
        queueMicrotask(() =>
          emitClose(exitCode ?? scenario.exitCode ?? 0, signal ?? null),
        );
      },
    };
    child.pid = nextSyntheticPid;
    nextSyntheticPid += 1;
    child.stdin = new PassThrough();
    if (scenario.suppressStdinEndCallback) {
      child.stdin.end = ((chunk?: Uint8Array) => {
        if (chunk) {
          child.stdin.write(Buffer.from(chunk));
        }
        return child.stdin;
      }) as typeof child.stdin.end;
    }
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.stdin.on("data", (chunk: Buffer) => {
      const value = Buffer.from(chunk);
      try {
        scenario.onStdin?.(value, controls);
      } finally {
        value.fill(0);
      }
    });
    child.stdin.once("finish", () => {
      try {
        scenario.onStdinEnd?.(controls);
      } catch {
        child.emit("error", new Error("synthetic stdin error"));
      }
    });
    child.kill = jest.fn(() => {
      scenario.afterKill?.();
      if (scenario.closeAfterKill !== false) {
        queueMicrotask(() => emitClose(null, "SIGKILL"));
      }
      return true;
    });
    queueMicrotask(() => {
      if (scenario.stdout) {
        child.stdout.write(Buffer.from(scenario.stdout));
        scenario.afterStdout?.(controls);
      }
      if (scenario.stderr) child.stderr.write(Buffer.from(scenario.stderr));
      if (scenario.stdoutError) {
        child.stdout.emit("error", new Error("synthetic stdout error"));
      }
      if (scenario.stderrError) {
        child.stderr.emit("error", new Error("synthetic stderr error"));
      }
      scenario.beforeClose?.();
      if (scenario.emitError) {
        child.emit("error", new Error("synthetic child error"));
      }
      if (!scenario.neverClose) {
        if (
          Number.isSafeInteger(scenario.closeDelayMs) &&
          (scenario.closeDelayMs ?? 0) > 0
        ) {
          setTimeout(
            () => emitClose(scenario.exitCode ?? 0, null),
            scenario.closeDelayMs,
          );
        } else {
          emitClose(scenario.exitCode ?? 0, null);
        }
      }
    });
    return child;
  }) as SandboxSdkCsrRuntimeSpawn;
}

function validInspection() {
  return {
    valid: true,
    status: "VALID" as const,
    safeErrorCodes: [],
    checks: {
      boundedDer: true,
      structureValid: true,
      signatureAlgorithmValid: true,
      curveValid: true,
      subjectValid: true,
      extensionsValid: true,
      simulationTemplateValid: true,
      expectedPublicKeyMatch: true,
      signatureValid: true,
    },
    sensitiveBodiesReturned: false as const,
  };
}

async function makeRuntimeHarness(
  options: {
    javaVersionOutput?: string;
    hash?: (
      path: string,
      invocation: number,
    ) => Promise<string> | string;
    sdkExitCode?: number;
    omitKey?: boolean;
    oversizedKey?: boolean;
    extraArtifact?:
      | "FILE"
      | "DIRECTORY"
      | "NESTED_DIRECTORY"
      | "HARDLINK";
    hardlinkKey?: boolean;
    custodyPublicKeyMismatch?: boolean;
    custodyStoreTerminationUnconfirmed?: boolean;
    appEnvironment?: string;
    javaVersionScenario?: SyntheticChildScenario;
    aclScenario?: SyntheticChildScenario;
    guardScenario?: SyntheticChildScenario;
    leaseReadyOutput?: string;
    leaseReleaseCloses?: boolean;
    leaseStartupProgress?: boolean;
    failCustodyLeaseBeforeReady?: boolean;
    failExecutionLeaseDuringSdk?: boolean;
    failJdkLeaseDuringSdk?: boolean;
    failOuterLeasesDuringSdk?: boolean;
    keepExecutionLeaseOpenAfterKill?: boolean;
    keepOuterLeasesOpenAfterKill?: boolean;
    failExecutionLeaseOnRelease?: boolean;
    suppressExecutionLeaseReleaseCallback?: boolean;
    sdkScenario?: SyntheticChildScenario;
    taskkillScenario?: SyntheticChildScenario;
    taskkillScenarios?: readonly SyntheticChildScenario[];
    secureDeleteExitCode?: number;
    secureDeletePreservesTarget?: boolean;
    secureDeleteNeverCloses?: boolean;
    sdkRootViaJunction?: boolean;
    fakeSystemRoot?: boolean;
    ambientUsername?: string;
    whoamiOutput?: string;
    jdkFingerprintMismatch?: string;
    swapGeneratedKeyAfterLstat?: boolean;
    privateKeyTrailingGarbage?: boolean;
    privateKeyFormat?: "sec1" | "pkcs8";
    privateKeyLineEnding?: "LF" | "CRLF";
    mutateStagedInputDuringGuard?:
      | "JAR"
      | "LAUNCHER"
      | "SDK_CONFIG";
  } = {},
) {
  const externalRoot = await mkdtemp(
    join(tmpdir(), "lbzcsr-runtime-test-"),
  );
  const javaHome = join(externalRoot, "jdk");
  const javaBin = join(javaHome, "bin", "java.exe");
  const sdkRoot = join(externalRoot, "sdk");
  const sdkJar = join(
    sdkRoot,
    "Apps",
    "zatca-einvoicing-sdk-238-R3.4.8.jar",
  );
  const sdkConfigDirectory = join(sdkRoot, "Configuration");
  for (const component of PINNED_SYNTHETIC_JDK_COMPONENTS) {
    const componentPath = join(javaHome, component.relativePath);
    await mkdir(dirname(componentPath), { recursive: true });
    await writeFile(componentPath, Buffer.alloc(0));
    await truncate(componentPath, component.byteLength);
  }
  await mkdir(dirname(sdkJar), { recursive: true });
  await mkdir(sdkConfigDirectory, { recursive: true });
  await writeFile(sdkJar, "synthetic-sdk");
  await writeFile(
    join(sdkConfigDirectory, "config.json"),
    SYNTHETIC_SDK_CONFIG,
  );
  const sdkRootForEnvironment = options.sdkRootViaJunction
    ? join(externalRoot, "sdk-junction")
    : sdkRoot;
  if (options.sdkRootViaJunction) {
    await symlink(
      sdkRoot,
      sdkRootForEnvironment,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  const fakeSystemRoot = join(externalRoot, "fake-windows");
  if (options.fakeSystemRoot) {
    await mkdir(join(fakeSystemRoot, "System32"), { recursive: true });
    await writeFile(join(fakeSystemRoot, "System32", "cmd.exe"), "fake");
    await writeFile(
      join(fakeSystemRoot, "System32", "icacls.exe"),
      "fake",
    );
    await writeFile(
      join(fakeSystemRoot, "System32", "whoami.exe"),
      "fake",
    );
    await writeFile(
      join(fakeSystemRoot, "System32", "taskkill.exe"),
      "fake",
    );
    await mkdir(
      join(
        fakeSystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
      ),
      { recursive: true },
    );
    await writeFile(
      join(
        fakeSystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      "fake",
    );
  }

  const keyPair = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  const exportedPrivateKeyPem = Buffer.from(
    keyPair.privateKey.export({
      format: "pem",
      type: options.privateKeyFormat ?? "sec1",
    }),
  );
  const privateKeyPem =
    options.privateKeyLineEnding === "CRLF"
      ? Buffer.from(
          exportedPrivateKeyPem
            .toString("ascii")
            .replace(/\n/gu, "\r\n"),
          "ascii",
        )
      : Buffer.from(exportedPrivateKeyPem);
  exportedPrivateKeyPem.fill(0);
  const sdkRequests: Array<{
    command: string;
    args: readonly string[];
    options: Readonly<Record<string, unknown>>;
  }> = [];
  const guardSelfTests: Array<{
    command: string;
    args: readonly string[];
    options: Readonly<Record<string, unknown>>;
  }> = [];
  let sdkWorkspace: string | null = null;
  let aclWorkspace: string | null = null;
  let guardWorkspace: string | null = null;
  const executionEvents: string[] = [];
  const aclInvocations: string[][] = [];
  const whoamiInvocations: Array<{
    args: readonly string[];
    options: Readonly<Record<string, unknown>>;
  }> = [];
  const leaseInvocations: Array<{
    label: "CUSTODY" | "JDK" | "WORKSPACE" | "EXECUTION" | "PATH";
    directory: string | null;
    files: readonly string[];
    releaseWrites: number[][];
    readyObserved: boolean;
    closedObserved: boolean;
    startupProgressSuppressed: boolean;
    failHelper: (() => void) | null;
  }> = [];
  const secureDeleteOperations: Array<{
    target: string;
    metadataBytes: number;
    metadataOverflow: boolean;
    metadataVerified: boolean;
    deleted: boolean;
    bodyRetained: false;
  }> = [];
  const taskkillInvocations: string[][] = [];
  let executionLeaseReleaseAttemptedResolve!: () => void;
  const executionLeaseReleaseAttempted = new Promise<void>(
    (resolvePromise) => {
      executionLeaseReleaseAttemptedResolve = resolvePromise;
    },
  );
  let executionLeaseReleaseAttemptedObserved = false;
  const syntheticVirtualFingerprints = new Map<
    string,
    {
      byteLength: number;
      virtualSha256: string;
      actualSha256: string;
    }
  >();
  let sdkConfigAtSdkSpawn: {
    path: string;
    stagedInWorkspace: boolean;
    contentMatches: boolean;
  } | null = null;
  const externalKeyLink = join(externalRoot, "external-key-link.pem");
  const externalUnexpectedSource = join(
    externalRoot,
    "external-unexpected-source.txt",
  );
  const replacementKeyPath = join(
    externalRoot,
    "replacement-private-key.pem",
  );
  const displacedKeyPath = join(
    externalRoot,
    "displaced-private-key.pem",
  );
  if (options.swapGeneratedKeyAfterLstat) {
    const replacement = generateKeyPairSync("ec", {
      namedCurve: "secp256k1",
    });
    await writeFile(
      replacementKeyPath,
      replacement.privateKey.export({ format: "pem", type: "sec1" }),
    );
  }
  const spawnProcess = syntheticSpawn((command, args, spawnOptions) => {
    const commandName = basename(command).toLowerCase();
    const childEnvironment = {
      ...((spawnOptions.env ?? {}) as Record<string, string>),
    };
    if (commandName === "whoami.exe") {
      whoamiInvocations.push({ args: [...args], options: spawnOptions });
      executionEvents.push("WHOAMI");
      return {
        stdout: Buffer.from(
          options.whoamiOutput ??
            `"SYNTHETIC\\runtime-user","${SYNTHETIC_USER_SID}"\r\n`,
          "utf8",
        ),
      };
    }
    if (
      commandName === "powershell.exe" &&
      Object.hasOwn(childEnvironment, "LB_PATH_LEASE_FILE_COUNT")
    ) {
      const count = Number(
        childEnvironment.LB_PATH_LEASE_FILE_COUNT ?? "0",
      );
      const files = Array.from(
        { length: Number.isSafeInteger(count) ? count : 0 },
        (_, index) =>
          childEnvironment[`LB_PATH_LEASE_FILE_${index}`] ?? "",
      );
      const leaseDirectory =
        childEnvironment.LB_PATH_LEASE_DIRECTORY || null;
      const normalizedFiles = files
        .map((path) => resolve(path).toLowerCase())
        .sort();
      const normalizedJdkFiles =
        PINNED_SYNTHETIC_JDK_COMPONENTS.map((component) =>
          resolve(javaHome, component.relativePath).toLowerCase(),
        ).sort();
      const candidateWorkspace =
        files.length > 0 ? dirname(files[0]!) : "";
      const normalizedExecutionFiles = [
        join(candidateWorkspace, basename(sdkJar)),
        join(
          candidateWorkspace,
          "LedgerByteNoNetworkSdkLauncher.java",
        ),
        join(candidateWorkspace, "csr-config.properties"),
        join(candidateWorkspace, "sdk-config.json"),
      ]
        .map((path) => resolve(path).toLowerCase())
        .sort();
      const samePathSet = (
        left: readonly string[],
        right: readonly string[],
      ) =>
        left.length === right.length &&
        left.every((path, index) => path === right[index]);
      const leaseLabel: (typeof leaseInvocations)[number]["label"] =
        leaseDirectory === null &&
        samePathSet(normalizedFiles, normalizedJdkFiles)
          ? "JDK"
          : leaseDirectory !== null &&
              resolve(leaseDirectory).toLowerCase() ===
                resolve(candidateWorkspace).toLowerCase() &&
              files.every(
                (path) =>
                  dirname(path).toLowerCase() ===
                  candidateWorkspace.toLowerCase(),
              ) &&
              samePathSet(
                normalizedFiles,
                normalizedExecutionFiles,
              )
            ? "EXECUTION"
            : files.length === 0 &&
                leaseDirectory &&
                basename(leaseDirectory).startsWith(
                  "lbzcsr-custody-",
                )
              ? "CUSTODY"
              : files.length === 0 &&
                  leaseDirectory &&
                  basename(leaseDirectory).startsWith(
                    "lbzcsr-sdk-",
                  )
                ? "WORKSPACE"
                : "PATH";
      const invocation = {
        label: leaseLabel,
        directory: leaseDirectory,
        files,
        releaseWrites: [] as number[][],
        readyObserved: false,
        closedObserved: false,
        failHelper: null as (() => void) | null,
        startupProgressSuppressed: (() => {
          const encodedIndex = args.indexOf("-EncodedCommand");
          const encoded =
            encodedIndex >= 0 ? args[encodedIndex + 1] ?? "" : "";
          const script = Buffer.from(encoded, "base64").toString(
            "utf16le",
          );
          return script.includes(
            "$ProgressPreference='SilentlyContinue'",
          );
        })(),
      };
      leaseInvocations.push(invocation);
      executionEvents.push(`LEASE:${leaseLabel}:SPAWN`);
      if (
        options.failCustodyLeaseBeforeReady &&
        leaseLabel === "CUSTODY"
      ) {
        return {
          stderr: Buffer.from("synthetic lease startup failure", "ascii"),
          neverClose: true,
          closeAfterKill: false,
        };
      }
      return {
        stdout: Buffer.from(
          options.leaseReadyOutput ?? "READY\n",
          "ascii",
        ),
        stderr:
          options.leaseStartupProgress &&
          !invocation.startupProgressSuppressed
            ? Buffer.from(
                "#< CLIXML Preparing modules for first use. Completed",
                "ascii",
              )
            : undefined,
        neverClose: true,
        closeAfterKill:
          (leaseLabel === "EXECUTION" &&
            (options.keepExecutionLeaseOpenAfterKill ||
              (options.failExecutionLeaseOnRelease &&
                !options.suppressExecutionLeaseReleaseCallback))) ||
          (options.keepOuterLeasesOpenAfterKill &&
            (leaseLabel === "JDK" || leaseLabel === "WORKSPACE"))
            ? false
            : undefined,
        suppressStdinEndCallback:
          options.suppressExecutionLeaseReleaseCallback &&
          leaseLabel === "EXECUTION",
        afterStdout: (controls) => {
          invocation.failHelper = () =>
            controls.writeStderr("synthetic lease failure");
          invocation.readyObserved = true;
          executionEvents.push(`LEASE:${leaseLabel}:READY`);
        },
        afterClose: () => {
          invocation.closedObserved = true;
          executionEvents.push(`LEASE:${leaseLabel}:CLOSED`);
        },
        onStdin: (value, controls) => {
          invocation.releaseWrites.push([...value]);
          if (
            leaseLabel === "EXECUTION" &&
            value.length === 1 &&
            value[0] === "R".charCodeAt(0) &&
            !executionLeaseReleaseAttemptedObserved
          ) {
            executionLeaseReleaseAttemptedObserved = true;
            executionLeaseReleaseAttemptedResolve();
          }
          if (
            options.failExecutionLeaseOnRelease &&
            leaseLabel === "EXECUTION"
          ) {
            controls.writeStderr("synthetic lease release failure");
            return;
          }
          if (
            value.length === 1 &&
            value[0] === "R".charCodeAt(0) &&
            options.leaseReleaseCloses !== false
          ) {
            executionEvents.push(`LEASE:${leaseLabel}:RELEASE`);
            controls.writeStdout("CLOSED\n");
            controls.close(0);
          }
        },
      };
    }
    if (
      commandName === "powershell.exe" &&
      Object.hasOwn(childEnvironment, "LB_SECURE_DELETE_PATH")
    ) {
      const target = childEnvironment.LB_SECURE_DELETE_PATH ?? "";
      const metadata = Buffer.alloc(40);
      let metadataBytes = 0;
      const operation = {
        target,
        metadataBytes: 0,
        metadataOverflow: false,
        metadataVerified: false,
        deleted: false,
        bodyRetained: false as const,
      };
      secureDeleteOperations.push(operation);
      executionEvents.push(
        `SECURE_DELETE:${basename(target || "missing")}`,
      );
      return {
        neverClose: true,
        onStdin: (value) => {
          const remaining = Math.max(
            0,
            metadata.length - metadataBytes,
          );
          const copiedBytes = Math.min(value.length, remaining);
          value.copy(
            metadata,
            metadataBytes,
            0,
            copiedBytes,
          );
          metadataBytes += copiedBytes;
          operation.metadataBytes = metadataBytes;
          operation.metadataOverflow ||= copiedBytes !== value.length;
        },
        onStdinEnd: (controls) => {
          let targetValue: Buffer | undefined;
          let actualDigest: Buffer | undefined;
          let targetMissing = false;
          try {
            targetMissing = !existsSync(target);
            if (
              metadataBytes === metadata.length &&
              !operation.metadataOverflow &&
              !targetMissing
            ) {
              const targetDetails = lstatSync(target);
              if (
                !targetDetails.isFile() ||
                targetDetails.isSymbolicLink() ||
                targetDetails.nlink !== 1
              ) {
                operation.metadataVerified = false;
              } else {
                targetValue = readFileSync(target);
                actualDigest = createHash("sha256")
                  .update(targetValue)
                  .digest();
                const expectedLength = Number(
                  metadata.readBigInt64LE(0),
                );
                const expectedDigestHex = metadata
                  .subarray(8)
                  .toString("hex")
                  .toUpperCase();
                const actualDigestHex = actualDigest
                  .toString("hex")
                  .toUpperCase();
                const virtualFingerprint =
                  syntheticVirtualFingerprints.get(
                    resolve(target).toLowerCase(),
                  );
                operation.metadataVerified =
                  expectedLength === targetValue.length &&
                  (actualDigest.equals(metadata.subarray(8)) ||
                    (virtualFingerprint?.byteLength ===
                      targetValue.length &&
                      virtualFingerprint.virtualSha256 ===
                        expectedDigestHex &&
                      virtualFingerprint.actualSha256 ===
                        actualDigestHex));
                if (
                  operation.metadataVerified &&
                  options.secureDeletePreservesTarget !== true &&
                  options.secureDeleteExitCode === undefined
                ) {
                  writeFileSync(
                    target,
                    Buffer.alloc(targetValue.length),
                  );
                  truncateSync(target, 0);
                  unlinkSync(target);
                  operation.deleted = true;
                }
              }
            }
          } finally {
            targetValue?.fill(0);
            actualDigest?.fill(0);
            metadata.fill(0);
          }
          if (options.secureDeleteNeverCloses !== true) {
            controls.close(
              options.secureDeleteExitCode ??
                (targetMissing ||
                operation.deleted ||
                (operation.metadataVerified &&
                  options.secureDeletePreservesTarget === true)
                  ? 0
                  : 1),
            );
          }
        },
      };
    }
    if (commandName === "taskkill.exe") {
      const taskkillScenario =
        options.taskkillScenarios?.[taskkillInvocations.length] ??
        options.taskkillScenario ??
        {};
      taskkillInvocations.push([...args]);
      executionEvents.push("TASKKILL");
      return {
        ...taskkillScenario,
        afterClose: () => {
          executionEvents.push("TASKKILL:CLOSED");
          taskkillScenario.afterClose?.();
        },
      };
    }
    if (commandName === "icacls.exe") {
      aclWorkspace ??= String(args[0]);
      aclInvocations.push([...args]);
      executionEvents.push(`ACL:${basename(String(args[0]))}`);
      return options.aclScenario ?? {};
    }
    if (args.length === 1 && args[0] === "-version") {
      return {
        stderr: Buffer.from(
          options.javaVersionOutput ??
            'openjdk version "11.0.26" 2025-01-21 LTS\nOpenJDK Runtime Environment Microsoft-11913455 (build 11.0.26+4-LTS)\n',
        ),
        ...options.javaVersionScenario,
      };
    }
    if (args.includes("--guard-self-test")) {
      executionEvents.push("GUARD");
      guardSelfTests.push({ command, args, options: spawnOptions });
      guardWorkspace = String(spawnOptions.cwd);
      return {
        ...options.guardScenario,
        beforeClose: () => {
          options.guardScenario?.beforeClose?.();
          if (options.mutateStagedInputDuringGuard === "JAR") {
            writeFileSync(
              join(
                String(spawnOptions.cwd),
                basename(sdkJar),
              ),
              "mutated-sdk",
            );
          } else if (
            options.mutateStagedInputDuringGuard === "LAUNCHER"
          ) {
            writeFileSync(args[1]!, "mutated-launcher");
          } else if (
            options.mutateStagedInputDuringGuard === "SDK_CONFIG"
          ) {
            writeFileSync(
              childEnvironment.SDK_CONFIG!,
              "mutated-sdk-config",
            );
          }
        },
      };
    }
    executionEvents.push("SDK");
    sdkRequests.push({ command, args, options: spawnOptions });
    sdkWorkspace = String(spawnOptions.cwd);
    const configuredSdkPath = childEnvironment.SDK_CONFIG ?? "";
    let stagedConfigValue: Buffer | undefined;
    const expectedConfigValue = Buffer.from(
      SYNTHETIC_SDK_CONFIG,
      "utf8",
    );
    try {
      if (configuredSdkPath && existsSync(configuredSdkPath)) {
        stagedConfigValue = readFileSync(configuredSdkPath);
      }
      sdkConfigAtSdkSpawn = {
        path: configuredSdkPath,
        stagedInWorkspace:
          dirname(configuredSdkPath).toLowerCase() ===
          sdkWorkspace.toLowerCase(),
        contentMatches:
          stagedConfigValue?.equals(expectedConfigValue) === true,
      };
    } finally {
      stagedConfigValue?.fill(0);
      expectedConfigValue.fill(0);
    }
    return {
      ...options.sdkScenario,
      exitCode: options.sdkExitCode ?? 0,
      afterKill: () => {
        executionEvents.push("SDK:KILL");
        options.sdkScenario?.afterKill?.();
      },
      afterClose: () => {
        executionEvents.push("SDK:CLOSED");
        options.sdkScenario?.afterClose?.();
      },
      beforeClose: () => {
        if (options.failExecutionLeaseDuringSdk) {
          leaseInvocations
            .find((invocation) => invocation.label === "EXECUTION")
            ?.failHelper?.();
          return;
        }
        if (options.failJdkLeaseDuringSdk) {
          leaseInvocations
            .find((invocation) => invocation.label === "JDK")
            ?.failHelper?.();
          return;
        }
        if (options.failOuterLeasesDuringSdk) {
          for (const label of ["JDK", "WORKSPACE"] as const) {
            leaseInvocations
              .find((invocation) => invocation.label === label)
              ?.failHelper?.();
          }
          return;
        }
        options.sdkScenario?.beforeClose?.();
        if (options.sdkExitCode && options.sdkExitCode !== 0) return;
        const keyPath = args[args.indexOf("-privateKey") + 1]!;
        const csrPath = args[args.indexOf("-generatedCsr") + 1]!;
        if (!options.omitKey) {
          writeFileSync(
            keyPath,
            options.oversizedKey
              ? Buffer.alloc(16 * 1024 + 1, 0x41)
              : options.privateKeyTrailingGarbage
                ? Buffer.concat([
                    privateKeyPem,
                    Buffer.from("TRAILING-DATA", "ascii"),
                  ])
                : privateKeyPem,
          );
          if (options.hardlinkKey) {
            linkSync(keyPath, externalKeyLink);
          }
        }
        writeFileSync(
          csrPath,
          [
            "-----BEGIN CERTIFICATE REQUEST-----",
            Buffer.from([0x30, 0x00]).toString("base64"),
            "-----END CERTIFICATE REQUEST-----",
            "",
          ].join("\r\n"),
        );
        if (options.extraArtifact === "FILE") {
          writeFileSync(join(dirname(keyPath), "unexpected.tmp"), "extra");
        } else if (options.extraArtifact === "DIRECTORY") {
          writeFileSync(join(dirname(keyPath), "unexpected-source"), "extra");
          mkdirSync(join(dirname(keyPath), "unexpected"));
        } else if (options.extraArtifact === "NESTED_DIRECTORY") {
          mkdirSync(join(dirname(keyPath), "unexpected"));
          writeFileSync(
            join(dirname(keyPath), "unexpected", "nested.txt"),
            "preserve-untrusted-entry",
          );
        } else if (options.extraArtifact === "HARDLINK") {
          writeFileSync(externalUnexpectedSource, "preserve-me");
          linkSync(
            externalUnexpectedSource,
            join(dirname(keyPath), "unexpected.tmp"),
          );
        }
      },
    };
  });

  let hashInvocation = 0;
  const hashFile = jest.fn(async (path: string) => {
    hashInvocation += 1;
    const injectedHash = await options.hash?.(path, hashInvocation);
    if (injectedHash) return injectedHash;
    const content = await readFile(path);
    try {
      const actualHash = createHash("sha256")
        .update(content)
        .digest("hex")
        .toUpperCase();
      if (
        ["config.json", "sdk-config.json"].includes(
          basename(path).toLowerCase(),
        )
      ) {
        const expectedConfig = Buffer.from(
          SYNTHETIC_SDK_CONFIG,
          "utf8",
        );
        try {
          return content.equals(expectedConfig)
            ? OFFICIAL_ZATCA_SDK_CONFIG_SHA256
            : actualHash;
        } finally {
          expectedConfig.fill(0);
        }
      }
      return content.equals(Buffer.from("synthetic-sdk", "ascii"))
        ? OFFICIAL_ZATCA_SDK_JAR_SHA256
        : actualHash;
    } finally {
      content.fill(0);
    }
  });
  const fingerprintFile = jest.fn(
    async (
      path: string,
      minimumBytes: number,
      maximumBytes: number,
    ) => {
      const details = lstatSync(path);
      if (
        !details.isFile() ||
        details.isSymbolicLink() ||
        details.nlink !== 1 ||
        details.size < minimumBytes ||
        details.size > maximumBytes
      ) {
        throw new Error("synthetic fingerprint target rejected");
      }
      const component = PINNED_SYNTHETIC_JDK_COMPONENTS.find(
        (candidate) =>
          join(javaHome, candidate.relativePath).toLowerCase() ===
          path.toLowerCase(),
      );
      if (component) {
        const mismatch =
          options.jdkFingerprintMismatch?.toLowerCase() ===
            component.relativePath.toLowerCase() ||
          options.jdkFingerprintMismatch?.toLowerCase() ===
            basename(component.relativePath).toLowerCase();
        return {
          byteLength: component.byteLength,
          sha256:
            mismatch ||
            minimumBytes !== component.byteLength ||
            maximumBytes !== component.byteLength
              ? "0".repeat(64)
              : component.sha256,
        };
      }
      const value = await readFile(path);
      try {
        if (
          ["config.json", "sdk-config.json"].includes(
            basename(path).toLowerCase(),
          )
        ) {
          const expectedConfig = Buffer.from(
            SYNTHETIC_SDK_CONFIG,
            "utf8",
          );
          try {
            if (value.equals(expectedConfig)) {
              syntheticVirtualFingerprints.set(
                resolve(path).toLowerCase(),
                {
                  byteLength: value.length,
                  virtualSha256:
                    OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
                  actualSha256: createHash("sha256")
                    .update(value)
                    .digest("hex")
                    .toUpperCase(),
                },
              );
              return {
                byteLength: value.length,
                sha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
              };
            }
          } finally {
            expectedConfig.fill(0);
          }
        }
        return {
          byteLength: value.length,
          sha256: createHash("sha256")
            .update(value)
            .digest("hex")
            .toUpperCase(),
        };
      } finally {
        value.fill(0);
      }
    },
  );
  const inspectCsr = jest.fn(() => validInspection());
  const custodyFactory = jest.fn((storageDirectory: string) => {
    const prefix = Buffer.from("protected:");
    const provider =
      new SandboxLocalDpapiComplianceCsidCustodyProvider({
        environment: "LOCAL_TEST",
        storageDirectory,
        disposableStorage: true,
        protector: {
          protect: async (value) =>
            Buffer.concat([prefix, Buffer.from(value)]),
          unprotect: async (value) => {
            const plaintext = Buffer.from(value.subarray(prefix.length));
            if (options.custodyPublicKeyMismatch) {
              const other = generateKeyPairSync("ec", {
                namedCurve: "secp256k1",
              });
              plaintext.fill(0);
              return Buffer.from(
                other.privateKey.export({ format: "pem", type: "sec1" }),
              );
            }
            return plaintext;
          },
        },
      });
    if (options.custodyStoreTerminationUnconfirmed) {
      jest
        .spyOn(provider, "importSyntheticPrivateKeyForOperation")
        .mockRejectedValue(
          new ComplianceCsidCustodyProcessTerminationUnconfirmedError(),
        );
    }
    return provider;
  });

  const environment = {
    [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "true",
    APP_ENV: options.appEnvironment ?? "LOCAL",
    JAVA_HOME: javaHome,
    ZATCA_SDK_JAVA_BIN: javaBin,
    ZATCA_SDK_ROOT: sdkRootForEnvironment,
    SystemRoot: options.fakeSystemRoot
      ? fakeSystemRoot
      : process.env.SystemRoot,
    WINDIR: options.fakeSystemRoot
      ? fakeSystemRoot
      : process.env.WINDIR,
    USERNAME: options.ambientUsername ?? process.env.USERNAME,
    DATABASE_URL: "must-not-leak",
    ZATCA_OTP: "must-not-leak",
    HTTPS_PROXY: "must-not-leak",
  };
  const testSystemRoot = join(externalRoot, "test-windows");
  const runtimePathInspector = jest.fn(async () => ({
    javaHome,
    javaBin,
    sdkRoot: sdkRootForEnvironment,
    sdkJarPath: sdkJar,
    sdkConfigPath: join(sdkConfigDirectory, "config.json"),
    systemRoot: testSystemRoot,
    windowsDirectory: testSystemRoot,
    comSpec: join(testSystemRoot, "System32", "cmd.exe"),
    icacls: join(testSystemRoot, "System32", "icacls.exe"),
    powershell: join(
      testSystemRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
    whoami: join(testSystemRoot, "System32", "whoami.exe"),
    taskkill: join(testSystemRoot, "System32", "taskkill.exe"),
    jdkComponentPaths: PINNED_SYNTHETIC_JDK_COMPONENTS.map((component) =>
      join(javaHome, component.relativePath),
    ),
    pathExt: ".COM;.EXE;.BAT;.CMD",
  }));

  return {
    externalRoot,
    privateKeyPem,
    keyPair,
    javaHome,
    javaBin,
    sdkJar,
    sdkConfig: join(sdkConfigDirectory, "config.json"),
    environment,
    sdkRequests,
    guardSelfTests,
    externalKeyLink,
    externalUnexpectedSource,
    fakeSystemRoot,
    runtimePathInspector,
    aclInvocations,
    whoamiInvocations,
    leaseInvocations,
    secureDeleteOperations,
    taskkillInvocations,
    executionEvents,
    executionLeaseReleaseAttempted,
    getSdkWorkspace: () => sdkWorkspace,
    getAclWorkspace: () => aclWorkspace,
    getGuardWorkspace: () => guardWorkspace,
    getSdkConfigAtSdkSpawn: () => sdkConfigAtSdkSpawn,
    hashFile,
    fingerprintFile,
    inspectCsr,
    custodyFactory,
    execute: () =>
      executeSandboxSdkCsrOracleRuntime(cliOptions, {
        environment,
        currentWorkingDirectory: process.cwd(),
        temporaryRoot: externalRoot,
        runtimePathInspector:
          options.sdkRootViaJunction || options.fakeSystemRoot
            ? undefined
            : runtimePathInspector,
        spawnProcess,
        hashFile,
        fingerprintFile,
        inspectCsr,
        custodyProviderFactory: custodyFactory,
        artifactReadCheckpoint: async (path) => {
          if (
            options.swapGeneratedKeyAfterLstat &&
            basename(path) === "generated-private-key.pem"
          ) {
            await rename(path, displacedKeyPath);
            await rename(replacementKeyPath, path);
          }
        },
      }),
    cleanup: async () => {
      privateKeyPem.fill(0);
      await rm(externalRoot, { recursive: true, force: true });
    },
  };
}

describe("sandbox SDK CSR concrete runtime", () => {
  it("returns the normal skip without path, hash, process, inspector, or custody side effects", async () => {
    const spawnProcess = jest.fn() as unknown as SandboxSdkCsrRuntimeSpawn;
    const hashFile = jest.fn(async () => OFFICIAL_ZATCA_SDK_JAR_SHA256);
    const inspectCsr = jest.fn(() => validInspection());
    const custodyProviderFactory = jest.fn();

    const result = await executeSandboxSdkCsrOracleRuntime(cliOptions, {
      environment: {},
      currentWorkingDirectory: process.cwd(),
      spawnProcess,
      hashFile,
      inspectCsr,
      custodyProviderFactory: custodyProviderFactory as never,
    });

    expect(result.status).toBe("SKIPPED_EXTERNAL_ORACLE");
    expect(spawnProcess).not.toHaveBeenCalled();
    expect(hashFile).not.toHaveBeenCalled();
    expect(inspectCsr).not.toHaveBeenCalled();
    expect(custodyProviderFactory).not.toHaveBeenCalled();
  });

  it("fails closed on an unmocked unsupported runtime before Windows inspection or execution", async () => {
    const spawnProcess = jest.fn() as unknown as SandboxSdkCsrRuntimeSpawn;
    const result = await executeSandboxSdkCsrOracleRuntime(cliOptions, {
      environment: {
        [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "true",
        APP_ENV: "LOCAL",
        JAVA_HOME: "C:\\missing-jdk",
        ZATCA_SDK_JAVA_BIN: "C:\\missing-jdk\\bin\\java.exe",
        ZATCA_SDK_ROOT: "C:\\missing-sdk",
        SystemRoot: "C:\\Windows",
        WINDIR: "C:\\Windows",
      },
      currentWorkingDirectory: process.cwd(),
      spawnProcess,
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
    ]);
    expect(spawnProcess).not.toHaveBeenCalled();
  });

  it("discovers pinned external inputs, uses the no-network source launcher with exact SDK flags and a scrubbed environment, and cleans all temporary state", async () => {
    const harness = await makeRuntimeHarness();
    try {
      const result = await harness.execute();

      expect(result.status).toBe("PASSED");
      expect(harness.runtimePathInspector).toHaveBeenCalledTimes(1);
      expect(harness.guardSelfTests).toHaveLength(1);
      expect(harness.sdkRequests).toHaveLength(1);
      const request = harness.sdkRequests[0]!;
      expect(request.command).toMatch(/java\.exe$/i);
      expect(request.args).toEqual([
        "-XX:-UsePerfData",
        expect.stringMatching(
          /LedgerByteNoNetworkSdkLauncher\.java$/u,
        ),
        expect.stringMatching(
          /zatca-einvoicing-sdk-238-R3\.4\.8\.jar$/u,
        ),
        "-csr",
        "-csrConfig",
        expect.stringMatching(/csr-config\.properties$/u),
        "-privateKey",
        expect.stringMatching(/generated-private-key\.pem$/u),
        "-generatedCsr",
        expect.stringMatching(/generated\.csr$/u),
        "-pem",
        "-sim",
      ]);
      expect(request.args).not.toContain("--globalVersion");
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "checkExec(String command)",
      );
      const childEnvironment = request.options.env as Record<string, string>;
      expect(Object.keys(childEnvironment).sort()).toEqual(
        [
          "ComSpec",
          "JAVA_HOME",
          "PATH",
          "PATHEXT",
          "SDK_CONFIG",
          "SystemRoot",
          "TEMP",
          "TMP",
          "WINDIR",
          "ZATCA_SDK_JAVA_BIN",
        ].sort(),
      );
      expect(JSON.stringify(childEnvironment)).not.toMatch(
        /must-not-leak|DATABASE_URL|ZATCA_OTP|HTTPS_PROXY/u,
      );
      expect(JSON.stringify(childEnvironment)).not.toContain(
        "C:\\Windows",
      );
      expect(harness.hashFile).toHaveBeenCalled();
      expect(
        harness.hashFile.mock.calls.map(([path]) => basename(path)),
      ).toEqual(
        expect.arrayContaining([
          "zatca-einvoicing-sdk-238-R3.4.8.jar",
          "config.json",
          "sdk-config.json",
        ]),
      );
      expect(harness.inspectCsr).toHaveBeenCalledTimes(1);
      expect(harness.custodyFactory).toHaveBeenCalledTimes(1);
      expect(result.evidence).toMatchObject({
        status: "PASSED",
        networkCallsMade: false,
        cleanupComplete: true,
        disposableCustodyMetadataEmpty: true,
      });
      expect(JSON.stringify(result)).not.toContain(harness.externalRoot);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("uses the pinned whoami CSV SID for ACL principals even when ambient USERNAME is mutable Everyone", async () => {
    const harness = await makeRuntimeHarness({
      ambientUsername: "Everyone",
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("PASSED");
      expect(harness.whoamiInvocations).toHaveLength(1);
      expect(harness.whoamiInvocations[0]?.args).toEqual([
        "/user",
        "/fo",
        "csv",
        "/nh",
      ]);
      const aclArguments = harness.aclInvocations.flat();
      expect(aclArguments).toContain(
        `*${SYNTHETIC_USER_SID}:(OI)(CI)F`,
      );
      expect(JSON.stringify(aclArguments)).not.toContain("Everyone");
      expect(
        harness.sdkRequests[0]?.options.env,
      ).not.toHaveProperty("USERNAME");
    } finally {
      await harness.cleanup();
    }
  });

  it("stages SDK_CONFIG inside the leased workspace and never gives Java the mutable source path", async () => {
    const harness = await makeRuntimeHarness();
    try {
      const result = await harness.execute();

      expect(result.status).toBe("PASSED");
      const workspace = harness.getSdkWorkspace()!;
      const stagedConfigPath = join(workspace, "sdk-config.json");
      expect(harness.getSdkConfigAtSdkSpawn()).toEqual({
        path: stagedConfigPath,
        stagedInWorkspace: true,
        contentMatches: true,
      });
      expect(
        (
          harness.sdkRequests[0]?.options.env as
            | Record<string, string>
            | undefined
        )?.SDK_CONFIG,
      ).toBe(stagedConfigPath);
      expect(stagedConfigPath).not.toBe(harness.sdkConfig);
      expect(
        harness.leaseInvocations.some(
          (invocation) =>
            invocation.directory === workspace &&
            invocation.files.includes(stagedConfigPath),
        ),
      ).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("fails closed before SDK execution when a pinned JDK component fingerprint is substituted", async () => {
    const harness = await makeRuntimeHarness({
      jdkFingerprintMismatch: join("bin", "server", "jvm.dll"),
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(
        result.safeErrorCodes.some((code) =>
          [
            "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
            "ZATCA_SDK_CSR_ORACLE_JDK_PIN_MISMATCH",
          ].includes(code),
        ),
      ).toBe(true);
      expect(harness.sdkRequests).toHaveLength(0);
      expect(harness.fingerprintFile).toHaveBeenCalledWith(
        join(harness.javaHome, "bin", "server", "jvm.dll"),
        12_119_096,
        12_119_096,
      );
    } finally {
      await harness.cleanup();
    }
  });

  it.each([
    {
      name: "source checksum mismatch",
      options: { hash: async () => "0".repeat(64) },
      code: "ZATCA_SDK_CSR_ORACLE_SDK_CHECKSUM_MISMATCH",
    },
    {
      name: "SDK nonzero exit",
      options: { sdkExitCode: 7 },
      code: "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
    },
    {
      name: "missing key",
      options: { omitKey: true },
      code: "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
    },
    {
      name: "oversized key",
      options: { oversizedKey: true },
      code: "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
    },
    {
      name: "custody key mismatch",
      options: { custodyPublicKeyMismatch: true },
      code: "ZATCA_SDK_CSR_ORACLE_CUSTODY_KEY_MISMATCH",
    },
  ])("fails closed for $name", async ({ options, code }) => {
    const harness = await makeRuntimeHarness(options);
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(code);
      expect(JSON.stringify(result)).not.toContain(harness.externalRoot);
      if (harness.getSdkWorkspace()) {
        expect(existsSync(harness.getSdkWorkspace()!)).toBe(
          "oversizedKey" in options &&
            options.oversizedKey === true,
        );
      }
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves unexpected workspace files and reports cleanup false instead of deleting unreviewed artifacts", async () => {
    const fileHarness = await makeRuntimeHarness({
      extraArtifact: "FILE",
    });
    try {
      const fileResult = await fileHarness.execute();
      expect(fileResult.status).toBe("FAILED");
      expect(fileResult.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
      );
      expect(fileResult.evidence?.cleanupComplete).toBe(false);
      expect(existsSync(fileHarness.getSdkWorkspace()!)).toBe(true);
      expect(
        await readFile(
          join(fileHarness.getSdkWorkspace()!, "unexpected.tmp"),
          "utf8",
        ),
      ).toBe("extra");
    } finally {
      await fileHarness.cleanup();
    }

    const directoryHarness = await makeRuntimeHarness({
      extraArtifact: "DIRECTORY",
    });
    try {
      const directoryResult = await directoryHarness.execute();
      expect(directoryResult.status).toBe("FAILED");
      expect(directoryResult.evidence?.cleanupComplete).toBe(false);
      expect(existsSync(directoryHarness.getSdkWorkspace()!)).toBe(true);
      expect(
        await readFile(
          join(
            directoryHarness.getSdkWorkspace()!,
            "unexpected-source",
          ),
          "utf8",
        ),
      ).toBe("extra");
      expect(
        existsSync(
          join(directoryHarness.getSdkWorkspace()!, "unexpected"),
        ),
      ).toBe(true);
    } finally {
      await directoryHarness.cleanup();
    }
  });

  it("fails before Java or SDK execution when the explicit LOCAL custody environment is absent", async () => {
    const harness = await makeRuntimeHarness({
      appEnvironment: "",
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      );
      expect(harness.guardSelfTests).toHaveLength(0);
      expect(harness.sdkRequests).toHaveLength(0);
    } finally {
      await harness.cleanup();
    }
  });

  it("rejects a junction-backed SDK root before Java, hashing, custody, or SDK execution", async () => {
    const harness = await makeRuntimeHarness({
      sdkRootViaJunction: true,
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      );
      expect(harness.hashFile).not.toHaveBeenCalled();
      expect(harness.custodyFactory).not.toHaveBeenCalled();
      expect(harness.guardSelfTests).toHaveLength(0);
      expect(harness.sdkRequests).toHaveLength(0);
    } finally {
      await harness.cleanup();
    }
  });

  it("rejects an untrusted SystemRoot before executing a substituted system binary", async () => {
    const harness = await makeRuntimeHarness({
      fakeSystemRoot: true,
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      );
      expect(harness.hashFile).not.toHaveBeenCalled();
      expect(harness.custodyFactory).not.toHaveBeenCalled();
      expect(harness.guardSelfTests).toHaveLength(0);
      expect(harness.sdkRequests).toHaveLength(0);
    } finally {
      await harness.cleanup();
    }
  });

  it("rejects a substituted ambient SystemRoot instead of trusting the same environment value twice", async () => {
    const harness = await makeRuntimeHarness({
      fakeSystemRoot: true,
    });
    const originalSystemRoot = process.env.SystemRoot;
    const originalWindir = process.env.WINDIR;
    process.env.SystemRoot = harness.fakeSystemRoot;
    process.env.WINDIR = harness.fakeSystemRoot;
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      );
      expect(harness.hashFile).not.toHaveBeenCalled();
      expect(harness.guardSelfTests).toHaveLength(0);
      expect(harness.sdkRequests).toHaveLength(0);
    } finally {
      if (originalSystemRoot === undefined) {
        delete process.env.SystemRoot;
      } else {
        process.env.SystemRoot = originalSystemRoot;
      }
      if (originalWindir === undefined) {
        delete process.env.WINDIR;
      } else {
        process.env.WINDIR = originalWindir;
      }
      await harness.cleanup();
    }
  });

  it("rejects a generated key replaced between path inspection and handle open", async () => {
    const harness = await makeRuntimeHarness({
      swapGeneratedKeyAfterLstat: true,
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
      );
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
      );
      expect(harness.inspectCsr).not.toHaveBeenCalled();
      expect(result.evidence?.cleanupComplete).toBe(false);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(true);
      expect(
        existsSync(
          join(
            harness.getSdkWorkspace()!,
            "generated-private-key.pem",
          ),
        ),
      ).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("rejects trailing data after the single SDK-generated private-key PEM block", async () => {
    const harness = await makeRuntimeHarness({
      privateKeyTrailingGarbage: true,
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_ARTIFACT_INSPECTION_FAILED",
      );
      expect(harness.inspectCsr).not.toHaveBeenCalled();
      expect(result.evidence?.cleanupComplete).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("inspects the private key without converting its PEM body into immutable JavaScript strings", async () => {
    const harness = await makeRuntimeHarness();
    const originalToString = Buffer.prototype.toString;
    const privateKeyHeaders = [
      Buffer.from("-----BEGIN EC PRIVATE KEY-----", "ascii"),
      Buffer.from("-----BEGIN PRIVATE KEY-----", "ascii"),
    ];
    const toStringSpy = jest
      .spyOn(Buffer.prototype, "toString")
      .mockImplementation(function (
        this: Buffer,
        ...arguments_: unknown[]
      ) {
        if (
          privateKeyHeaders.some(
            (header) =>
              this.length >= header.length &&
              this.subarray(0, header.length).equals(header),
          )
        ) {
          throw new Error(
            "private-key buffers must not become JavaScript strings",
          );
        }
        return originalToString.apply(
          this,
          arguments_ as Parameters<Buffer["toString"]>,
        );
      });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("PASSED");
    } finally {
      toStringSpy.mockRestore();
      for (const header of privateKeyHeaders) header.fill(0);
      await harness.cleanup();
    }
  });

  it("accepts one canonical PKCS#8 private-key PEM block with consistent CRLF line endings", async () => {
    const harness = await makeRuntimeHarness({
      privateKeyFormat: "pkcs8",
      privateKeyLineEnding: "CRLF",
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("PASSED");
    } finally {
      await harness.cleanup();
    }
  });

  it("holds exact JDK and workspace leases through SDK exit and observes READY, release, CLOSED, then cleanup", async () => {
    const harness = await makeRuntimeHarness();
    try {
      const result = await harness.execute();
      expect(result.status).toBe("PASSED");

      const workspace = harness.getGuardWorkspace()!;
      const normalizedPaths = (paths: readonly string[]) =>
        paths.map((path) => resolve(path).toLowerCase()).sort();
      const expectedJdkFiles =
        PINNED_SYNTHETIC_JDK_COMPONENTS.map((component) =>
          join(harness.javaHome, component.relativePath),
        );
      const expectedExecutionFiles = [
        join(workspace, "LedgerByteNoNetworkSdkLauncher.java"),
        join(workspace, basename(harness.sdkJar)),
        join(workspace, "csr-config.properties"),
        join(workspace, "sdk-config.json"),
      ];
      const custodyDirectory = String(
        harness.custodyFactory.mock.calls[0]?.[0],
      );

      expect(harness.leaseInvocations).toHaveLength(4);
      expect(
        harness.leaseInvocations.map((invocation) => invocation.label),
      ).toEqual(["CUSTODY", "JDK", "WORKSPACE", "EXECUTION"]);
      const [
        custodyLease,
        jdkLease,
        workspaceLease,
        executionLease,
      ] = harness.leaseInvocations;
      expect(custodyLease).toMatchObject({
        directory: custodyDirectory,
        files: [],
      });
      expect(jdkLease?.directory).toBeNull();
      expect(normalizedPaths(jdkLease?.files ?? [])).toEqual(
        normalizedPaths(expectedJdkFiles),
      );
      expect(workspaceLease).toMatchObject({
        directory: workspace,
        files: [],
      });
      expect(executionLease?.directory).toBe(workspace);
      expect(normalizedPaths(executionLease?.files ?? [])).toEqual(
        normalizedPaths(expectedExecutionFiles),
      );
      for (const invocation of harness.leaseInvocations) {
        expect(invocation).toMatchObject({
          releaseWrites: [["R".charCodeAt(0)]],
          readyObserved: true,
          closedObserved: true,
        });
      }

      const eventIndex = (event: string) => {
        const index = harness.executionEvents.indexOf(event);
        expect(index).toBeGreaterThan(-1);
        return index;
      };
      const guardIndex = eventIndex("GUARD");
      const sdkIndex = eventIndex("SDK");
      expect(sdkIndex).toBeGreaterThan(guardIndex);
      for (const label of [
        "CUSTODY",
        "JDK",
        "WORKSPACE",
        "EXECUTION",
      ]) {
        const spawnIndex = eventIndex(`LEASE:${label}:SPAWN`);
        const readyIndex = eventIndex(`LEASE:${label}:READY`);
        const releaseIndex = eventIndex(`LEASE:${label}:RELEASE`);
        const closedIndex = eventIndex(`LEASE:${label}:CLOSED`);
        expect(readyIndex).toBeGreaterThan(spawnIndex);
        expect(releaseIndex).toBeGreaterThan(readyIndex);
        expect(closedIndex).toBeGreaterThan(releaseIndex);
      }
      expect(eventIndex("LEASE:JDK:READY")).toBeLessThan(guardIndex);
      expect(eventIndex("LEASE:WORKSPACE:READY")).toBeLessThan(
        guardIndex,
      );
      expect(eventIndex("LEASE:EXECUTION:READY")).toBeLessThan(
        guardIndex,
      );
      expect(eventIndex("LEASE:JDK:RELEASE")).toBeGreaterThan(
        sdkIndex,
      );
      expect(eventIndex("LEASE:WORKSPACE:RELEASE")).toBeGreaterThan(
        sdkIndex,
      );
      const executionLeaseClosed = eventIndex(
        "LEASE:EXECUTION:CLOSED",
      );
      const secureDeleteIndexes = harness.executionEvents
        .map((event, index) =>
          event.startsWith("SECURE_DELETE:") ? index : -1,
        )
        .filter((index) => index >= 0);
      expect(secureDeleteIndexes).not.toHaveLength(0);
      expect(Math.min(...secureDeleteIndexes)).toBeGreaterThan(
        executionLeaseClosed,
      );
      expect(eventIndex("LEASE:WORKSPACE:RELEASE")).toBeGreaterThan(
        Math.max(...secureDeleteIndexes),
      );
    } finally {
      await harness.cleanup();
    }
  });

  it("suppresses the deterministic Windows PowerShell startup progress record before opening path leases", async () => {
    const harness = await makeRuntimeHarness({
      leaseStartupProgress: true,
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("PASSED");
      expect(harness.leaseInvocations).toHaveLength(4);
      expect(
        harness.leaseInvocations.every(
          (invocation) => invocation.startupProgressSuppressed,
        ),
      ).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("uses pinned taskkill and waits for confirmed termination before cleaning a failed custody lease", async () => {
    const harness = await makeRuntimeHarness({
      failCustodyLeaseBeforeReady: true,
    });
    try {
      const result = await harness.execute();
      const custodyDirectory = harness.leaseInvocations[0]?.directory;

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED",
      );
      expect(result.safeErrorCodes).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(harness.taskkillInvocations).toEqual([
        ["/PID", expect.stringMatching(/^\d+$/u), "/T", "/F"],
      ]);
      expect(custodyDirectory).not.toBeNull();
      expect(existsSync(custodyDirectory!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves failed custody state when neither the lease helper nor pinned taskkill confirms termination", async () => {
    const harness = await makeRuntimeHarness({
      failCustodyLeaseBeforeReady: true,
      taskkillScenario: {
        stdoutError: true,
        neverClose: true,
        closeAfterKill: false,
      },
    });
    try {
      const result = await harness.execute();
      const custodyDirectory = harness.leaseInvocations[0]?.directory;

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(harness.taskkillInvocations).toEqual([
        ["/PID", expect.stringMatching(/^\d+$/u), "/T", "/F"],
      ]);
      expect(custodyDirectory).not.toBeNull();
      expect(existsSync(custodyDirectory!)).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("confirms a failed release helper is terminated before returning from execution-input cleanup", async () => {
    const harness = await makeRuntimeHarness({
      failExecutionLeaseOnRelease: true,
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(harness.taskkillInvocations).toEqual([
        ["/PID", expect.stringMatching(/^\d+$/u), "/T", "/F"],
      ]);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("does not hang when the lease release write callback never fires", async () => {
    const harness = await makeRuntimeHarness({
      failExecutionLeaseOnRelease: true,
      suppressExecutionLeaseReleaseCallback: true,
    });
    try {
      const execution = harness.execute();
      await harness.executionLeaseReleaseAttempted;
      let settlementTimer: NodeJS.Timeout | undefined;
      const outcome = await Promise.race([
        execution,
        new Promise<"HUNG">((resolvePromise) => {
          settlementTimer = setTimeout(
            () => resolvePromise("HUNG"),
            500,
          );
        }),
      ]).finally(() => {
        if (settlementTimer) clearTimeout(settlementTimer);
      });

      expect(outcome).not.toBe("HUNG");
      expect(outcome).toMatchObject({
        status: "FAILED",
      });
      expect(
        typeof outcome === "string" ? [] : outcome.safeErrorCodes,
      ).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
    } finally {
      await harness.cleanup();
    }
  });

  it("propagates an unconfirmed DPAPI helper termination and preserves disposable custody state", async () => {
    const harness = await makeRuntimeHarness({
      custodyStoreTerminationUnconfirmed: true,
    });
    try {
      const result = await harness.execute();
      const custodyDirectory = String(
        harness.custodyFactory.mock.calls[0]?.[0],
      );

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(result.evidence).toBeNull();
      expect(existsSync(custodyDirectory)).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it("cancels and confirms the SDK child before returning after an execution-input lease compromise", async () => {
    const harness = await makeRuntimeHarness({
      failExecutionLeaseDuringSdk: true,
      sdkScenario: {
        closeDelayMs: 250,
      },
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(harness.executionEvents).toContain("SDK:KILL");
      expect(harness.executionEvents).toContain("SDK:CLOSED");
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("waits for execution-lease termination confirmation before workspace cleanup when the operation wins the race", async () => {
    let confirmTaskkillClosed!: () => void;
    const taskkillClosed = new Promise<void>((resolvePromise) => {
      confirmTaskkillClosed = resolvePromise;
    });
    const harness = await makeRuntimeHarness({
      failExecutionLeaseDuringSdk: true,
      keepExecutionLeaseOpenAfterKill: true,
      taskkillScenario: {
        closeDelayMs: 50,
        afterClose: confirmTaskkillClosed,
      },
    });
    try {
      const result = await harness.execute();
      await taskkillClosed;

      const taskkillClosedIndex =
        harness.executionEvents.indexOf("TASKKILL:CLOSED");
      const workspaceReleaseIndex = harness.executionEvents.indexOf(
        "LEASE:WORKSPACE:RELEASE",
      );
      expect(result.status).toBe("FAILED");
      expect(taskkillClosedIndex).toBeGreaterThan(-1);
      expect(workspaceReleaseIndex).toBeGreaterThan(taskkillClosedIndex);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("aborts the SDK child as soon as an execution lease is compromised", async () => {
    const harness = await makeRuntimeHarness({
      failExecutionLeaseDuringSdk: true,
      keepExecutionLeaseOpenAfterKill: true,
      sdkScenario: {
        neverClose: true,
        closeAfterKill: true,
      },
      taskkillScenario: {
        closeDelayMs: 50,
      },
    });
    try {
      const result = await harness.execute();
      const sdkKillIndex = harness.executionEvents.indexOf("SDK:KILL");
      const taskkillClosedIndex =
        harness.executionEvents.indexOf("TASKKILL:CLOSED");

      expect(result.status).toBe("FAILED");
      expect(sdkKillIndex).toBeGreaterThan(-1);
      expect(taskkillClosedIndex).toBeGreaterThan(-1);
      expect(sdkKillIndex).toBeLessThan(taskkillClosedIndex);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("settles every concurrently compromised monitored lease before returning", async () => {
    let closedTaskkills = 0;
    let confirmAllTaskkillsClosed!: () => void;
    const allTaskkillsClosed = new Promise<void>((resolvePromise) => {
      confirmAllTaskkillsClosed = resolvePromise;
    });
    const recordTaskkillClosed = () => {
      closedTaskkills += 1;
      if (closedTaskkills === 2) confirmAllTaskkillsClosed();
    };
    const harness = await makeRuntimeHarness({
      failOuterLeasesDuringSdk: true,
      keepOuterLeasesOpenAfterKill: true,
      sdkScenario: {
        neverClose: true,
        closeAfterKill: true,
      },
      taskkillScenarios: [
        { closeDelayMs: 10, afterClose: recordTaskkillClosed },
        { closeDelayMs: 100, afterClose: recordTaskkillClosed },
      ],
    });
    try {
      const result = await harness.execute();
      const closedAtReturn = harness.executionEvents.filter(
        (event) => event === "TASKKILL:CLOSED",
      ).length;
      await allTaskkillsClosed;

      expect(result.status).toBe("FAILED");
      expect(closedAtReturn).toBe(2);
      expect(result.safeErrorCodes).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
    } finally {
      await harness.cleanup();
    }
  });

  it("settles a second lease compromised during aborted SDK shutdown before an unconfirmed return", async () => {
    let closedTaskkills = 0;
    let confirmAllTaskkillsClosed!: () => void;
    const allTaskkillsClosed = new Promise<void>((resolvePromise) => {
      confirmAllTaskkillsClosed = resolvePromise;
    });
    const recordTaskkillClosed = () => {
      closedTaskkills += 1;
      if (closedTaskkills === 2) confirmAllTaskkillsClosed();
    };
    let harness!: Awaited<ReturnType<typeof makeRuntimeHarness>>;
    harness = await makeRuntimeHarness({
      failJdkLeaseDuringSdk: true,
      keepOuterLeasesOpenAfterKill: true,
      sdkScenario: {
        neverClose: true,
        closeAfterKill: true,
        afterClose: () => {
          harness.leaseInvocations
            .find((invocation) => invocation.label === "WORKSPACE")
            ?.failHelper?.();
        },
      },
      taskkillScenarios: [
        {
          stdoutError: true,
          neverClose: true,
          closeAfterKill: true,
          afterClose: recordTaskkillClosed,
        },
        { closeDelayMs: 100, afterClose: recordTaskkillClosed },
      ],
    });
    try {
      const result = await harness.execute();
      const closedAtReturn = harness.executionEvents.filter(
        (event) => event === "TASKKILL:CLOSED",
      ).length;
      await allTaskkillsClosed;

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(closedAtReturn).toBe(2);
    } finally {
      await harness.cleanup();
    }
  });

  it("secure-deletes only fingerprinted files through 40-byte PowerShell metadata without retaining artifact bodies", async () => {
    const harness = await makeRuntimeHarness();
    try {
      const result = await harness.execute();

      expect(result.status).toBe("PASSED");
      expect(harness.secureDeleteOperations.length).toBeGreaterThan(0);
      expect(
        harness.secureDeleteOperations.map((operation) =>
          basename(operation.target),
        ),
      ).toEqual(
        expect.arrayContaining([
          "generated-private-key.pem",
          "generated.csr",
          "csr-config.properties",
          "sdk-config.json",
        ]),
      );
      for (const operation of harness.secureDeleteOperations) {
        expect(operation).toMatchObject({
          metadataBytes: 40,
          metadataVerified: true,
          deleted: true,
          bodyRetained: false,
        });
      }
      const recordedOperations = JSON.stringify(
        harness.secureDeleteOperations,
      );
      expect(recordedOperations).not.toContain(
        "-----BEGIN EC PRIVATE KEY-----",
      );
      expect(recordedOperations).not.toContain(
        SYNTHETIC_SDK_CONFIG.trim(),
      );
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves fingerprinted files and reports cleanup false when PowerShell does not remove the verified target", async () => {
    const harness = await makeRuntimeHarness({
      secureDeletePreservesTarget: true,
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
      );
      expect(result.evidence?.cleanupComplete).toBe(false);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(true);
      expect(harness.secureDeleteOperations.length).toBeGreaterThan(0);
      expect(
        harness.secureDeleteOperations.every(
          (operation) =>
            operation.metadataBytes === 40 &&
            operation.metadataVerified &&
            !operation.deleted &&
            !operation.bodyRetained,
        ),
      ).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });

  it.each(["JAR", "LAUNCHER", "SDK_CONFIG"] as const)(
    "rejects a staged %s changed during the network-guard self-test before SDK execution",
    async (mutateStagedInputDuringGuard) => {
      const harness = await makeRuntimeHarness({
        mutateStagedInputDuringGuard,
      });
      try {
        const result = await harness.execute();
        expect(result.status).toBe("FAILED");
        expect(result.safeErrorCodes).toContain(
          "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
        );
        expect(result.safeErrorCodes).toContain(
          "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
        );
        expect(harness.guardSelfTests).toHaveLength(1);
        expect(harness.sdkRequests).toHaveLength(0);
        expect(result.evidence).toBeNull();
        const workspace = harness.getGuardWorkspace()!;
        const mutatedPath =
          mutateStagedInputDuringGuard === "JAR"
            ? join(workspace, basename(harness.sdkJar))
            : mutateStagedInputDuringGuard === "LAUNCHER"
              ? String(harness.guardSelfTests[0]?.args[1])
              : join(workspace, "sdk-config.json");
        const expectedValue =
          mutateStagedInputDuringGuard === "JAR"
            ? "mutated-sdk"
            : mutateStagedInputDuringGuard === "LAUNCHER"
              ? "mutated-launcher"
              : "mutated-sdk-config";
        expect(existsSync(workspace)).toBe(true);
        expect(await readFile(mutatedPath, "utf8")).toBe(expectedValue);
        expect(harness.secureDeleteOperations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              target: mutatedPath,
              metadataBytes: 40,
              metadataVerified: false,
              deleted: false,
              bodyRetained: false,
            }),
          ]),
        );
      } finally {
        await harness.cleanup();
      }
    },
  );

  it("rejects a multiply linked expected key without truncating its external link", async () => {
    const harness = await makeRuntimeHarness({
      hardlinkKey: true,
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
      );
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
      );
      expect(result.evidence).toBeNull();
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(true);
      const externalValue = await readFile(harness.externalKeyLink);
      try {
        expect(externalValue.equals(harness.privateKeyPem)).toBe(true);
      } finally {
        externalValue.fill(0);
      }
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves an unexpected hardlink with cleanup false without truncating its external source", async () => {
    const harness = await makeRuntimeHarness({
      extraArtifact: "HARDLINK",
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
      );
      expect(result.evidence?.cleanupComplete).toBe(false);
      expect(
        existsSync(
          join(harness.getSdkWorkspace()!, "unexpected.tmp"),
        ),
      ).toBe(true);
      expect(
        await readFile(harness.externalUnexpectedSource, "utf8"),
      ).toBe("preserve-me");
    } finally {
      await harness.cleanup();
    }
  });

  it("does not recurse into an unexpected non-empty directory during cleanup", async () => {
    const harness = await makeRuntimeHarness({
      extraArtifact: "NESTED_DIRECTORY",
    });
    try {
      const result = await harness.execute();
      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_ARTIFACT_READ_FAILED",
      );
      expect(result.evidence?.cleanupComplete).toBe(false);
      expect(existsSync(harness.getSdkWorkspace()!)).toBe(true);
      expect(
        await readFile(
          join(
            harness.getSdkWorkspace()!,
            "unexpected",
            "nested.txt",
          ),
          "utf8",
        ),
      ).toBe("preserve-untrusted-entry");
    } finally {
      await harness.cleanup();
    }
  });

  it("uses pinned taskkill escalation to confirm a stuck guard child before cleanup", async () => {
    const harness = await makeRuntimeHarness({
      guardScenario: {
        emitError: true,
        neverClose: true,
        closeAfterKill: false,
      },
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_FAILED",
      );
      expect(result.safeErrorCodes).not.toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(harness.taskkillInvocations).toEqual([
        ["/PID", expect.stringMatching(/^\d+$/u), "/T", "/F"],
      ]);
      expect(harness.sdkRequests).toHaveLength(0);
      expect(existsSync(harness.getGuardWorkspace()!)).toBe(false);
    } finally {
      await harness.cleanup();
    }
  });

  it("preserves the workspace when neither a stuck child nor pinned taskkill confirms termination", async () => {
    const harness = await makeRuntimeHarness({
      guardScenario: {
        emitError: true,
        neverClose: true,
        closeAfterKill: false,
      },
      taskkillScenario: {
        stdoutError: true,
        neverClose: true,
        closeAfterKill: false,
      },
    });
    try {
      const result = await harness.execute();

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toContain(
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      );
      expect(result.evidence).toBeNull();
      expect(harness.taskkillInvocations).toEqual([
        ["/PID", expect.stringMatching(/^\d+$/u), "/T", "/F"],
      ]);
      expect(harness.sdkRequests).toHaveLength(0);
      expect(existsSync(harness.getGuardWorkspace()!)).toBe(true);
    } finally {
      await harness.cleanup();
    }
  });
});

describe("bounded SDK child process", () => {
  it("terminates and confirms a running child when its caller aborts", async () => {
    const abortController = new AbortController();
    const result = await runSandboxSdkCsrBoundedChildProcess(
      join(tmpdir(), "synthetic.exe"),
      [],
      {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 1_000,
        maxOutputBytes: 64,
        terminationGraceMs: 50,
        abortSignal: abortController.signal,
        spawnProcess: syntheticSpawn(() => ({
          neverClose: true,
          closeAfterKill: true,
          beforeClose: () => abortController.abort(),
        })),
      },
    );

    expect(result).toMatchObject({
      timedOut: false,
      exitCode: null,
      terminationConfirmed: true,
      rawOutputCleared: true,
    });
  });

  it.each(["stdoutError", "stderrError"] as const)(
    "fails closed and confirms termination after a %s",
    async (streamError) => {
      const result = await runSandboxSdkCsrBoundedChildProcess(
        join(tmpdir(), "synthetic.exe"),
        [],
        {
          cwd: tmpdir(),
          environment: {},
          timeoutMs: 1_000,
          maxOutputBytes: 64,
          terminationGraceMs: 50,
          spawnProcess: syntheticSpawn(() => ({
            [streamError]: true,
          })),
        },
      );
      expect(result).toMatchObject({
        exitCode: null,
        terminationConfirmed: true,
        rawOutputCleared: true,
      });
    },
  );

  it("classifies timeout, output limit, nonzero exit, and unconfirmed termination without exposing output", async () => {
    const timedOut = await runSandboxSdkCsrBoundedChildProcess(
      join(tmpdir(), "synthetic.exe"),
      [],
      {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 10,
        maxOutputBytes: 64,
        terminationGraceMs: 50,
        spawnProcess: syntheticSpawn(() => ({
          neverClose: true,
          closeAfterKill: true,
        })),
      },
    );
    expect(timedOut).toMatchObject({
      timedOut: true,
      outputLimitExceeded: false,
    });

    const outputLimited = await runSandboxSdkCsrBoundedChildProcess(
      join(tmpdir(), "synthetic.exe"),
      [],
      {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 1_000,
        maxOutputBytes: 64,
        terminationGraceMs: 50,
        spawnProcess: syntheticSpawn(() => ({
          stdout: Buffer.alloc(65, 0x41),
          neverClose: true,
          closeAfterKill: true,
        })),
      },
    );
    expect(outputLimited).toMatchObject({
      timedOut: false,
      outputLimitExceeded: true,
      stdoutBytes: 65,
    });

    const nonzero = await runSandboxSdkCsrBoundedChildProcess(
      join(tmpdir(), "synthetic.exe"),
      [],
      {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 1_000,
        maxOutputBytes: 64,
        terminationGraceMs: 50,
        spawnProcess: syntheticSpawn(() => ({ exitCode: 9 })),
      },
    );
    expect(nonzero.exitCode).toBe(9);

    const errorThenClosed =
      await runSandboxSdkCsrBoundedChildProcess(
        join(tmpdir(), "synthetic.exe"),
        [],
        {
          cwd: tmpdir(),
          environment: {},
          timeoutMs: 1_000,
          maxOutputBytes: 64,
          terminationGraceMs: 50,
          spawnProcess: syntheticSpawn(() => ({
            emitError: true,
            neverClose: true,
            closeAfterKill: true,
          })),
        },
      );
    expect(errorThenClosed).toMatchObject({
      exitCode: null,
      terminationConfirmed: true,
    });

    const unconfirmed =
      await runSandboxSdkCsrBoundedChildProcess(
        join(tmpdir(), "synthetic.exe"),
        [],
        {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 10,
        maxOutputBytes: 64,
        terminationGraceMs: 10,
        spawnProcess: syntheticSpawn(() => ({
          neverClose: true,
          closeAfterKill: false,
        })),
        },
      );
    expect(unconfirmed).toMatchObject({
      timedOut: true,
      terminationConfirmed: false,
    });
  });

  it("never retains more than the declared 64KiB SDK output boundary", async () => {
    const result = await runSandboxSdkCsrBoundedChildProcess(
      join(tmpdir(), "synthetic.exe"),
      [],
      {
        cwd: tmpdir(),
        environment: {},
        timeoutMs: 1_000,
        maxOutputBytes: OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES,
        terminationGraceMs: 50,
        spawnProcess: syntheticSpawn(() => ({
          stderr: Buffer.alloc(
            OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES + 1,
            0x42,
          ),
          neverClose: true,
        })),
      },
    );
    expect(result.outputLimitExceeded).toBe(true);
    expect(
      (result as unknown as Record<string, unknown>).stderr,
    ).toBeUndefined();
    expect(
      (result as unknown as Record<string, unknown>).stdout,
    ).toBeUndefined();
  });
});
