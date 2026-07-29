import {
  createHash,
  createPrivateKey,
  createPublicKey,
  timingSafeEqual,
} from "node:crypto";
import { spawn } from "node:child_process";
import {
  constants as fsConstants,
  lstat,
  mkdtemp,
  open,
  readdir,
  realpath,
  rmdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import type { Readable } from "node:stream";
import type { Writable } from "node:stream";
import type { EventEmitter } from "node:events";
import {
  OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE,
  OFFICIAL_SYNTHETIC_CSR_CONFIGURATION,
  OFFICIAL_SYNTHETIC_CSR_PROFILE,
  OFFICIAL_ZATCA_SDK_CSR_MAX_OUTPUT_BYTES,
  OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS,
  OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE,
  OFFICIAL_ZATCA_SDK_CSR_TIMEOUT_MS,
  OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
  OFFICIAL_ZATCA_SDK_JAR_SHA256,
  OFFICIAL_ZATCA_SDK_JAVA_VERSION,
  OFFICIAL_ZATCA_SDK_VERSION,
  buildSandboxSdkCsrProcessRequest,
  runSandboxSdkCsrOracle,
  type SandboxSdkCsrOracleDependencies,
  type SandboxSdkCsrOracleInput,
  type SandboxSdkCsrOracleResult,
  type SandboxSdkCsrProcessRequest,
  type SandboxSdkCsrProcessResult,
} from "./sandbox-sdk-csr-oracle";
import type { SandboxSdkCsrOracleCliOptions } from "./sandbox-sdk-csr-oracle-cli";
import {
  inspectZatcaSdkSimulationCsr,
  type ZatcaSdkCsrInspectionResult,
} from "./zatca-sdk-csr-inspector";
import {
  ComplianceCsidCustodyProcessTerminationUnconfirmedError,
  SandboxLocalDpapiComplianceCsidCustodyProvider,
} from "./compliance-csid-secret-custody.provider";

const SDK_JAR_FILE_NAME =
  "zatca-einvoicing-sdk-238-R3.4.8.jar";
const SDK_CONFIG_FILE_NAME = "config.json";
const STAGED_SDK_CONFIG_FILE_NAME = "sdk-config.json";
const MAX_PRIVATE_KEY_BYTES = 16 * 1024;
const MAX_CSR_PEM_BYTES = 64 * 1024;
const MAX_CONFIG_BYTES = 8 * 1024;
const MAX_LAUNCHER_BYTES = 16 * 1024;
const MAX_WORKSPACE_ENTRIES = 32;
const CHILD_TERMINATION_GRACE_MS = 2_000;
const JAVA_VERSION_MAX_OUTPUT_BYTES = 8 * 1024;
const CURRENT_USER_SID_MAX_OUTPUT_BYTES = 4 * 1024;
const WINDOWS_HELPER_MAX_OUTPUT_BYTES = 4 * 1024;
const WINDOWS_HELPER_TIMEOUT_MS = 15_000;
const PINNED_WINDOWS_SYSTEM_ROOT = "C:\\Windows";
const PINNED_JDK_COMPONENTS = Object.freeze([
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
const CUSTODY_ORGANIZATION_ID =
  "06f00000-0000-4000-8000-000000000006";
const CUSTODY_EGS_UNIT_ID =
  "06f00000-0000-4000-8000-000000000008";

class UnconfirmedProcessTerminationError extends Error {
  constructor() {
    super("ZATCA SDK CSR process termination was not confirmed.");
    this.name = "UnconfirmedProcessTerminationError";
  }
}

class SandboxSdkCsrLeaseCompromisedError extends Error {
  constructor() {
    super("ZATCA SDK CSR runtime lease was compromised.");
    this.name = "SandboxSdkCsrLeaseCompromisedError";
  }
}

const WINDOWS_PATH_LEASE_POWERSHELL = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$typeDefinition=@'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class LedgerBytePathLeaseNative {
  private const uint GENERIC_READ = 0x80000000;
  private const uint FILE_LIST_DIRECTORY = 0x0001;
  private const uint FILE_SHARE_READ = 0x00000001;
  private const uint FILE_SHARE_WRITE = 0x00000002;
  private const uint OPEN_EXISTING = 3;
  private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
  private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
  private const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;

  [StructLayout(LayoutKind.Sequential)]
  private struct BY_HANDLE_FILE_INFORMATION {
    public uint FileAttributes;
    public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
    public uint VolumeSerialNumber;
    public uint FileSizeHigh;
    public uint FileSizeLow;
    public uint NumberOfLinks;
    public uint FileIndexHigh;
    public uint FileIndexLow;
  }

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern SafeFileHandle CreateFile(
    string fileName,
    uint desiredAccess,
    uint shareMode,
    IntPtr securityAttributes,
    uint creationDisposition,
    uint flagsAndAttributes,
    IntPtr templateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool GetFileInformationByHandle(
    SafeFileHandle file,
    out BY_HANDLE_FILE_INFORMATION information);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern uint GetFinalPathNameByHandle(
    SafeFileHandle file,
    StringBuilder path,
    uint pathLength,
    uint flags);

  public static SafeFileHandle OpenDirectory(string path) {
    return OpenVerified(
      path,
      FILE_LIST_DIRECTORY,
      FILE_SHARE_READ | FILE_SHARE_WRITE,
      FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
      false);
  }

  public static SafeFileHandle OpenReadOnlyFile(string path) {
    return OpenVerified(
      path,
      GENERIC_READ,
      FILE_SHARE_READ,
      FILE_FLAG_OPEN_REPARSE_POINT,
      true);
  }

  private static SafeFileHandle OpenVerified(
    string path,
    uint access,
    uint sharing,
    uint flags,
    bool requireSingleLink) {
    SafeFileHandle handle = CreateFile(
      path,
      access,
      sharing,
      IntPtr.Zero,
      OPEN_EXISTING,
      flags,
      IntPtr.Zero);
    if (handle.IsInvalid) {
      int error = Marshal.GetLastWin32Error();
      handle.Dispose();
      throw new Win32Exception(error);
    }
    try {
      BY_HANDLE_FILE_INFORMATION information;
      if (!GetFileInformationByHandle(handle, out information)) {
        throw new Win32Exception(Marshal.GetLastWin32Error());
      }
      if ((information.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 ||
          (requireSingleLink && information.NumberOfLinks != 1)) {
        throw new InvalidOperationException("lease target rejected");
      }
      StringBuilder finalPath = new StringBuilder(32768);
      uint length = GetFinalPathNameByHandle(
        handle,
        finalPath,
        (uint)finalPath.Capacity,
        0);
      if (length == 0 || length >= finalPath.Capacity) {
        throw new Win32Exception(Marshal.GetLastWin32Error());
      }
      string actual = finalPath.ToString();
      if (actual.StartsWith(@"\\?\", StringComparison.Ordinal)) {
        actual = actual.Substring(4);
      }
      string expected = Path.GetFullPath(path);
      if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase)) {
        throw new InvalidOperationException("lease identity rejected");
      }
      return handle;
    } catch {
      handle.Dispose();
      throw;
    }
  }
}
'@
Add-Type -TypeDefinition $typeDefinition -Language CSharp
$handles=[System.Collections.Generic.List[Microsoft.Win32.SafeHandles.SafeFileHandle]]::new()
try {
  if ($env:LB_PATH_LEASE_DIRECTORY) {
    $handles.Add([LedgerBytePathLeaseNative]::OpenDirectory($env:LB_PATH_LEASE_DIRECTORY))
  }
  $count=[int]$env:LB_PATH_LEASE_FILE_COUNT
  if ($count -lt 0 -or $count -gt 16) { throw 'lease count rejected' }
  for ($index=0; $index -lt $count; $index++) {
    $path=[Environment]::GetEnvironmentVariable("LB_PATH_LEASE_FILE_$index")
    if ([String]::IsNullOrWhiteSpace($path)) { throw 'lease path rejected' }
    $handles.Add([LedgerBytePathLeaseNative]::OpenReadOnlyFile($path))
  }
  [Console]::Out.Write("READY" + [Environment]::NewLine)
  [Console]::Out.Flush()
  if ([Console]::In.Read() -ne 82) { throw 'lease release rejected' }
  [Console]::Out.Write("CLOSED" + [Environment]::NewLine)
  [Console]::Out.Flush()
} finally {
  for ($index=$handles.Count-1; $index -ge 0; $index--) {
    $handles[$index].Dispose()
  }
  $handles.Clear()
}
`.trim();

const WINDOWS_SECURE_DELETE_POWERSHELL = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$typeDefinition=@'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class LedgerByteSecureDeleteNative {
  private const uint GENERIC_READ = 0x80000000;
  private const uint GENERIC_WRITE = 0x40000000;
  private const uint DELETE = 0x00010000;
  private const uint OPEN_EXISTING = 3;
  private const uint FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
  private const uint FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
  private const uint FILE_FLAG_WRITE_THROUGH = 0x80000000;
  private const int FILE_DISPOSITION_INFO_CLASS = 4;

  [StructLayout(LayoutKind.Sequential)]
  private struct BY_HANDLE_FILE_INFORMATION {
    public uint FileAttributes;
    public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
    public uint VolumeSerialNumber;
    public uint FileSizeHigh;
    public uint FileSizeLow;
    public uint NumberOfLinks;
    public uint FileIndexHigh;
    public uint FileIndexLow;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct FILE_DISPOSITION_INFO {
    [MarshalAs(UnmanagedType.Bool)]
    public bool DeleteFile;
  }

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern SafeFileHandle CreateFile(
    string fileName,
    uint desiredAccess,
    uint shareMode,
    IntPtr securityAttributes,
    uint creationDisposition,
    uint flagsAndAttributes,
    IntPtr templateFile);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool GetFileInformationByHandle(
    SafeFileHandle file,
    out BY_HANDLE_FILE_INFORMATION information);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool SetFileInformationByHandle(
    SafeFileHandle file,
    int informationClass,
    ref FILE_DISPOSITION_INFO information,
    uint informationSize);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern uint GetFinalPathNameByHandle(
    SafeFileHandle file,
    StringBuilder path,
    uint pathLength,
    uint flags);

  public static void DeleteExpected(
    string path,
    long expectedLength,
    byte[] expectedDigest) {
    SafeFileHandle handle = CreateFile(
      path,
      GENERIC_READ | GENERIC_WRITE | DELETE,
      0,
      IntPtr.Zero,
      OPEN_EXISTING,
      FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_WRITE_THROUGH,
      IntPtr.Zero);
    if (handle.IsInvalid) {
      int error = Marshal.GetLastWin32Error();
      handle.Dispose();
      if (error == 2 || error == 3) { return; }
      throw new Win32Exception(error);
    }
    byte[] actualDigest = null;
    byte[] zeroes = new byte[65536];
    try {
      BY_HANDLE_FILE_INFORMATION information;
      if (!GetFileInformationByHandle(handle, out information)) {
        throw new Win32Exception(Marshal.GetLastWin32Error());
      }
      long actualLength =
        ((long)information.FileSizeHigh << 32) | information.FileSizeLow;
      if ((information.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0 ||
          information.NumberOfLinks != 1 ||
          actualLength != expectedLength) {
        throw new InvalidOperationException("delete target rejected");
      }
      StringBuilder finalPath = new StringBuilder(32768);
      uint finalPathLength = GetFinalPathNameByHandle(
        handle,
        finalPath,
        (uint)finalPath.Capacity,
        0);
      if (finalPathLength == 0 || finalPathLength >= finalPath.Capacity) {
        throw new Win32Exception(Marshal.GetLastWin32Error());
      }
      string actualPath = finalPath.ToString();
      if (actualPath.StartsWith(@"\\?\", StringComparison.Ordinal)) {
        actualPath = actualPath.Substring(4);
      }
      if (!String.Equals(
          actualPath,
          Path.GetFullPath(path),
          StringComparison.OrdinalIgnoreCase)) {
        throw new InvalidOperationException("delete identity rejected");
      }
      using (FileStream stream = new FileStream(
        handle,
        FileAccess.ReadWrite,
        65536,
        false)) {
        using (SHA256 sha = SHA256.Create()) {
          actualDigest = sha.ComputeHash(stream);
        }
        if (!FixedTimeEquals(actualDigest, expectedDigest)) {
          throw new InvalidOperationException("delete digest rejected");
        }
        stream.Position = 0;
        long remaining = actualLength;
        while (remaining > 0) {
          int count = (int)Math.Min(remaining, zeroes.Length);
          stream.Write(zeroes, 0, count);
          remaining -= count;
        }
        stream.Flush(true);
        stream.SetLength(0);
        stream.Flush(true);
        FILE_DISPOSITION_INFO disposition =
          new FILE_DISPOSITION_INFO { DeleteFile = true };
        if (!SetFileInformationByHandle(
          stream.SafeFileHandle,
          FILE_DISPOSITION_INFO_CLASS,
          ref disposition,
          (uint)Marshal.SizeOf(typeof(FILE_DISPOSITION_INFO)))) {
          throw new Win32Exception(Marshal.GetLastWin32Error());
        }
      }
    } finally {
      if (!handle.IsClosed) { handle.Dispose(); }
      if (actualDigest != null) { Array.Clear(actualDigest, 0, actualDigest.Length); }
      Array.Clear(zeroes, 0, zeroes.Length);
      Array.Clear(expectedDigest, 0, expectedDigest.Length);
    }
  }

  private static bool FixedTimeEquals(byte[] left, byte[] right) {
    if (left == null || right == null || left.Length != right.Length) {
      return false;
    }
    int difference = 0;
    for (int index = 0; index < left.Length; index++) {
      difference |= left[index] ^ right[index];
    }
    return difference == 0;
  }
}
'@
Add-Type -TypeDefinition $typeDefinition -Language CSharp
$inputStream=[Console]::OpenStandardInput()
$metadata=New-Object byte[] 40
try {
  $offset=0
  while ($offset -lt $metadata.Length) {
    $read=$inputStream.Read($metadata,$offset,$metadata.Length-$offset)
    if ($read -le 0) { throw 'delete metadata rejected' }
    $offset += $read
  }
  $length=[BitConverter]::ToInt64($metadata,0)
  $digest=New-Object byte[] 32
  [Array]::Copy($metadata,8,$digest,0,32)
  try {
    [LedgerByteSecureDeleteNative]::DeleteExpected(
      $env:LB_SECURE_DELETE_PATH,
      $length,
      $digest)
  } finally {
    [Array]::Clear($digest,0,$digest.Length)
  }
} finally {
  [Array]::Clear($metadata,0,$metadata.Length)
}
`.trim();

interface ChildProcessLike extends EventEmitter {
  pid?: number;
  stdin: Writable | null;
  stdout: Readable | null;
  stderr: Readable | null;
  kill(signal?: NodeJS.Signals): boolean;
}

export type SandboxSdkCsrRuntimeSpawn = (
  command: string,
  arguments_: readonly string[],
  options: Readonly<Record<string, unknown>>,
) => ChildProcessLike;

interface SandboxSdkCsrRuntimeDependencies {
  environment?: Readonly<Record<string, string | undefined>>;
  currentWorkingDirectory?: string;
  temporaryRoot?: string;
  runtimePathInspector?: (
    environment: Readonly<Record<string, string | undefined>>,
    spawnProcess: SandboxSdkCsrRuntimeSpawn,
  ) => Promise<ResolvedRuntimePathInspection>;
  spawnProcess?: SandboxSdkCsrRuntimeSpawn;
  hashFile?: (path: string) => Promise<string>;
  fingerprintFile?: (
    path: string,
    minimumBytes: number,
    maximumBytes: number,
  ) => Promise<FileCleanupExpectation>;
  inspectCsr?: (
    input: Parameters<typeof inspectZatcaSdkSimulationCsr>[0],
  ) => ZatcaSdkCsrInspectionResult;
  custodyProviderFactory?: (
    storageDirectory: string,
  ) => SandboxLocalDpapiComplianceCsidCustodyProvider;
  artifactReadCheckpoint?: (path: string) => Promise<void>;
}

interface ResolvedRuntimePaths {
  javaHome: string;
  javaBin: string;
  sdkRoot: string;
  sdkJarPath: string;
  sdkConfigPath: string;
  systemRoot: string;
  windowsDirectory: string;
  comSpec: string;
  icacls: string;
  powershell: string;
  whoami: string;
  taskkill: string;
  jdkComponentPaths: readonly string[];
  pathExt: string;
  userSid: string;
}

type ResolvedRuntimePathInspection = Omit<
  ResolvedRuntimePaths,
  "userSid"
> & {
  userSid?: string;
};

interface FileCleanupExpectation {
  byteLength: number;
  sha256: string;
}

interface WindowsPathLeaseCompromise {
  terminationResolution: Promise<{
    terminationConfirmed: boolean;
  }>;
}

interface WindowsPathLease {
  awaitActive(): Promise<void>;
  whenCompromised(): Promise<WindowsPathLeaseCompromise>;
  release(): Promise<void>;
}

interface CapturedProcessResult {
  exitCode: number | null;
  signal: string | null;
  combined: Buffer;
}

export async function executeSandboxSdkCsrOracleRuntime(
  options: SandboxSdkCsrOracleCliOptions,
  injected: SandboxSdkCsrRuntimeDependencies = {},
): Promise<SandboxSdkCsrOracleResult> {
  const environment = injected.environment ?? process.env;
  const cliFlags = cliOptionsToFlags(options);
  const gate = environment[OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE];

  if (gate === undefined || gate === "" || gate !== "true") {
    return runSandboxSdkCsrOracle(
      placeholderInput(environment, cliFlags),
      throwingDependencies(),
    );
  }

  const spawnProcess = injected.spawnProcess ?? defaultSpawn;
  let paths: ResolvedRuntimePaths;
  try {
    if (environment.APP_ENV?.trim().toUpperCase() !== "LOCAL") {
      throw new Error("ZATCA SDK CSR runtime environment rejected.");
    }
    const resolvedPaths = await (
      injected.runtimePathInspector ?? resolveRuntimePaths
    )(
      environment,
      spawnProcess,
    );
    paths = {
      ...resolvedPaths,
      userSid:
        resolvedPaths.userSid ??
        (await inspectCurrentUserSid(resolvedPaths, spawnProcess)),
    };
  } catch (error) {
    return safeRuntimeFailure(
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      error instanceof UnconfirmedProcessTerminationError,
    );
  }

  const hashFile = injected.hashFile ?? sha256File;
  const fingerprintFile =
    injected.fingerprintFile ?? fingerprintStableRegularFile;
  const inspectCsr =
    injected.inspectCsr ?? inspectZatcaSdkSimulationCsr;
  let currentWorkingDirectory: string;
  let temporaryRoot: string;
  try {
    currentWorkingDirectory = resolveSafeLocalAbsolutePath(
      injected.currentWorkingDirectory ?? process.cwd(),
    );
    temporaryRoot = resolveSafeLocalAbsolutePath(
      injected.temporaryRoot ?? tmpdir(),
    );
    await assertCanonicalDirectory(temporaryRoot);
  } catch {
    return safeRuntimeFailure(
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
    );
  }

  if (
    !isAbsolute(temporaryRoot) ||
    isWithin(currentWorkingDirectory, temporaryRoot) ||
    /\s/u.test(temporaryRoot)
  ) {
    return safeRuntimeFailure(
      "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
    );
  }

  let workspacePath: string | null = null;
  let custodyStorageDirectory: string | null = null;
  let custodyProvider:
    | SandboxLocalDpapiComplianceCsidCustodyProvider
    | null = null;
  let processTerminationConfirmed = true;
  let workspaceDirectoryLease: WindowsPathLease | null = null;
  let custodyDirectoryLease: WindowsPathLease | null = null;
  let jdkRuntimeLease: WindowsPathLease | null = null;
  const cleanupExpectations = new Map<
    string,
    FileCleanupExpectation
  >();

  const ensureCustodyProvider = async () => {
    if (custodyProvider) return custodyProvider;
    custodyStorageDirectory = await mkdtemp(
      join(temporaryRoot, "lbzcsr-custody-"),
    );
    await restrictDirectoryAcl(
      custodyStorageDirectory,
      paths,
      spawnProcess,
    );
    custodyDirectoryLease = await acquireWindowsPathLease(
      paths,
      spawnProcess,
      {
        directory: custodyStorageDirectory,
        files: [],
      },
    );
    await custodyDirectoryLease.awaitActive();
    custodyProvider = injected.custodyProviderFactory
      ? injected.custodyProviderFactory(custodyStorageDirectory)
      : new SandboxLocalDpapiComplianceCsidCustodyProvider({
          environment: "LOCAL_TEST",
          storageDirectory: custodyStorageDirectory,
          disposableStorage: true,
        });
    return custodyProvider;
  };
  const runCustodyOperation = async <T>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof
        ComplianceCsidCustodyProcessTerminationUnconfirmedError
      ) {
        processTerminationConfirmed = false;
      }
      throw error;
    }
  };
  const assertCustodyProcessTerminationConfirmed = () => {
    if (!processTerminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
  };

  try {
    const provider = await ensureCustodyProvider();
    await runCustodyOperation(() =>
      provider.assertDisposableStoreEmptyForOperation(),
    );
  } catch (error) {
    if (
      error instanceof UnconfirmedProcessTerminationError ||
      error instanceof
        ComplianceCsidCustodyProcessTerminationUnconfirmedError
    ) {
      processTerminationConfirmed = false;
    }
    if (custodyStorageDirectory && processTerminationConfirmed) {
      try {
        const lease =
          custodyDirectoryLease as WindowsPathLease | null;
        await lease?.release();
        custodyDirectoryLease = null;
        await removeOwnedDirectoryIfEmpty(custodyStorageDirectory);
      } catch {
        // The safe preflight failure remains authoritative.
      }
    }
    return safeRuntimeFailure(
      "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED",
      !processTerminationConfirmed,
    );
  }

  const dependencies: SandboxSdkCsrOracleDependencies = {
    filesystem: {
      createWorkspace: async () => {
        workspacePath = await mkdtemp(
          join(temporaryRoot, "lbzcsr-sdk-"),
        );
        try {
          await restrictDirectoryAcl(
            workspacePath,
            paths,
            spawnProcess,
          );
          workspaceDirectoryLease = await acquireWindowsPathLease(
            paths,
            spawnProcess,
            {
              directory: workspacePath,
              files: [],
            },
          );
          await workspaceDirectoryLease.awaitActive();
        } catch (error) {
          if (error instanceof UnconfirmedProcessTerminationError) {
            processTerminationConfirmed = false;
          }
          throw error;
        }
        return workspacePath;
      },
      stagePinnedJar: async (sourcePath, destinationPath) => {
        assertExactPath(sourcePath, paths.sdkJarPath);
        assertOwnedWorkspaceChild(
          workspacePath,
          destinationPath,
          SDK_JAR_FILE_NAME,
        );
        const source = await readBoundedStableRegularFile(
          sourcePath,
          1,
          32 * 1024 * 1024,
        );
        try {
          const handle = await open(destinationPath, "wx", 0o600);
          try {
            await handle.writeFile(source);
            await handle.sync();
          } finally {
            await handle.close();
          }
        } finally {
          source.fill(0);
        }
        await assertCanonicalRegularFile(
          destinationPath,
          1,
          32 * 1024 * 1024,
        );
        cleanupExpectations.set(
          resolve(destinationPath).toLowerCase(),
          await fingerprintFile(
            destinationPath,
            1,
            32 * 1024 * 1024,
          ),
        );
      },
      stagePinnedConfig: async (sourcePath, destinationPath) => {
        assertExactPath(sourcePath, paths.sdkConfigPath);
        assertOwnedWorkspaceChild(
          workspacePath,
          destinationPath,
          STAGED_SDK_CONFIG_FILE_NAME,
        );
        const sourceExpectation = await fingerprintFile(
          sourcePath,
          1,
          1024 * 1024,
        );
        if (
          sourceExpectation.sha256.toUpperCase() !==
          OFFICIAL_ZATCA_SDK_CONFIG_SHA256
        ) {
          throw new Error(
            "ZATCA SDK CSR runtime configuration rejected.",
          );
        }
        const source = await readBoundedStableRegularFile(
          sourcePath,
          1,
          1024 * 1024,
        );
        try {
          const handle = await open(destinationPath, "wx", 0o600);
          try {
            await handle.writeFile(source);
            await handle.sync();
          } finally {
            await handle.close();
          }
        } finally {
          source.fill(0);
        }
        const expectation = await fingerprintFile(
          destinationPath,
          1,
          1024 * 1024,
        );
        if (
          expectation.sha256.toUpperCase() !==
          OFFICIAL_ZATCA_SDK_CONFIG_SHA256
        ) {
          throw new Error(
            "ZATCA SDK CSR runtime configuration rejected.",
          );
        }
        cleanupExpectations.set(
          resolve(destinationPath).toLowerCase(),
          expectation,
        );
      },
      writePrivateFile: async (path, value, mode) => {
        const name = basename(path);
        const maximum =
          name === "csr-config.properties"
            ? MAX_CONFIG_BYTES
            : name === "LedgerByteNoNetworkSdkLauncher.java"
              ? MAX_LAUNCHER_BYTES
              : 0;
        assertOwnedWorkspaceChild(workspacePath, path, name);
        if (
          maximum === 0 ||
          !Buffer.isBuffer(value) ||
          value.length === 0 ||
          value.length > maximum
        ) {
          throw new Error("ZATCA SDK CSR runtime file rejected.");
        }
        const handle = await open(path, "wx", mode);
        try {
          await handle.writeFile(value);
          await handle.sync();
        } finally {
          await handle.close();
        }
        cleanupExpectations.set(
          resolve(path).toLowerCase(),
          cleanupExpectationFromBuffer(value),
        );
      },
      readPrivateFile: async (path) => {
        const name = basename(path);
        const maximum =
          name === "generated-private-key.pem"
            ? MAX_PRIVATE_KEY_BYTES
            : name === "generated.csr"
              ? MAX_CSR_PEM_BYTES
              : 0;
        assertOwnedWorkspaceChild(workspacePath, path, name);
        if (maximum === 0) {
          throw new Error("ZATCA SDK CSR runtime artifact rejected.");
        }
        await assertExpectedWorkspaceEntries(workspacePath);
        const value = await readBoundedStableRegularFile(
          path,
          1,
          maximum,
          injected.artifactReadCheckpoint,
        );
        cleanupExpectations.set(
          resolve(path).toLowerCase(),
          cleanupExpectationFromBuffer(value),
        );
        return value;
      },
      removeFile: async (path) => {
        if (
          !processTerminationConfirmed ||
          !workspacePath ||
          !path
        ) {
          return false;
        }
        assertOwnedWorkspaceChild(
          workspacePath,
          path,
          basename(path),
        );
        const expectation = cleanupExpectations.get(
          resolve(path).toLowerCase(),
        );
        if (!expectation) {
          try {
            await lstat(path);
            return false;
          } catch (error) {
            return (error as NodeJS.ErrnoException).code === "ENOENT";
          }
        }
        try {
          await workspaceDirectoryLease?.awaitActive();
          const removed = await secureDeleteKnownFile(
            paths,
            spawnProcess,
            path,
            expectation,
          );
          if (removed) {
            cleanupExpectations.delete(
              resolve(path).toLowerCase(),
            );
          }
          return removed;
        } catch (error) {
          if (error instanceof UnconfirmedProcessTerminationError) {
            processTerminationConfirmed = false;
          }
          return false;
        }
      },
      removeDirectory: async (path) => {
        if (!processTerminationConfirmed || !workspacePath) {
          return false;
        }
        assertExactPath(path, workspacePath);
        try {
          if (workspaceDirectoryLease) {
            await workspaceDirectoryLease.awaitActive();
            await workspaceDirectoryLease.release();
            workspaceDirectoryLease = null;
          }
          return await removeOwnedDirectoryIfEmpty(path);
        } catch {
          return false;
        }
      },
    },
    process: {
      execute: async (request) => {
        try {
          await jdkRuntimeLease?.awaitActive();
          await workspaceDirectoryLease?.awaitActive();
          await assertNetworkGuardedSdkRequest(request, hashFile);
          const abortController = new AbortController();
          const monitoredLeases = [
            jdkRuntimeLease,
            workspaceDirectoryLease,
          ].filter(
            (lease): lease is WindowsPathLease => lease !== null,
          );
          return await runWithLeaseMonitoring(
            monitoredLeases,
            abortController,
            () => processTerminationConfirmed,
            () => {
              processTerminationConfirmed = false;
            },
            () =>
              withExecutionInputHandleLease(
                request,
                paths,
                spawnProcess,
                abortController,
                () => processTerminationConfirmed,
                () => {
                  processTerminationConfirmed = false;
                },
                async () => {
                  try {
                    await assertNetworkGuardedSdkRequest(
                      request,
                      hashFile,
                    );
                    await runNetworkGuardSelfTest(
                      request,
                      paths,
                      spawnProcess,
                      abortController.signal,
                    );
                    await assertNetworkGuardedSdkRequest(
                      request,
                      hashFile,
                    );
                    const result =
                      await runSandboxSdkCsrBoundedChildProcess(
                        request.command,
                        request.arguments,
                        {
                          cwd: request.cwd,
                          environment: request.environment,
                          timeoutMs: request.timeoutMs,
                          maxOutputBytes: request.maxOutputBytes,
                          terminationGraceMs:
                            CHILD_TERMINATION_GRACE_MS,
                          spawnProcess,
                          networkIsolationVerified: true,
                          abortSignal: abortController.signal,
                          forceKill: windowsForceKill(paths),
                        },
                      );
                    processTerminationConfirmed =
                      result.terminationConfirmed;
                    if (abortController.signal.aborted) {
                      if (!result.terminationConfirmed) {
                        throw new UnconfirmedProcessTerminationError();
                      }
                      throw new SandboxSdkCsrLeaseCompromisedError();
                    }
                    if (processTerminationConfirmed) {
                      await recordGeneratedCleanupExpectationIfPresent(
                        request.arguments[
                          request.arguments.indexOf("-privateKey") +
                            1
                        ]!,
                        1,
                        MAX_PRIVATE_KEY_BYTES,
                        fingerprintFile,
                        cleanupExpectations,
                      );
                      await recordGeneratedCleanupExpectationIfPresent(
                        request.arguments[
                          request.arguments.indexOf("-generatedCsr") +
                            1
                        ]!,
                        1,
                        MAX_CSR_PEM_BYTES,
                        fingerprintFile,
                        cleanupExpectations,
                      );
                      await assertNetworkGuardedSdkRequest(
                        request,
                        hashFile,
                      );
                      await jdkRuntimeLease?.awaitActive();
                      await workspaceDirectoryLease?.awaitActive();
                      await assertPinnedJdkRuntime(
                        paths,
                        fingerprintFile,
                      );
                    }
                    return result;
                  } catch (error) {
                    if (
                      error instanceof
                      UnconfirmedProcessTerminationError
                    ) {
                      processTerminationConfirmed = false;
                    }
                    throw error;
                  }
                },
              ),
          );
        } catch (error) {
          if (error instanceof UnconfirmedProcessTerminationError) {
            processTerminationConfirmed = false;
          }
          throw error;
        }
      },
    },
    inspector: {
      inspectRuntime: async (inputPaths) => {
        assertExactPath(inputPaths.javaHome, paths.javaHome);
        assertExactPath(inputPaths.javaBin, paths.javaBin);
        assertExactPath(inputPaths.sdkJarPath, paths.sdkJarPath);
        assertExactPath(inputPaths.sdkConfigPath, paths.sdkConfigPath);
        let javaVersion: string;
        try {
          jdkRuntimeLease ??= await acquireWindowsPathLease(
            paths,
            spawnProcess,
            {
              files: paths.jdkComponentPaths,
            },
          );
          await jdkRuntimeLease.awaitActive();
          const lease = jdkRuntimeLease;
          const abortController = new AbortController();
          javaVersion = await runWithLeaseMonitoring(
            [lease],
            abortController,
            () => processTerminationConfirmed,
            () => {
              processTerminationConfirmed = false;
            },
            async () => {
              await assertPinnedJdkRuntime(
                paths,
                fingerprintFile,
              );
              const version = await inspectJavaVersion(
                paths,
                spawnProcess,
                abortController.signal,
              );
              if (abortController.signal.aborted) {
                throw new SandboxSdkCsrLeaseCompromisedError();
              }
              await lease.awaitActive();
              await assertPinnedJdkRuntime(
                paths,
                fingerprintFile,
              );
              return version;
            },
          );
        } catch (error) {
          if (error instanceof UnconfirmedProcessTerminationError) {
            processTerminationConfirmed = false;
          }
          throw error;
        }
        const sdkJarSha256 = await hashFile(paths.sdkJarPath);
        const sdkConfigSha256 = await hashFile(
          paths.sdkConfigPath,
        );
        return {
          jdkVersion: javaVersion,
          sdkVersion: OFFICIAL_ZATCA_SDK_VERSION,
          sdkJarSha256,
          sdkConfigSha256,
          jdkRuntimeChecksumsVerified: true,
          networkGuardMarkersPresent:
            OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE.includes(
              "DenyNetworkSecurityManager",
            ) &&
            OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE.includes(
              "SocketPermission",
            ),
        };
      },
      inspectStagedJar: async (path) => ({
        sdkJarSha256: await hashFile(path),
      }),
      inspectStagedConfig: async (path) => ({
        sdkConfigSha256: await hashFile(path),
      }),
      inspectSourceJarAfterRun: async (path) => {
        assertExactPath(path, paths.sdkJarPath);
        return { sdkJarSha256: await hashFile(path) };
      },
      inspectSourceConfigAfterRun: async (path) => {
        assertExactPath(path, paths.sdkConfigPath);
        return { sdkConfigSha256: await hashFile(path) };
      },
      inspectArtifacts: async ({ csr, privateKey, csrConfiguration }) => {
        if (csrConfiguration !== OFFICIAL_SYNTHETIC_CSR_CONFIGURATION) {
          throw new Error("ZATCA SDK CSR runtime profile rejected.");
        }
        let csrDer: Buffer | undefined;
        let publicKeySpki: Buffer | undefined;
        let publicKeyDigest: Buffer | undefined;
        try {
          csrDer = decodeSingleCsrPem(csr);
          validateSinglePrivateKeyPem(privateKey);
          const key = createPrivateKey({
            key: privateKey,
            format: "pem",
          });
          if (
            key.type !== "private" ||
            key.asymmetricKeyType !== "ec" ||
            key.asymmetricKeyDetails?.namedCurve !== "secp256k1"
          ) {
            throw new Error("ZATCA SDK CSR runtime key rejected.");
          }
          const exported = createPublicKey(key).export({
            format: "der",
            type: "spki",
          });
          publicKeySpki = Buffer.isBuffer(exported)
            ? Buffer.from(exported)
            : Buffer.from(exported);
          const inspection = inspectCsr({
            csrDer,
            expectedSubject: OFFICIAL_SYNTHETIC_CSR_PROFILE,
            expectedPublicKeySpkiDer: publicKeySpki,
          });
          publicKeyDigest = createHash("sha256")
            .update(publicKeySpki)
            .digest();
          return {
            csrAlgorithm: "ECDSA_SHA256",
            csrAlgorithmVerified:
              inspection.checks.signatureAlgorithmValid,
            csrCurve: "secp256k1",
            csrCurveVerified: inspection.checks.curveValid,
            csrSignatureVerified: inspection.checks.signatureValid,
            csrSubjectVerified: inspection.checks.subjectValid,
            requestedExtensionsVerified:
              inspection.checks.extensionsValid,
            csrTemplate: "PREZATCA-Code-Signing",
            csrTemplateVerified:
              inspection.checks.simulationTemplateValid,
            privateKeyMatchesCsr:
              inspection.checks.expectedPublicKeyMatch,
            publicKeySha256: publicKeyDigest.toString("hex"),
          };
        } finally {
          csrDer?.fill(0);
          publicKeySpki?.fill(0);
          publicKeyDigest?.fill(0);
        }
      },
    },
    custody: {
      storePrivateKey: async ({
        reference,
        privateKey,
      }) => {
        assertCustodyProcessTerminationConfirmed();
        if (reference !== "arc-07b-06h-sdk-csr-private-key") {
          throw new Error("ZATCA SDK CSR runtime custody rejected.");
        }
        const provider = await ensureCustodyProvider();
        await runCustodyOperation(() =>
          provider.importSyntheticPrivateKeyForOperation({
            organizationId: CUSTODY_ORGANIZATION_ID,
            egsUnitId: CUSTODY_EGS_UNIT_ID,
            referenceId: reference,
            environment: "SANDBOX",
            privateKey,
          }),
        );
      },
      verifyPublicKey: async (reference, expectedSha256) => {
        assertCustodyProcessTerminationConfirmed();
        if (
          reference !== "arc-07b-06h-sdk-csr-private-key" ||
          !/^[a-f0-9]{64}$/u.test(expectedSha256)
        ) {
          return false;
        }
        const provider = await ensureCustodyProvider();
        let publicKey: Buffer | undefined;
        let actualDigest: Buffer | undefined;
        let expectedDigest: Buffer | undefined;
        try {
          publicKey = await runCustodyOperation(() =>
            provider.deriveSpkiPublicKeyForOperation({
              organizationId: CUSTODY_ORGANIZATION_ID,
              egsUnitId: CUSTODY_EGS_UNIT_ID,
              referenceId: reference,
              environment: "SANDBOX",
            }),
          );
          actualDigest = createHash("sha256").update(publicKey).digest();
          expectedDigest = Buffer.from(expectedSha256, "hex");
          return (
            actualDigest.length === expectedDigest.length &&
            timingSafeEqual(actualDigest, expectedDigest)
          );
        } finally {
          publicKey?.fill(0);
          actualDigest?.fill(0);
          expectedDigest?.fill(0);
        }
      },
      deleteReference: async (reference) => {
        assertCustodyProcessTerminationConfirmed();
        if (
          reference !== "arc-07b-06h-sdk-csr-private-key" ||
          !custodyProvider
        ) {
          return;
        }
        const input = {
          organizationId: CUSTODY_ORGANIZATION_ID,
          egsUnitId: CUSTODY_EGS_UNIT_ID,
          referenceId: reference,
          environment: "SANDBOX" as const,
        };
        try {
          await runCustodyOperation(() =>
            custodyProvider!.revokeReference(input),
          );
          await runCustodyOperation(() =>
            custodyProvider!.deleteReference(input),
          );
        } catch (error) {
          if (
            error instanceof
            ComplianceCsidCustodyProcessTerminationUnconfirmedError
          ) {
            throw error;
          }
          await runCustodyOperation(() =>
            custodyProvider!.assertDisposableStoreEmptyForOperation(),
          );
        }
      },
      listDisposableMetadata: async () => {
        assertCustodyProcessTerminationConfirmed();
        if (!custodyProvider || !custodyStorageDirectory) return [];
        await runCustodyOperation(() =>
          custodyProvider!.assertDisposableStoreEmptyForOperation(),
        );
        await custodyDirectoryLease?.awaitActive();
        await custodyDirectoryLease?.release();
        custodyDirectoryLease = null;
        if (
          !(await removeOwnedDirectoryIfEmpty(
            custodyStorageDirectory,
          ))
        ) {
          throw new Error("ZATCA SDK CSR custody cleanup failed.");
        }
        custodyStorageDirectory = null;
        custodyProvider = null;
        return [];
      },
    },
  };

  const input: SandboxSdkCsrOracleInput = {
    environment,
    cliFlags,
    paths: {
      javaHome: paths.javaHome,
      javaBin: paths.javaBin,
      sdkJarPath: paths.sdkJarPath,
      sdkConfigPath: paths.sdkConfigPath,
      systemRoot: paths.systemRoot,
      windowsDirectory: paths.windowsDirectory,
      comSpec: paths.comSpec,
      pathExt: paths.pathExt,
    },
    csrConfiguration: OFFICIAL_SYNTHETIC_CSR_CONFIGURATION,
  };

  let result: SandboxSdkCsrOracleResult;
  try {
    result = await runSandboxSdkCsrOracle(input, dependencies);
  } finally {
    if (custodyStorageDirectory && processTerminationConfirmed) {
      try {
        const lease =
          custodyDirectoryLease as WindowsPathLease | null;
        if (lease) {
          await lease.awaitActive();
          await lease.release();
          custodyDirectoryLease = null;
        }
        await removeOwnedDirectoryIfEmpty(custodyStorageDirectory);
      } catch (error) {
        if (error instanceof UnconfirmedProcessTerminationError) {
          processTerminationConfirmed = false;
        }
        // The core's strict custody check will already keep the proof failed.
      }
    }
    if (workspacePath && processTerminationConfirmed) {
      try {
        const lease =
          workspaceDirectoryLease as WindowsPathLease | null;
        if (lease) {
          await lease.awaitActive();
          await lease.release();
          workspaceDirectoryLease = null;
        }
        await removeOwnedDirectoryIfEmpty(workspacePath);
      } catch (error) {
        if (error instanceof UnconfirmedProcessTerminationError) {
          processTerminationConfirmed = false;
        }
        // The core's workspace cleanup result remains authoritative.
      }
    }
    const lease = jdkRuntimeLease as WindowsPathLease | null;
    if (lease) {
      try {
        await lease.awaitActive();
        await lease.release();
      } catch (error) {
        if (error instanceof UnconfirmedProcessTerminationError) {
          processTerminationConfirmed = false;
        }
      } finally {
        jdkRuntimeLease = null;
      }
    }
  }
  if (
    !processTerminationConfirmed &&
    !result.safeErrorCodes.includes(
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
    )
  ) {
    result = {
      ...result,
      status: "FAILED",
      safeErrorCodes: [
        ...result.safeErrorCodes,
        "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
      ],
      evidence: null,
    };
  }
  return result;
}

export async function runSandboxSdkCsrBoundedChildProcess(
  command: string,
  arguments_: readonly string[],
  options: {
    cwd: string;
    environment: Readonly<Record<string, string>>;
    timeoutMs: number;
    maxOutputBytes: number;
    terminationGraceMs: number;
    spawnProcess: SandboxSdkCsrRuntimeSpawn;
    networkIsolationVerified?: boolean;
    stdinBytes?: Buffer;
    abortSignal?: AbortSignal;
    forceKill?: {
      command: string;
      cwd: string;
      environment: Readonly<Record<string, string>>;
    };
  },
): Promise<SandboxSdkCsrProcessResult> {
  if (
    !safeAbsolutePath(command) ||
    !Array.isArray(arguments_) ||
    !safeAbsolutePath(options.cwd) ||
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    !Number.isSafeInteger(options.maxOutputBytes) ||
    options.maxOutputBytes < 1
  ) {
    throw new Error("ZATCA SDK CSR runtime process failed.");
  }
  if (options.abortSignal?.aborted) {
    return {
      exitCode: null,
      signal: null,
      timedOut: false,
      outputLimitExceeded: false,
      stdoutBytes: 0,
      stderrBytes: 0,
      terminationConfirmed: true,
      rawOutputCleared: true,
      networkIsolationVerified:
        options.networkIsolationVerified === true,
      networkCallsMade:
        options.networkIsolationVerified === true ? false : null,
    };
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let timedOut = false;
    let outputLimitExceeded = false;
    let processError = false;
    let terminationRequested = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminationTimer: NodeJS.Timeout | undefined;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let child: ChildProcessLike;
    let forceTerminationStarted = false;
    let abortHandler: (() => void) | undefined;

    const clearTimers = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (terminationTimer) clearTimeout(terminationTimer);
      if (abortHandler) {
        options.abortSignal?.removeEventListener(
          "abort",
          abortHandler,
        );
      }
    };
    const failBeforeSpawn = () => {
      if (settled) return;
      settled = true;
      clearTimers();
      rejectPromise(
        new Error("ZATCA SDK CSR runtime process failed."),
      );
    };
    const finish = (
      exitCode: number | null,
      signal: string | null,
      terminationConfirmed: boolean,
    ) => {
      if (settled) return;
      settled = true;
      clearTimers();
      const isolation = options.networkIsolationVerified === true;
      resolvePromise({
        exitCode,
        signal,
        timedOut,
        outputLimitExceeded,
        stdoutBytes,
        stderrBytes,
        terminationConfirmed,
        rawOutputCleared: true,
        networkIsolationVerified: isolation,
        networkCallsMade: isolation ? false : null,
      });
    };
    const forceTerminateProcessTree = () => {
      if (settled || forceTerminationStarted) return;
      forceTerminationStarted = true;
      const forceKill = options.forceKill;
      if (
        !forceKill ||
        !safeAbsolutePath(forceKill.command) ||
        !safeAbsolutePath(forceKill.cwd) ||
        !Number.isSafeInteger(child.pid) ||
        (child.pid ?? 0) < 1
      ) {
        finish(null, null, false);
        return;
      }
      let killer: ChildProcessLike;
      const chunks: Buffer[] = [];
      let bytes = 0;
      let killerSettled = false;
      let killerTimer: NodeJS.Timeout | undefined;
      const zeroChunks = () => {
        for (const chunk of chunks) chunk.fill(0);
      };
      const finishKiller = (confirmed: boolean) => {
        if (killerSettled) return;
        killerSettled = true;
        if (killerTimer) clearTimeout(killerTimer);
        zeroChunks();
        if (!settled) {
          finish(null, confirmed ? "SIGKILL" : null, confirmed);
        }
      };
      const consumeKiller = (chunk: unknown) => {
        const copy = Buffer.from(chunk as Uint8Array);
        bytes = boundedAdd(bytes, copy.length);
        if (bytes > WINDOWS_HELPER_MAX_OUTPUT_BYTES) {
          copy.fill(0);
          try {
            killer.kill("SIGKILL");
          } catch {
            // The bounded failure below remains authoritative.
          }
          finishKiller(false);
          return;
        }
        chunks.push(copy);
      };
      try {
        killer = options.spawnProcess(
          forceKill.command,
          ["/PID", String(child.pid), "/T", "/F"],
          {
            cwd: forceKill.cwd,
            env: { ...forceKill.environment },
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      } catch {
        finishKiller(false);
        return;
      }
      killer.stdout?.on("data", consumeKiller);
      killer.stderr?.on("data", consumeKiller);
      killer.stdout?.once("error", () => finishKiller(false));
      killer.stderr?.once("error", () => finishKiller(false));
      killer.once("error", () => finishKiller(false));
      killer.once("close", (exitCode, signal) => {
        finishKiller(
          exitCode === 0 &&
            (signal === null || signal === undefined),
        );
      });
      killerTimer = setTimeout(() => {
        try {
          killer.kill("SIGKILL");
        } catch {
          // The bounded failure below remains authoritative.
        }
        finishKiller(false);
      }, WINDOWS_HELPER_TIMEOUT_MS);
    };
    const terminate = () => {
      if (settled || terminationRequested) return;
      terminationRequested = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // A close event may still confirm that no child remains.
      }
      terminationTimer = setTimeout(
        forceTerminateProcessTree,
        options.terminationGraceMs,
      );
    };
    const consume = (stream: "stdout" | "stderr", chunk: unknown) => {
      const value = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      try {
        if (stream === "stdout") {
          stdoutBytes = boundedAdd(stdoutBytes, value.length);
        } else {
          stderrBytes = boundedAdd(stderrBytes, value.length);
        }
        if (
          stdoutBytes + stderrBytes > options.maxOutputBytes &&
          !outputLimitExceeded
        ) {
          outputLimitExceeded = true;
          terminate();
        }
      } finally {
        value.fill(0);
      }
    };

    try {
      child = options.spawnProcess(command, arguments_, {
        cwd: options.cwd,
        env: { ...options.environment },
        shell: false,
        windowsHide: true,
        stdio: [
          options.stdinBytes ? "pipe" : "ignore",
          "pipe",
          "pipe",
        ],
      });
    } catch {
      failBeforeSpawn();
      return;
    }
    if (options.stdinBytes) {
      if (!child.stdin) {
        processError = true;
        terminate();
      } else {
        const stdinCopy = Buffer.from(options.stdinBytes);
        child.stdin.once("error", () => {
          stdinCopy.fill(0);
          processError = true;
          terminate();
        });
        child.stdin.end(stdinCopy, () => {
          stdinCopy.fill(0);
        });
      }
    }
    child.stdout?.on("data", (chunk) => consume("stdout", chunk));
    child.stderr?.on("data", (chunk) => consume("stderr", chunk));
    const handleStreamError = () => {
      processError = true;
      terminate();
    };
    child.stdout?.once("error", handleStreamError);
    child.stderr?.once("error", handleStreamError);
    child.once("error", () => {
      processError = true;
      terminate();
    });
    child.once("close", (exitCode, signal) => {
      finish(
        processError
          ? null
          : typeof exitCode === "number"
            ? exitCode
            : null,
        typeof signal === "string" ? signal : null,
        true,
      );
    });
    abortHandler = () => {
      processError = true;
      terminate();
    };
    options.abortSignal?.addEventListener("abort", abortHandler, {
      once: true,
    });
    if (options.abortSignal?.aborted) {
      abortHandler();
    }
    timeoutTimer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      terminate();
    }, options.timeoutMs);
  });
}

async function resolveRuntimePaths(
  environment: Readonly<Record<string, string | undefined>>,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
): Promise<ResolvedRuntimePaths> {
  if (
    process.platform !== "win32" ||
    environment.APP_ENV?.trim().toUpperCase() !== "LOCAL"
  ) {
    throw new Error("ZATCA SDK CSR runtime environment rejected.");
  }
  const javaHome = resolveSafeLocalAbsolutePath(environment.JAVA_HOME);
  const javaBin = resolveSafeLocalAbsolutePath(
    environment.ZATCA_SDK_JAVA_BIN,
  );
  const sdkRoot = resolveSafeLocalAbsolutePath(
    environment.ZATCA_SDK_ROOT,
  );
  const systemRoot = resolveSafeLocalAbsolutePath(
    environment.SystemRoot,
  );
  const expectedSystemRoot = resolveSafeLocalAbsolutePath(
    PINNED_WINDOWS_SYSTEM_ROOT,
  );
  const windowsDirectory = resolveSafeLocalAbsolutePath(
    environment.WINDIR ?? environment.SystemRoot,
  );
  const expectedJavaBin = join(javaHome, "bin", "java.exe");
  assertExactPath(javaBin, expectedJavaBin);
  assertExactPath(systemRoot, expectedSystemRoot);
  assertExactPath(windowsDirectory, systemRoot);

  const sdkJarPath = join(sdkRoot, "Apps", SDK_JAR_FILE_NAME);
  const sdkConfigPath = join(
    sdkRoot,
    "Configuration",
    SDK_CONFIG_FILE_NAME,
  );
  const comSpec = join(systemRoot, "System32", "cmd.exe");
  const icacls = join(systemRoot, "System32", "icacls.exe");
  const powershell = join(
    systemRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const whoami = join(systemRoot, "System32", "whoami.exe");
  const taskkill = join(systemRoot, "System32", "taskkill.exe");
  const jdkComponentPaths = PINNED_JDK_COMPONENTS.map((component) =>
    join(javaHome, component.relativePath),
  );
  await assertCanonicalDirectory(javaHome);
  await assertCanonicalDirectory(sdkRoot);
  await assertCanonicalDirectory(systemRoot);
  await assertCanonicalRegularFile(
    javaBin,
    1,
    512 * 1024 * 1024,
  );
  await assertCanonicalRegularFile(
    sdkJarPath,
    1,
    32 * 1024 * 1024,
  );
  await assertCanonicalRegularFile(
    sdkConfigPath,
    1,
    1024 * 1024,
  );
  await assertCanonicalRegularFile(
    comSpec,
    1,
    32 * 1024 * 1024,
    false,
  );
  await assertCanonicalRegularFile(
    icacls,
    1,
    32 * 1024 * 1024,
    false,
  );
  await assertCanonicalRegularFile(
    powershell,
    1,
    32 * 1024 * 1024,
    false,
  );
  await assertCanonicalRegularFile(
    whoami,
    1,
    32 * 1024 * 1024,
    false,
  );
  await assertCanonicalRegularFile(
    taskkill,
    1,
    32 * 1024 * 1024,
    false,
  );
  for (const [index, componentPath] of jdkComponentPaths.entries()) {
    const component = PINNED_JDK_COMPONENTS[index]!;
    await assertCanonicalRegularFile(
      componentPath,
      component.byteLength,
      component.byteLength,
      false,
    );
  }
  const userSid = await inspectCurrentUserSid(
    {
      systemRoot,
      windowsDirectory,
      comSpec,
      whoami,
      pathExt:
        environment.PATHEXT?.trim() || ".COM;.EXE;.BAT;.CMD",
    },
    spawnProcess,
  );

  return {
    javaHome,
    javaBin,
    sdkRoot,
    sdkJarPath,
    sdkConfigPath,
    systemRoot,
    windowsDirectory,
    comSpec,
    icacls,
    powershell,
    whoami,
    taskkill,
    jdkComponentPaths,
    pathExt:
      environment.PATHEXT?.trim() || ".COM;.EXE;.BAT;.CMD",
    userSid,
  };
}

async function inspectCurrentUserSid(
  paths: Pick<
    ResolvedRuntimePaths,
    | "systemRoot"
    | "windowsDirectory"
    | "comSpec"
    | "whoami"
    | "pathExt"
  >,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
): Promise<string> {
  const captured = await captureBoundedProcess(
    paths.whoami,
    ["/user", "/fo", "csv", "/nh"],
    {
      cwd: join(paths.systemRoot, "System32"),
      environment: {
        ComSpec: paths.comSpec,
        PATH: join(paths.systemRoot, "System32"),
        PATHEXT: paths.pathExt,
        SystemRoot: paths.systemRoot,
        WINDIR: paths.windowsDirectory,
      },
      maxOutputBytes: CURRENT_USER_SID_MAX_OUTPUT_BYTES,
      timeoutMs: 10_000,
      spawnProcess,
    },
  );
  try {
    if (captured.exitCode !== 0) {
      throw new Error("ZATCA SDK CSR Windows token rejected.");
    }
    const value = captured.combined.toString("utf8").trim();
    const match = value.match(
      /^"[^"\r\n]{1,256}","(S-1-(?:\d+-){1,14}\d+)"$/u,
    );
    if (!match) {
      throw new Error("ZATCA SDK CSR Windows token rejected.");
    }
    return match[1]!;
  } finally {
    captured.combined.fill(0);
  }
}

async function inspectJavaVersion(
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  abortSignal: AbortSignal,
): Promise<string> {
  const result = await runSandboxSdkCsrBoundedChildProcess(
    paths.javaBin,
    ["-version"],
    {
      cwd: dirname(paths.javaBin),
      environment: {
        ComSpec: paths.comSpec,
        JAVA_HOME: paths.javaHome,
        PATH: dirname(paths.javaBin),
        PATHEXT: paths.pathExt,
        SystemRoot: paths.systemRoot,
        TEMP: tmpdir(),
        TMP: tmpdir(),
        WINDIR: paths.windowsDirectory,
        ZATCA_SDK_JAVA_BIN: paths.javaBin,
      },
      maxOutputBytes: JAVA_VERSION_MAX_OUTPUT_BYTES,
      timeoutMs: 10_000,
      terminationGraceMs: CHILD_TERMINATION_GRACE_MS,
      spawnProcess,
      abortSignal,
      forceKill: windowsForceKill(paths),
    },
  );
  if (abortSignal.aborted) {
    if (!result.terminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
    throw new SandboxSdkCsrLeaseCompromisedError();
  }
  if (
    result.exitCode !== 0 ||
    result.signal !== null ||
    result.timedOut ||
    result.outputLimitExceeded ||
    !result.terminationConfirmed ||
    !result.rawOutputCleared
  ) {
    if (!result.terminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
    throw new Error("ZATCA SDK CSR Java runtime rejected.");
  }
  return OFFICIAL_ZATCA_SDK_JAVA_VERSION;
}

async function assertPinnedJdkRuntime(
  paths: ResolvedRuntimePaths,
  fingerprintFile: (
    path: string,
    minimumBytes: number,
    maximumBytes: number,
  ) => Promise<FileCleanupExpectation>,
): Promise<void> {
  if (
    paths.jdkComponentPaths.length !==
    PINNED_JDK_COMPONENTS.length
  ) {
    throw new Error("ZATCA SDK CSR Java runtime rejected.");
  }
  for (const [index, path] of paths.jdkComponentPaths.entries()) {
    const expected = PINNED_JDK_COMPONENTS[index]!;
    const actual = await fingerprintFile(
      path,
      expected.byteLength,
      expected.byteLength,
    );
    if (
      actual.byteLength !== expected.byteLength ||
      actual.sha256.toUpperCase() !== expected.sha256
    ) {
      throw new Error("ZATCA SDK CSR Java runtime rejected.");
    }
  }
}

async function restrictDirectoryAcl(
  directory: string,
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
): Promise<void> {
  await runRuntimeIcacls(
    paths,
    spawnProcess,
    [
      directory,
      "/inheritance:r",
      "/grant:r",
      `*${paths.userSid}:(OI)(CI)F`,
      "/grant:r",
      "SYSTEM:(OI)(CI)F",
    ],
  );
}

async function runRuntimeIcacls(
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  arguments_: readonly string[],
): Promise<void> {
  const result = await runSandboxSdkCsrBoundedChildProcess(
    paths.icacls,
    arguments_,
    {
      cwd: join(paths.systemRoot, "System32"),
      environment: {
        ComSpec: paths.comSpec,
        PATH: join(paths.systemRoot, "System32"),
        PATHEXT: paths.pathExt,
        SystemRoot: paths.systemRoot,
        WINDIR: paths.windowsDirectory,
      },
      timeoutMs: 10_000,
      maxOutputBytes: 64 * 1024,
      terminationGraceMs: CHILD_TERMINATION_GRACE_MS,
      spawnProcess,
      forceKill: windowsForceKill(paths),
    },
  );
  if (
    result.exitCode !== 0 ||
    result.timedOut ||
    result.outputLimitExceeded ||
    !result.terminationConfirmed ||
    !result.rawOutputCleared
  ) {
    if (!result.terminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
    throw new Error("ZATCA SDK CSR runtime ACL failed.");
  }
}

function encodePowerShellCommand(source: string): string {
  const bytes = Buffer.from(source, "utf16le");
  try {
    return bytes.toString("base64");
  } finally {
    bytes.fill(0);
  }
}

function windowsHelperEnvironment(
  paths: ResolvedRuntimePaths,
  additions: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return {
    ComSpec: paths.comSpec,
    PATH: join(paths.systemRoot, "System32"),
    PATHEXT: paths.pathExt,
    SystemRoot: paths.systemRoot,
    TEMP: tmpdir(),
    TMP: tmpdir(),
    WINDIR: paths.windowsDirectory,
    ...additions,
  };
}

function windowsForceKill(
  paths: ResolvedRuntimePaths,
): {
  command: string;
  cwd: string;
  environment: Readonly<Record<string, string>>;
} {
  return {
    command: paths.taskkill,
    cwd: join(paths.systemRoot, "System32"),
    environment: windowsHelperEnvironment(paths, {}),
  };
}

async function acquireWindowsPathLease(
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  input: {
    directory?: string;
    files: readonly string[];
  },
): Promise<WindowsPathLease> {
  if (
    input.files.length > 16 ||
    (input.directory === undefined && input.files.length === 0)
  ) {
    throw new Error("ZATCA SDK CSR runtime lease rejected.");
  }
  if (input.directory) {
    await assertCanonicalDirectory(input.directory);
  }
  for (const path of input.files) {
    await assertCanonicalRegularFile(
      path,
      1,
      256 * 1024 * 1024,
      false,
    );
  }

  const additions: Record<string, string> = {
    LB_PATH_LEASE_DIRECTORY: input.directory ?? "",
    LB_PATH_LEASE_FILE_COUNT: String(input.files.length),
  };
  input.files.forEach((path, index) => {
    additions[`LB_PATH_LEASE_FILE_${index}`] = path;
  });

  let child: ChildProcessLike;
  let state:
    | "STARTING"
    | "ACTIVE"
    | "RELEASING"
    | "TERMINATING"
    | "CLOSED"
    | "FAILED" = "STARTING";
  let readyResolve!: () => void;
  let readyReject!: (error: Error) => void;
  let releaseResolve!: () => void;
  let releaseReject!: (error: Error) => void;
  let compromiseResolve!: (result: WindowsPathLeaseCompromise) => void;
  let terminationResolve!: (result: {
    terminationConfirmed: boolean;
  }) => void;
  let closeResolve!: () => void;
  const readyPromise = new Promise<void>((resolvePromise, rejectPromise) => {
    readyResolve = resolvePromise;
    readyReject = rejectPromise;
  });
  const releasePromise = new Promise<void>(
    (resolvePromise, rejectPromise) => {
      releaseResolve = resolvePromise;
      releaseReject = rejectPromise;
    },
  );
  const terminationResolution = new Promise<{
    terminationConfirmed: boolean;
  }>((resolvePromise) => {
    terminationResolve = resolvePromise;
  });
  const compromisePromise = new Promise<WindowsPathLeaseCompromise>(
    (resolvePromise) => {
      compromiseResolve = resolvePromise;
    },
  );
  const compromise: WindowsPathLeaseCompromise = Object.freeze({
    terminationResolution,
  });
  const closePromise = new Promise<void>((resolvePromise) => {
    closeResolve = resolvePromise;
  });
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let outputBytes = 0;
  let helperTimer: NodeJS.Timeout | undefined;
  let closeObserved = false;
  let failureStarted = false;
  let failureTerminationConfirmed: boolean | null = null;
  const expectedReadyLf = "READY\n";
  const expectedReadyCrlf = "READY\r\n";
  const expectedClosedLf = "READY\nCLOSED\n";
  const expectedClosedCrlf = "READY\r\nCLOSED\r\n";

  const zeroOutput = () => {
    for (const chunk of stdoutChunks) chunk.fill(0);
    for (const chunk of stderrChunks) chunk.fill(0);
    stdoutChunks.length = 0;
    stderrChunks.length = 0;
  };
  const combinedStdout = () => {
    const combined = Buffer.concat(stdoutChunks);
    try {
      return combined.toString("utf8");
    } finally {
      combined.fill(0);
    }
  };
  const waitForClose = (timeoutMs: number) =>
    new Promise<boolean>((resolvePromise) => {
      if (closeObserved) {
        resolvePromise(true);
        return;
      }
      const timer = setTimeout(
        () => resolvePromise(closeObserved),
        timeoutMs,
      );
      void closePromise.then(() => {
        clearTimeout(timer);
        resolvePromise(true);
      });
    });
  const terminateAndConfirm = async (): Promise<boolean> => {
    try {
      child.kill("SIGKILL");
    } catch {
      // A close event or pinned taskkill may still confirm termination.
    }
    if (await waitForClose(CHILD_TERMINATION_GRACE_MS)) {
      return true;
    }
    if (!Number.isSafeInteger(child.pid) || (child.pid ?? 0) < 1) {
      return false;
    }
    const forceKill = windowsForceKill(paths);
    const result = await runSandboxSdkCsrBoundedChildProcess(
      forceKill.command,
      ["/PID", String(child.pid), "/T", "/F"],
      {
        cwd: forceKill.cwd,
        environment: forceKill.environment,
        timeoutMs: WINDOWS_HELPER_TIMEOUT_MS,
        maxOutputBytes: WINDOWS_HELPER_MAX_OUTPUT_BYTES,
        terminationGraceMs: CHILD_TERMINATION_GRACE_MS,
        spawnProcess,
      },
    );
    return (
      closeObserved ||
      (result.exitCode === 0 &&
        result.signal === null &&
        !result.timedOut &&
        !result.outputLimitExceeded &&
        result.terminationConfirmed &&
        result.rawOutputCleared)
    );
  };
  const fail = (message: string) => {
    if (
      failureStarted ||
      state === "FAILED" ||
      state === "CLOSED"
    ) {
      return;
    }
    failureStarted = true;
    const previousState = state;
    const wasActive =
      previousState === "ACTIVE" ||
      previousState === "RELEASING";
    const wasReleasing = previousState === "RELEASING";
    state = "TERMINATING";
    if (helperTimer) clearTimeout(helperTimer);
    if (wasActive) {
      compromiseResolve(compromise);
    }
    void (async () => {
      let terminationConfirmed = false;
      try {
        terminationConfirmed = await terminateAndConfirm();
      } catch {
        terminationConfirmed = false;
      }
      failureTerminationConfirmed = terminationConfirmed;
      state = "FAILED";
      zeroOutput();
      const error = terminationConfirmed
        ? new Error(message)
        : new UnconfirmedProcessTerminationError();
      terminationResolve({ terminationConfirmed });
      if (wasActive) {
        if (wasReleasing) {
          releaseReject(error);
        }
      } else {
        readyReject(error);
      }
    })();
  };
  const consume = (target: Buffer[], chunk: unknown) => {
    const value = Buffer.from(chunk as Uint8Array);
    outputBytes = boundedAdd(outputBytes, value.length);
    if (outputBytes > WINDOWS_HELPER_MAX_OUTPUT_BYTES) {
      value.fill(0);
      fail("ZATCA SDK CSR runtime lease failed.");
      return;
    }
    target.push(value);
    if (target === stderrChunks && value.length > 0) {
      fail("ZATCA SDK CSR runtime lease failed.");
      return;
    }
    if (state === "STARTING") {
      const output = combinedStdout();
      if (output === expectedReadyLf || output === expectedReadyCrlf) {
        state = "ACTIVE";
        if (helperTimer) clearTimeout(helperTimer);
        readyResolve();
      } else if (
        output.includes("\n") ||
        output.length > expectedReadyCrlf.length
      ) {
        fail("ZATCA SDK CSR runtime lease failed.");
      }
    }
  };

  try {
    child = spawnProcess(
      paths.powershell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodePowerShellCommand(WINDOWS_PATH_LEASE_POWERSHELL),
      ],
      {
        cwd: join(paths.systemRoot, "System32"),
        env: windowsHelperEnvironment(paths, additions),
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error("ZATCA SDK CSR runtime lease failed.");
  }
  child.once("close", (exitCode, signal) => {
    closeObserved = true;
    closeResolve();
    if (helperTimer) clearTimeout(helperTimer);
    if (state === "TERMINATING") {
      return;
    }
    const output = combinedStdout();
    const closedCleanly =
      state === "RELEASING" &&
      exitCode === 0 &&
      (signal === null || signal === undefined) &&
      stderrChunks.length === 0 &&
      (output === expectedClosedLf ||
        output === expectedClosedCrlf);
    if (closedCleanly) {
      state = "CLOSED";
      zeroOutput();
      releaseResolve();
      return;
    }
    const wasReady = state === "ACTIVE" || state === "RELEASING";
    const wasReleasing = state === "RELEASING";
    failureTerminationConfirmed = true;
    state = "FAILED";
    zeroOutput();
    if (wasReady) {
      compromiseResolve(compromise);
      terminationResolve({ terminationConfirmed: true });
      if (wasReleasing) {
        releaseReject(
          new Error("ZATCA SDK CSR runtime lease failed."),
        );
      }
    } else {
      readyReject(
        new Error("ZATCA SDK CSR runtime lease failed."),
      );
    }
  });
  if (!child.stdin || !child.stdout || !child.stderr) {
    fail("ZATCA SDK CSR runtime lease failed.");
  } else {
    child.stdout.on("data", (chunk) =>
      consume(stdoutChunks, chunk),
    );
    child.stderr.on("data", (chunk) =>
      consume(stderrChunks, chunk),
    );
    child.stdout.once("error", () =>
      fail("ZATCA SDK CSR runtime lease failed."),
    );
    child.stderr.once("error", () =>
      fail("ZATCA SDK CSR runtime lease failed."),
    );
  }
  child.once("error", () =>
    fail("ZATCA SDK CSR runtime lease failed."),
  );
  if (state === "STARTING") {
    helperTimer = setTimeout(
      () => fail("ZATCA SDK CSR runtime lease failed."),
      WINDOWS_HELPER_TIMEOUT_MS,
    );
  }
  await readyPromise;

  const awaitActive = async (): Promise<void> => {
    if (state === "ACTIVE") return;
    if (state === "TERMINATING") {
      const { terminationConfirmed } = await terminationResolution;
      if (!terminationConfirmed) {
        throw new UnconfirmedProcessTerminationError();
      }
      throw new SandboxSdkCsrLeaseCompromisedError();
    }
    if (
      state === "FAILED" &&
      failureTerminationConfirmed === false
    ) {
      throw new UnconfirmedProcessTerminationError();
    }
    if (state === "FAILED") {
      throw new SandboxSdkCsrLeaseCompromisedError();
    }
    throw new Error("ZATCA SDK CSR runtime lease failed.");
  };

  return {
    awaitActive,
    whenCompromised() {
      return compromisePromise;
    },
    async release() {
      if (state === "CLOSED") return;
      if (state === "TERMINATING") {
        await awaitActive();
      }
      if (state !== "ACTIVE" || !child.stdin) {
        if (
          state === "FAILED" &&
          failureTerminationConfirmed === false
        ) {
          throw new UnconfirmedProcessTerminationError();
        }
        if (state === "FAILED") {
          throw new SandboxSdkCsrLeaseCompromisedError();
        }
        throw new Error("ZATCA SDK CSR runtime lease failed.");
      }
      state = "RELEASING";
      helperTimer = setTimeout(
        () => fail("ZATCA SDK CSR runtime lease failed."),
        WINDOWS_HELPER_TIMEOUT_MS,
      );
      const releaseByte = Buffer.from([0x52]);
      try {
        const writePromise = new Promise<void>((resolvePromise) => {
          const handleInputFailure = () => {
            releaseByte.fill(0);
            fail("ZATCA SDK CSR runtime lease failed.");
            resolvePromise();
          };
          child.stdin!.once("error", handleInputFailure);
          try {
            child.stdin!.end(releaseByte, () => {
              releaseByte.fill(0);
              resolvePromise();
            });
          } catch {
            handleInputFailure();
          }
        });
        await Promise.race([writePromise, releasePromise]);
        await releasePromise;
      } finally {
        releaseByte.fill(0);
      }
    },
  };
}

async function secureDeleteKnownFile(
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  path: string,
  expected: FileCleanupExpectation,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(expected.byteLength) ||
    expected.byteLength < 0 ||
    !/^[A-F0-9]{64}$/u.test(expected.sha256)
  ) {
    return false;
  }
  const digest = Buffer.from(expected.sha256, "hex");
  const metadata = Buffer.alloc(40);
  try {
    metadata.writeBigInt64LE(BigInt(expected.byteLength), 0);
    digest.copy(metadata, 8);
    const result = await runSandboxSdkCsrBoundedChildProcess(
      paths.powershell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-EncodedCommand",
        encodePowerShellCommand(WINDOWS_SECURE_DELETE_POWERSHELL),
      ],
      {
        cwd: join(paths.systemRoot, "System32"),
        environment: windowsHelperEnvironment(paths, {
          LB_SECURE_DELETE_PATH: path,
        }),
        timeoutMs: WINDOWS_HELPER_TIMEOUT_MS,
        maxOutputBytes: WINDOWS_HELPER_MAX_OUTPUT_BYTES,
        terminationGraceMs: CHILD_TERMINATION_GRACE_MS,
        spawnProcess,
        stdinBytes: metadata,
        forceKill: windowsForceKill(paths),
      },
    );
    if (
      result.exitCode !== 0 ||
      result.signal !== null ||
      result.timedOut ||
      result.outputLimitExceeded ||
      !result.terminationConfirmed ||
      !result.rawOutputCleared ||
      result.stdoutBytes !== 0 ||
      result.stderrBytes !== 0
    ) {
      if (!result.terminationConfirmed) {
        throw new UnconfirmedProcessTerminationError();
      }
      return false;
    }
    try {
      await lstat(path);
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ENOENT";
    }
  } finally {
    digest.fill(0);
    metadata.fill(0);
  }
}

async function removeOwnedDirectoryIfEmpty(path: string): Promise<boolean> {
  try {
    const details = await lstat(path);
    if (!details.isDirectory() || details.isSymbolicLink()) {
      return false;
    }
    await rmdir(path);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT";
  }
}

async function runWithLeaseMonitoring<T>(
  leases: readonly WindowsPathLease[],
  abortController: AbortController,
  processTerminationIsConfirmed: () => boolean,
  markProcessTerminationUnconfirmed: () => void,
  operation: () => Promise<T>,
): Promise<T> {
  if (leases.length === 0) {
    throw new Error("ZATCA SDK CSR runtime lease failed.");
  }
  const settleEveryLease = async (): Promise<Error | null> => {
    const results = await Promise.allSettled(
      leases.map((lease) => lease.awaitActive()),
    );
    let confirmedCompromise = false;
    let unconfirmedTermination: Error | null = null;
    for (const result of results) {
      if (result.status === "fulfilled") continue;
      if (result.reason instanceof UnconfirmedProcessTerminationError) {
        unconfirmedTermination ??= result.reason;
      } else {
        confirmedCompromise = true;
      }
    }
    if (unconfirmedTermination) return unconfirmedTermination;
    return confirmedCompromise
      ? new SandboxSdkCsrLeaseCompromisedError()
      : null;
  };
  const operationOutcomePromise = operation().then(
    (value) => ({
      kind: "OPERATION" as const,
      succeeded: true as const,
      value,
    }),
    (error: unknown) => ({
      kind: "OPERATION" as const,
      succeeded: false as const,
      error,
    }),
  );
  const compromiseOutcomePromise = Promise.race(
    leases.map((lease) => lease.whenCompromised()),
  ).then((compromise) => ({
    kind: "COMPROMISE" as const,
    compromise,
  }));
  const firstOutcome = await Promise.race([
    operationOutcomePromise,
    compromiseOutcomePromise,
  ]);

  if (firstOutcome.kind === "COMPROMISE") {
    abortController.abort();
    const operationOutcome = await operationOutcomePromise;
    const termination =
      await firstOutcome.compromise.terminationResolution;
    const leaseError = await settleEveryLease();
    if (
      !termination.terminationConfirmed ||
      leaseError instanceof UnconfirmedProcessTerminationError ||
      (!operationOutcome.succeeded &&
        operationOutcome.error instanceof
          UnconfirmedProcessTerminationError) ||
      !processTerminationIsConfirmed()
    ) {
      markProcessTerminationUnconfirmed();
      throw new UnconfirmedProcessTerminationError();
    }
    throw (
      leaseError ??
      new SandboxSdkCsrLeaseCompromisedError()
    );
  }

  const leaseError = await settleEveryLease();
  if (
    leaseError instanceof UnconfirmedProcessTerminationError ||
    (!firstOutcome.succeeded &&
      firstOutcome.error instanceof UnconfirmedProcessTerminationError) ||
    !processTerminationIsConfirmed()
  ) {
    markProcessTerminationUnconfirmed();
    throw new UnconfirmedProcessTerminationError();
  }
  if (leaseError) {
    throw leaseError;
  }
  if (!firstOutcome.succeeded) {
    throw firstOutcome.error;
  }
  return firstOutcome.value;
}

async function withExecutionInputHandleLease<T>(
  request: SandboxSdkCsrProcessRequest,
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  abortController: AbortController,
  processTerminationIsConfirmed: () => boolean,
  markProcessTerminationUnconfirmed: () => void,
  operation: () => Promise<T>,
): Promise<T> {
  const configFlagIndex = request.arguments.indexOf("-csrConfig");
  if (
    configFlagIndex < 0 ||
    request.arguments.lastIndexOf("-csrConfig") !== configFlagIndex
  ) {
    throw new Error("ZATCA SDK CSR runtime lease failed.");
  }
  const inputPaths = [
    request.arguments[1],
    request.arguments[2],
    request.arguments[configFlagIndex + 1],
    request.environment.SDK_CONFIG,
  ];
  if (inputPaths.some((path) => typeof path !== "string")) {
    throw new Error("ZATCA SDK CSR runtime lease failed.");
  }
  assertOwnedWorkspaceChild(
    request.cwd,
    inputPaths[0]!,
    "LedgerByteNoNetworkSdkLauncher.java",
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    inputPaths[1]!,
    SDK_JAR_FILE_NAME,
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    inputPaths[2]!,
    "csr-config.properties",
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    inputPaths[3]!,
    STAGED_SDK_CONFIG_FILE_NAME,
  );

  let lease: WindowsPathLease | null = null;
  try {
    lease = await acquireWindowsPathLease(paths, spawnProcess, {
      directory: request.cwd,
      files: inputPaths as string[],
    });
    await lease.awaitActive();
    const value = await runWithLeaseMonitoring(
      [lease],
      abortController,
      processTerminationIsConfirmed,
      markProcessTerminationUnconfirmed,
      operation,
    );
    await lease.awaitActive();
    return value;
  } catch (error) {
    if (error instanceof UnconfirmedProcessTerminationError) {
      markProcessTerminationUnconfirmed();
    }
    throw error;
  } finally {
    if (lease && processTerminationIsConfirmed()) {
      try {
        await lease.release();
      } catch (error) {
        if (error instanceof UnconfirmedProcessTerminationError) {
          markProcessTerminationUnconfirmed();
        }
        throw error;
      }
    }
  }
}

async function assertNetworkGuardedSdkRequest(
  request: SandboxSdkCsrProcessRequest,
  hashFile: (path: string) => Promise<string>,
): Promise<void> {
  const expected = buildSandboxSdkCsrProcessRequest(
    {
      environment: {
        [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "true",
      },
      cliFlags: [...OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS],
      paths: {
        javaHome: request.environment.JAVA_HOME!,
        javaBin: request.command,
        sdkJarPath: request.arguments[2]!,
        sdkConfigPath: request.environment.SDK_CONFIG!,
        systemRoot: request.environment.SystemRoot!,
        windowsDirectory: request.environment.WINDIR!,
        comSpec: request.environment.ComSpec!,
        pathExt: request.environment.PATHEXT!,
      },
      csrConfiguration: OFFICIAL_SYNTHETIC_CSR_CONFIGURATION,
    },
    request.cwd,
  );
  if (
    request.command !== expected.command ||
    request.arguments.length !== expected.arguments.length ||
    request.arguments.some(
      (value, index) => value !== expected.arguments[index],
    ) ||
    JSON.stringify(request.environment) !==
      JSON.stringify(expected.environment)
  ) {
    throw new Error("ZATCA SDK CSR runtime command rejected.");
  }
  const launcherPath = request.arguments[1]!;
  const stagedJarPath = request.arguments[2]!;
  const configPath =
    request.arguments[
      request.arguments.indexOf("-csrConfig") + 1
    ]!;
  const sdkConfigPath = request.environment.SDK_CONFIG!;
  assertOwnedWorkspaceChild(
    request.cwd,
    launcherPath,
    "LedgerByteNoNetworkSdkLauncher.java",
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    stagedJarPath,
    SDK_JAR_FILE_NAME,
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    configPath,
    "csr-config.properties",
  );
  assertOwnedWorkspaceChild(
    request.cwd,
    sdkConfigPath,
    STAGED_SDK_CONFIG_FILE_NAME,
  );
  const launcher = await readBoundedStableRegularFile(
    launcherPath,
    1,
    MAX_LAUNCHER_BYTES,
  );
  const config = await readBoundedStableRegularFile(
    configPath,
    1,
    MAX_CONFIG_BYTES,
  );
  try {
    if (
      launcher.toString("utf8") !==
        OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE ||
      config.toString("utf8") !==
        OFFICIAL_SYNTHETIC_CSR_CONFIGURATION ||
      (await hashFile(stagedJarPath)).toUpperCase() !==
        OFFICIAL_ZATCA_SDK_JAR_SHA256 ||
      (await hashFile(sdkConfigPath)).toUpperCase() !==
        OFFICIAL_ZATCA_SDK_CONFIG_SHA256
    ) {
      throw new Error("ZATCA SDK CSR network guard rejected.");
    }
  } finally {
    launcher.fill(0);
    config.fill(0);
  }
}

async function runNetworkGuardSelfTest(
  request: SandboxSdkCsrProcessRequest,
  paths: ResolvedRuntimePaths,
  spawnProcess: SandboxSdkCsrRuntimeSpawn,
  abortSignal: AbortSignal,
): Promise<void> {
  const launcherPath = request.arguments[1]!;
  const result = await runSandboxSdkCsrBoundedChildProcess(
    request.command,
    [
      "-XX:-UsePerfData",
      launcherPath,
      "--guard-self-test",
    ],
    {
      cwd: request.cwd,
      environment: request.environment,
      timeoutMs: 10_000,
      maxOutputBytes: 8 * 1024,
      terminationGraceMs: CHILD_TERMINATION_GRACE_MS,
      spawnProcess,
      abortSignal,
      forceKill: windowsForceKill(paths),
    },
  );
  if (abortSignal.aborted) {
    if (!result.terminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
    throw new SandboxSdkCsrLeaseCompromisedError();
  }
  if (
    result.exitCode !== 0 ||
    result.timedOut ||
    result.outputLimitExceeded ||
    !result.terminationConfirmed ||
    !result.rawOutputCleared
  ) {
    if (!result.terminationConfirmed) {
      throw new UnconfirmedProcessTerminationError();
    }
    throw new Error("ZATCA SDK CSR network guard rejected.");
  }
}

async function assertExpectedWorkspaceEntries(
  workspace: string | null,
): Promise<void> {
  if (!workspace) {
    throw new Error("ZATCA SDK CSR workspace missing.");
  }
  const expected = new Set([
    SDK_JAR_FILE_NAME,
    STAGED_SDK_CONFIG_FILE_NAME,
    "csr-config.properties",
    "LedgerByteNoNetworkSdkLauncher.java",
    "generated-private-key.pem",
    "generated.csr",
  ]);
  const entries = await readdir(workspace, {
    withFileTypes: true,
  });
  if (
    entries.length !== expected.size ||
    entries.length > MAX_WORKSPACE_ENTRIES ||
    entries.some(
      (entry) =>
        !expected.has(entry.name) ||
        (!entry.isFile() && !entry.isSymbolicLink()),
    )
  ) {
    throw new Error("ZATCA SDK CSR workspace artifact rejected.");
  }
}

async function assertCanonicalDirectory(path: string): Promise<void> {
  const canonical = await realpath(path);
  assertExactPath(canonical, path);
  const details = await lstat(path);
  if (!details.isDirectory() || details.isSymbolicLink()) {
    throw new Error("ZATCA SDK CSR runtime directory rejected.");
  }
}

async function assertCanonicalRegularFile(
  path: string,
  minimumBytes: number,
  maximumBytes: number,
  requireSingleLink = true,
) {
  const canonical = await realpath(path);
  assertExactPath(canonical, path);
  return assertRegularFile(
    path,
    minimumBytes,
    maximumBytes,
    requireSingleLink,
  );
}

async function assertRegularFile(
  path: string,
  minimumBytes: number,
  maximumBytes: number,
  requireSingleLink = true,
) {
  const details = await lstat(path);
  if (
    !details.isFile() ||
    details.isSymbolicLink() ||
    (requireSingleLink && details.nlink !== 1) ||
    details.size < minimumBytes ||
    details.size > maximumBytes
  ) {
    throw new Error("ZATCA SDK CSR runtime file rejected.");
  }
  return details;
}

async function readBoundedStableRegularFile(
  path: string,
  minimumBytes: number,
  maximumBytes: number,
  afterInitialLstat?: (path: string) => Promise<void>,
): Promise<Buffer> {
  const before = await assertCanonicalRegularFile(
    path,
    minimumBytes,
    maximumBytes,
  );
  await afterInitialLstat?.(path);
  const noFollow =
    typeof fsConstants.O_NOFOLLOW === "number"
      ? fsConstants.O_NOFOLLOW
      : 0;
  const handle = await open(
    path,
    fsConstants.O_RDONLY | noFollow,
  );
  let value: Buffer | undefined;
  try {
    const opened = await handle.stat();
    assertStableFileSnapshot(
      before,
      opened,
      minimumBytes,
      maximumBytes,
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
        throw new Error("ZATCA SDK CSR runtime artifact changed.");
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
        throw new Error("ZATCA SDK CSR runtime artifact changed.");
      }
    } finally {
      overflowProbe.fill(0);
    }
    const after = await handle.stat();
    assertStableFileSnapshot(
      opened,
      after,
      minimumBytes,
      maximumBytes,
    );
  } catch (error) {
    value?.fill(0);
    try {
      await handle.close();
    } catch {
      // The original safe failure remains authoritative.
    }
    throw error;
  }
  try {
    await handle.close();
  } catch {
    value!.fill(0);
    throw new Error("ZATCA SDK CSR runtime artifact changed.");
  }
  return value!;
}

function assertStableFileSnapshot(
  before: Awaited<ReturnType<typeof lstat>>,
  after: Awaited<ReturnType<typeof lstat>>,
  minimumBytes: number,
  maximumBytes: number,
): void {
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    after.nlink !== 1 ||
    after.size < minimumBytes ||
    after.size > maximumBytes ||
    after.dev !== before.dev ||
    after.ino !== before.ino ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs ||
    after.ctimeMs !== before.ctimeMs
  ) {
    throw new Error("ZATCA SDK CSR runtime artifact changed.");
  }
}

function cleanupExpectationFromBuffer(
  value: Buffer,
): FileCleanupExpectation {
  return {
    byteLength: value.length,
    sha256: createHash("sha256")
      .update(value)
      .digest("hex")
      .toUpperCase(),
  };
}

async function recordGeneratedCleanupExpectationIfPresent(
  path: string,
  minimumBytes: number,
  maximumBytes: number,
  fingerprintFile: (
    path: string,
    minimumBytes: number,
    maximumBytes: number,
  ) => Promise<FileCleanupExpectation>,
  expectations: Map<string, FileCleanupExpectation>,
): Promise<void> {
  try {
    expectations.set(
      resolve(path).toLowerCase(),
      await fingerprintFile(path, minimumBytes, maximumBytes),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

function decodeSingleCsrPem(value: Buffer): Buffer {
  if (
    !Buffer.isBuffer(value) ||
    value.length === 0 ||
    value.length > MAX_CSR_PEM_BYTES ||
    value.some((byte) => byte > 0x7f)
  ) {
    throw new Error("ZATCA SDK CSR PEM rejected.");
  }
  const normalized = value
    .toString("ascii")
    .replace(/\r\n/gu, "\n")
    .replace(/\r/gu, "\n");
  const lines = normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n")
    : normalized.split("\n");
  if (
    lines.length < 3 ||
    lines[0] !== "-----BEGIN CERTIFICATE REQUEST-----" ||
    lines.at(-1) !== "-----END CERTIFICATE REQUEST-----"
  ) {
    throw new Error("ZATCA SDK CSR PEM rejected.");
  }
  const bodyLines = lines.slice(1, -1);
  if (
    bodyLines.length === 0 ||
    bodyLines.some(
      (line, index) =>
        line.length === 0 ||
        line.length > 64 ||
        !/^[A-Za-z0-9+/]+={0,2}$/u.test(line) ||
        (index < bodyLines.length - 1 && line.includes("=")),
    )
  ) {
    throw new Error("ZATCA SDK CSR PEM rejected.");
  }
  const base64 = bodyLines.join("");
  if (
    base64.length === 0 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(base64)
  ) {
    throw new Error("ZATCA SDK CSR PEM rejected.");
  }
  const decoded = Buffer.from(base64, "base64");
  if (
    decoded.length === 0 ||
    decoded.length > MAX_CSR_PEM_BYTES ||
    decoded.toString("base64") !== base64
  ) {
    decoded.fill(0);
    throw new Error("ZATCA SDK CSR PEM rejected.");
  }
  return decoded;
}

const EC_PRIVATE_KEY_PEM_HEADER = Buffer.from(
  "-----BEGIN EC PRIVATE KEY-----",
  "ascii",
);
const EC_PRIVATE_KEY_PEM_FOOTER = Buffer.from(
  "-----END EC PRIVATE KEY-----",
  "ascii",
);
const PKCS8_PRIVATE_KEY_PEM_HEADER = Buffer.from(
  "-----BEGIN PRIVATE KEY-----",
  "ascii",
);
const PKCS8_PRIVATE_KEY_PEM_FOOTER = Buffer.from(
  "-----END PRIVATE KEY-----",
  "ascii",
);

function validateSinglePrivateKeyPem(value: Buffer): void {
  if (
    !Buffer.isBuffer(value) ||
    value.length === 0 ||
    value.length > MAX_PRIVATE_KEY_BYTES ||
    value.some((byte) => byte > 0x7f)
  ) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }
  const lines = collectConsistentAsciiPemLines(value);
  if (lines.length < 3) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }
  const firstLine = lines[0]!;
  const lastLine = lines.at(-1)!;
  const footer = bufferRangeEquals(
    value,
    firstLine.start,
    firstLine.end,
    EC_PRIVATE_KEY_PEM_HEADER,
  )
    ? EC_PRIVATE_KEY_PEM_FOOTER
    : bufferRangeEquals(
          value,
          firstLine.start,
          firstLine.end,
          PKCS8_PRIVATE_KEY_PEM_HEADER,
        )
      ? PKCS8_PRIVATE_KEY_PEM_FOOTER
      : null;
  if (
    !footer ||
    !bufferRangeEquals(
      value,
      lastLine.start,
      lastLine.end,
      footer,
    )
  ) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }
  const bodyLines = lines.slice(1, -1);
  let encodedLength = 0;
  for (let lineIndex = 0; lineIndex < bodyLines.length; lineIndex += 1) {
    const line = bodyLines[lineIndex]!;
    const lineLength = line.end - line.start;
    if (lineLength < 1 || lineLength > 64) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
    for (let offset = line.start; offset < line.end; offset += 1) {
      const byte = value[offset]!;
      const isPadding = byte === 0x3d;
      if (
        (base64Value(byte) < 0 && !isPadding) ||
        (isPadding &&
          (lineIndex !== bodyLines.length - 1 ||
            offset < line.end - 2))
      ) {
        throw new Error("ZATCA SDK CSR private key rejected.");
      }
    }
    encodedLength += lineLength;
  }
  if (
    bodyLines.length === 0 ||
    encodedLength === 0 ||
    encodedLength % 4 !== 0 ||
    encodedLength > MAX_PRIVATE_KEY_BYTES
  ) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }

  const encoded = Buffer.alloc(encodedLength);
  let der: Buffer | undefined;
  try {
    let encodedOffset = 0;
    for (const line of bodyLines) {
      value.copy(
        encoded,
        encodedOffset,
        line.start,
        line.end,
      );
      encodedOffset += line.end - line.start;
    }
    der = decodeCanonicalBase64(encoded);
    if (der.length === 0 || der.length > MAX_PRIVATE_KEY_BYTES) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
    assertExactDerSequence(der);
  } finally {
    encoded.fill(0);
    der?.fill(0);
  }
}

function collectConsistentAsciiPemLines(
  value: Buffer,
): Array<{ start: number; end: number }> {
  const lines: Array<{ start: number; end: number }> = [];
  let lineStart = 0;
  let expectedLineEndingBytes = 0;
  let index = 0;
  while (index < value.length) {
    const byte = value[index]!;
    let lineEndingBytes = 0;
    if (byte === 0x0a) {
      lineEndingBytes = 1;
    } else if (byte === 0x0d) {
      if (value[index + 1] !== 0x0a) {
        throw new Error("ZATCA SDK CSR private key rejected.");
      }
      lineEndingBytes = 2;
    }
    if (lineEndingBytes === 0) {
      index += 1;
      continue;
    }
    if (
      expectedLineEndingBytes !== 0 &&
      expectedLineEndingBytes !== lineEndingBytes
    ) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
    expectedLineEndingBytes = lineEndingBytes;
    lines.push({ start: lineStart, end: index });
    index += lineEndingBytes;
    lineStart = index;
  }
  if (lineStart < value.length) {
    lines.push({ start: lineStart, end: value.length });
  }
  return lines;
}

function bufferRangeEquals(
  value: Buffer,
  start: number,
  end: number,
  expected: Buffer,
): boolean {
  if (end - start !== expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    if (value[start + index] !== expected[index]) return false;
  }
  return true;
}

function base64Value(byte: number): number {
  if (byte >= 0x41 && byte <= 0x5a) return byte - 0x41;
  if (byte >= 0x61 && byte <= 0x7a) return byte - 0x61 + 26;
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30 + 52;
  if (byte === 0x2b) return 62;
  if (byte === 0x2f) return 63;
  return -1;
}

function decodeCanonicalBase64(encoded: Buffer): Buffer {
  const paddingBytes =
    encoded.at(-1) === 0x3d
      ? encoded.at(-2) === 0x3d
        ? 2
        : 1
      : 0;
  const decoded = Buffer.alloc(
    (encoded.length / 4) * 3 - paddingBytes,
  );
  let outputOffset = 0;
  try {
    for (let index = 0; index < encoded.length; index += 4) {
      const finalQuartet = index + 4 === encoded.length;
      const first = base64Value(encoded[index]!);
      const second = base64Value(encoded[index + 1]!);
      const thirdByte = encoded[index + 2]!;
      const fourthByte = encoded[index + 3]!;
      const third = base64Value(thirdByte);
      const fourth = base64Value(fourthByte);
      if (first < 0 || second < 0) {
        throw new Error("ZATCA SDK CSR private key rejected.");
      }
      decoded[outputOffset] = (first << 2) | (second >> 4);
      outputOffset += 1;
      if (thirdByte === 0x3d) {
        if (
          !finalQuartet ||
          fourthByte !== 0x3d ||
          (second & 0x0f) !== 0
        ) {
          throw new Error("ZATCA SDK CSR private key rejected.");
        }
        continue;
      }
      if (third < 0) {
        throw new Error("ZATCA SDK CSR private key rejected.");
      }
      decoded[outputOffset] =
        ((second & 0x0f) << 4) | (third >> 2);
      outputOffset += 1;
      if (fourthByte === 0x3d) {
        if (!finalQuartet || (third & 0x03) !== 0) {
          throw new Error("ZATCA SDK CSR private key rejected.");
        }
        continue;
      }
      if (fourth < 0) {
        throw new Error("ZATCA SDK CSR private key rejected.");
      }
      decoded[outputOffset] =
        ((third & 0x03) << 6) | fourth;
      outputOffset += 1;
    }
    if (outputOffset !== decoded.length) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
    return decoded;
  } catch (error) {
    decoded.fill(0);
    throw error;
  }
}

function assertExactDerSequence(value: Buffer): void {
  if (value.length < 2 || value[0] !== 0x30) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }
  const firstLength = value[1]!;
  let headerBytes = 2;
  let contentBytes: number;
  if ((firstLength & 0x80) === 0) {
    contentBytes = firstLength;
  } else {
    const lengthBytes = firstLength & 0x7f;
    if (
      lengthBytes === 0 ||
      lengthBytes > 4 ||
      value.length < 2 + lengthBytes ||
      value[2] === 0
    ) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
    headerBytes += lengthBytes;
    contentBytes = 0;
    for (let index = 0; index < lengthBytes; index += 1) {
      contentBytes =
        contentBytes * 256 + value[2 + index]!;
    }
    if (contentBytes < 128) {
      throw new Error("ZATCA SDK CSR private key rejected.");
    }
  }
  if (
    !Number.isSafeInteger(contentBytes) ||
    headerBytes + contentBytes !== value.length
  ) {
    throw new Error("ZATCA SDK CSR private key rejected.");
  }
}

async function captureBoundedProcess(
  command: string,
  arguments_: readonly string[],
  options: {
    cwd: string;
    environment: Readonly<Record<string, string>>;
    maxOutputBytes: number;
    timeoutMs: number;
    spawnProcess: SandboxSdkCsrRuntimeSpawn;
  },
): Promise<CapturedProcessResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    let child: ChildProcessLike;
    let settled = false;
    let failureRequested = false;
    let total = 0;
    const chunks: Buffer[] = [];
    let timeoutTimer: NodeJS.Timeout | undefined;
    let terminationTimer: NodeJS.Timeout | undefined;
    const clearTimers = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (terminationTimer) clearTimeout(terminationTimer);
    };
    const zeroChunks = () => {
      for (const chunk of chunks) chunk.fill(0);
    };
    const finishFailure = (terminationConfirmed: boolean) => {
      if (settled) return;
      settled = true;
      clearTimers();
      zeroChunks();
      rejectPromise(
        terminationConfirmed
          ? new Error("ZATCA SDK CSR runtime process failed.")
          : new UnconfirmedProcessTerminationError(),
      );
    };
    const requestTermination = () => {
      if (settled || failureRequested) return;
      failureRequested = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // A close event may still confirm that no child remains.
      }
      terminationTimer = setTimeout(
        () => finishFailure(false),
        CHILD_TERMINATION_GRACE_MS,
      );
    };
    const consume = (chunk: unknown) => {
      const copy = Buffer.from(chunk as Uint8Array);
      total = boundedAdd(total, copy.length);
      if (total > options.maxOutputBytes) {
        copy.fill(0);
        requestTermination();
        return;
      }
      chunks.push(copy);
    };
    try {
      child = options.spawnProcess(command, arguments_, {
        cwd: options.cwd,
        env: { ...options.environment },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      rejectPromise(
        new Error("ZATCA SDK CSR runtime process failed."),
      );
      return;
    }
    child.stdout?.on("data", consume);
    child.stderr?.on("data", consume);
    child.stdout?.once("error", requestTermination);
    child.stderr?.once("error", requestTermination);
    child.once("error", requestTermination);
    child.once("close", (exitCode, signal) => {
      if (settled) return;
      if (failureRequested) {
        finishFailure(true);
        return;
      }
      settled = true;
      clearTimers();
      const combined = Buffer.concat(chunks);
      zeroChunks();
      resolvePromise({
        exitCode:
          typeof exitCode === "number" ? exitCode : null,
        signal: typeof signal === "string" ? signal : null,
        combined,
      });
    });
    timeoutTimer = setTimeout(
      requestTermination,
      options.timeoutMs,
    );
  });
}

async function fingerprintStableRegularFile(
  path: string,
  minimumBytes: number,
  maximumBytes: number,
): Promise<FileCleanupExpectation> {
  const before = await assertCanonicalRegularFile(
    path,
    minimumBytes,
    maximumBytes,
  );
  const noFollow =
    typeof fsConstants.O_NOFOLLOW === "number"
      ? fsConstants.O_NOFOLLOW
      : 0;
  const handle = await open(
    path,
    fsConstants.O_RDONLY | noFollow,
  );
  const chunk = Buffer.alloc(64 * 1024);
  try {
    const opened = await handle.stat();
    assertStableFileSnapshot(
      before,
      opened,
      minimumBytes,
      maximumBytes,
    );
    const digest = createHash("sha256");
    let offset = 0;
    while (offset < opened.size) {
      const count = Math.min(chunk.length, opened.size - offset);
      const read = await handle.read(chunk, 0, count, offset);
      if (read.bytesRead !== count) {
        throw new Error("ZATCA SDK CSR runtime artifact changed.");
      }
      digest.update(chunk.subarray(0, read.bytesRead));
      chunk.fill(0, 0, read.bytesRead);
      offset += read.bytesRead;
    }
    const overflow = await handle.read(chunk, 0, 1, offset);
    if (overflow.bytesRead !== 0) {
      throw new Error("ZATCA SDK CSR runtime artifact changed.");
    }
    const after = await handle.stat();
    assertStableFileSnapshot(
      opened,
      after,
      minimumBytes,
      maximumBytes,
    );
    return {
      byteLength: opened.size,
      sha256: digest.digest("hex").toUpperCase(),
    };
  } finally {
    chunk.fill(0);
    await handle.close();
  }
}

async function sha256File(path: string): Promise<string> {
  return (
    await fingerprintStableRegularFile(
      path,
      1,
      256 * 1024 * 1024,
    )
  ).sha256;
}

function placeholderInput(
  environment: Readonly<Record<string, string | undefined>>,
  cliFlags: readonly string[],
): SandboxSdkCsrOracleInput {
  return {
    environment,
    cliFlags,
    paths: {
      javaHome: "UNAVAILABLE",
      javaBin: "UNAVAILABLE",
      sdkJarPath: "UNAVAILABLE",
      sdkConfigPath: "UNAVAILABLE",
      systemRoot: "UNAVAILABLE",
      windowsDirectory: "UNAVAILABLE",
      comSpec: "UNAVAILABLE",
      pathExt: "UNAVAILABLE",
    },
    csrConfiguration: "",
  };
}

function throwingDependencies(): SandboxSdkCsrOracleDependencies {
  const unavailable = async () => {
    throw new Error("External oracle unavailable.");
  };
  return {
    filesystem: {
      createWorkspace: unavailable,
      stagePinnedJar: unavailable,
      stagePinnedConfig: unavailable,
      writePrivateFile: unavailable,
      readPrivateFile: unavailable,
      removeFile: unavailable,
      removeDirectory: unavailable,
    },
    process: { execute: unavailable },
    inspector: {
      inspectRuntime: unavailable,
      inspectStagedJar: unavailable,
      inspectStagedConfig: unavailable,
      inspectSourceJarAfterRun: unavailable,
      inspectSourceConfigAfterRun: unavailable,
      inspectArtifacts: unavailable,
    },
    custody: {
      storePrivateKey: unavailable,
      verifyPublicKey: unavailable,
      deleteReference: unavailable,
      listDisposableMetadata: unavailable,
    },
  } as unknown as SandboxSdkCsrOracleDependencies;
}

function safeRuntimeFailure(
  code:
    | "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED"
    | "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED",
  terminationUnconfirmed = false,
): SandboxSdkCsrOracleResult {
  return {
    status: "FAILED",
    phase: "PREFLIGHT",
    safeErrorCodes: terminationUnconfirmed
      ? [
          code,
          "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
        ]
      : [code],
    evidence: null,
    state: {
      workspaceCreated: false,
      processExecuted: false,
      artifactsInspected: false,
      custodyStored: false,
      custodyVerified: false,
      custodyDeleted: false,
      cleanupAttempted: false,
    },
  };
}

function cliOptionsToFlags(
  options: SandboxSdkCsrOracleCliOptions,
): readonly string[] {
  return options.simulation &&
    options.noNetwork &&
    options.metadataJson
    ? [...OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS]
    : [];
}

export function resolveSafeLocalAbsolutePath(
  value: string | undefined,
): string {
  if (
    !value ||
    value !== value.trim() ||
    value.includes("\0") ||
    /^(?:\\\\|\/\/)/u.test(value) ||
    (process.platform === "win32" &&
      !/^[A-Za-z]:[\\/]/u.test(value)) ||
    !isAbsolute(value)
  ) {
    throw new Error("ZATCA SDK CSR runtime path rejected.");
  }
  const resolved = resolve(value);
  if (/^(?:\\\\|\/\/)/u.test(resolved)) {
    throw new Error("ZATCA SDK CSR runtime path rejected.");
  }
  return resolved;
}

function requiredSafeScalar(value: string | undefined): string {
  if (
    !value ||
    value !== value.trim() ||
    !/^[A-Za-z0-9_. -]{1,128}$/u.test(value)
  ) {
    throw new Error("ZATCA SDK CSR runtime value rejected.");
  }
  return value;
}

function safeAbsolutePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    !value.includes("\0") &&
    isAbsolute(value)
  );
}

function assertOwnedWorkspaceChild(
  workspace: string | null,
  path: string,
  expectedName: string,
): void {
  if (
    !workspace ||
    basename(path) !== expectedName ||
    dirname(resolve(path)).toLowerCase() !==
      resolve(workspace).toLowerCase()
  ) {
    throw new Error("ZATCA SDK CSR workspace path rejected.");
  }
}

function assertExactPath(actual: string, expected: string): void {
  if (resolve(actual).toLowerCase() !== resolve(expected).toLowerCase()) {
    throw new Error("ZATCA SDK CSR runtime path mismatch.");
  }
}

function assertPathWithin(
  root: string,
  candidate: string,
  allowRoot: boolean,
): void {
  const relation = relative(resolve(root), resolve(candidate));
  if (
    (!allowRoot && relation === "") ||
    relation.startsWith("..") ||
    isAbsolute(relation)
  ) {
    throw new Error("ZATCA SDK CSR cleanup path rejected.");
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relation = relative(resolve(root), resolve(candidate));
  return (
    relation === "" ||
    (!relation.startsWith("..") && !isAbsolute(relation))
  );
}

function boundedAdd(left: number, right: number): number {
  const result = left + right;
  return Number.isSafeInteger(result)
    ? result
    : Number.MAX_SAFE_INTEGER;
}

const defaultSpawn: SandboxSdkCsrRuntimeSpawn = (
  command,
  arguments_,
  options,
) =>
  spawn(command, [...arguments_], {
    cwd: options.cwd as string,
    env: options.env as NodeJS.ProcessEnv,
    shell: false,
    windowsHide: true,
    stdio: options.stdio as [
      "ignore" | "pipe",
      "pipe",
      "pipe",
    ],
  }) as ChildProcessLike;
