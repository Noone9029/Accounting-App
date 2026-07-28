import { join } from "node:path";
import {
  OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS,
  OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE,
  OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
  OFFICIAL_ZATCA_SDK_JAR_SHA256,
  OFFICIAL_ZATCA_SDK_JAVA_VERSION,
  OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE,
  OFFICIAL_ZATCA_SDK_VERSION,
  OFFICIAL_SYNTHETIC_CSR_CONFIGURATION,
  runSandboxSdkCsrOracle,
  type SandboxSdkCsrOracleDependencies,
  type SandboxSdkCsrOracleInput,
} from "./sandbox-sdk-csr-oracle";

function oracleInput(
  overrides: Partial<SandboxSdkCsrOracleInput> = {},
): SandboxSdkCsrOracleInput {
  return {
    environment: {
      [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "true",
    },
    cliFlags: [...OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS],
    paths: {
      javaHome: "C:\\jdk11",
      javaBin: "C:\\jdk11\\bin\\java.exe",
      sdkJarPath:
        "C:\\zatca-sdk\\Apps\\zatca-einvoicing-sdk-238-R3.4.8.jar",
      sdkConfigPath: "C:\\zatca-sdk\\Configuration\\config.json",
      systemRoot: "C:\\Windows",
      windowsDirectory: "C:\\Windows",
      comSpec: "C:\\Windows\\System32\\cmd.exe",
      pathExt: ".COM;.EXE;.BAT;.CMD",
    },
    csrConfiguration: OFFICIAL_SYNTHETIC_CSR_CONFIGURATION,
    ...overrides,
  };
}

function successfulDependencies(): SandboxSdkCsrOracleDependencies {
  const privateKey = Buffer.from("synthetic-private-key", "utf8");
  const csr = Buffer.from("synthetic-csr", "utf8");

  return {
    filesystem: {
      createWorkspace: jest.fn(async () => "C:\\safe-temp\\oracle"),
      stagePinnedJar: jest.fn(async () => undefined),
      stagePinnedConfig: jest.fn(async () => undefined),
      writePrivateFile: jest.fn(async () => undefined),
      readPrivateFile: jest.fn(async (path: string) =>
        path.endsWith("generated-private-key.pem")
          ? Buffer.from(privateKey)
          : Buffer.from(csr),
      ),
      removeFile: jest.fn(async () => true),
      removeDirectory: jest.fn(async () => true),
    },
    process: {
      execute: jest.fn(async () => ({
        exitCode: 0,
        signal: null,
        timedOut: false,
        outputLimitExceeded: false,
        stdoutBytes: 0,
        stderrBytes: 0,
        terminationConfirmed: true,
        rawOutputCleared: true,
        networkIsolationVerified: true,
        networkCallsMade: false as const,
      })),
    },
    inspector: {
      inspectRuntime: jest.fn(async () => ({
        jdkVersion: OFFICIAL_ZATCA_SDK_JAVA_VERSION,
        jdkRuntimeChecksumsVerified: true,
        sdkVersion: OFFICIAL_ZATCA_SDK_VERSION,
        sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
        sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
        networkGuardMarkersPresent: true,
      })),
      inspectStagedJar: jest.fn(async () => ({
        sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      })),
      inspectStagedConfig: jest.fn(async () => ({
        sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
      })),
      inspectSourceJarAfterRun: jest.fn(async () => ({
        sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      })),
      inspectSourceConfigAfterRun: jest.fn(async () => ({
        sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
      })),
      inspectArtifacts: jest.fn(async () => ({
        csrAlgorithm: "ECDSA_SHA256" as const,
        csrAlgorithmVerified: true,
        csrCurve: "secp256k1" as const,
        csrCurveVerified: true,
        csrSignatureVerified: true,
        csrSubjectVerified: true,
        requestedExtensionsVerified: true,
        csrTemplate: "PREZATCA-Code-Signing" as const,
        csrTemplateVerified: true,
        privateKeyMatchesCsr: true,
        publicKeySha256: "a".repeat(64),
      })),
    },
    custody: {
      storePrivateKey: jest.fn(async () => undefined),
      verifyPublicKey: jest.fn(async () => true),
      deleteReference: jest.fn(async () => undefined),
      listDisposableMetadata: jest.fn(async () => []),
    },
  };
}

function allDependencyMocks(
  dependencies: SandboxSdkCsrOracleDependencies,
): jest.Mock[] {
  return [
    dependencies.filesystem.createWorkspace,
    dependencies.filesystem.stagePinnedJar,
    dependencies.filesystem.stagePinnedConfig,
    dependencies.filesystem.writePrivateFile,
    dependencies.filesystem.readPrivateFile,
    dependencies.filesystem.removeFile,
    dependencies.filesystem.removeDirectory,
    dependencies.process.execute,
    dependencies.inspector.inspectRuntime,
    dependencies.inspector.inspectStagedJar,
    dependencies.inspector.inspectStagedConfig,
    dependencies.inspector.inspectSourceJarAfterRun,
    dependencies.inspector.inspectSourceConfigAfterRun,
    dependencies.inspector.inspectArtifacts,
    dependencies.custody.storePrivateKey,
    dependencies.custody.verifyPublicKey,
    dependencies.custody.deleteReference,
    dependencies.custody.listDisposableMetadata,
  ] as jest.Mock[];
}

describe("sandbox official-SDK CSR oracle core", () => {
  it("confines SDK file writes and deletes to the disposable workspace and self-tests the boundary", () => {
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "import java.io.FilePermission;",
      );
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "import java.io.FileOutputStream;",
      );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "checkWrite(String file)",
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "checkDelete(String file)",
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "permission instanceof FilePermission",
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      'permission.getActions()',
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      '"<<ALL FILES>>"',
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "outsideWorkspaceWriteDenied",
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "outsideWorkspaceFilePermissionDenied",
    );
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "outsideWorkspace.exists()",
      );
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "new FileOutputStream(outsideWorkspace)",
      );
      expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
        "candidate.toPath().startsWith(writableRoot.toPath())",
      );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "subprocessDenied",
    );
    expect(OFFICIAL_SDK_NO_NETWORK_LAUNCHER_SOURCE).toContain(
      "socketDenied",
    );
  });

  it("returns the normal-CI skip result without invoking any injected seam", async () => {
    const dependencies = successfulDependencies();
    const result = await runSandboxSdkCsrOracle(
      oracleInput({
        environment: {},
        cliFlags: ["--unsafe-and-ignored-while-disabled"],
      }),
      dependencies,
    );

    expect(result).toEqual({
      status: "SKIPPED_EXTERNAL_ORACLE",
      phase: "SKIPPED",
      safeErrorCodes: [],
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
    });
    for (const dependency of allDependencyMocks(dependencies)) {
      expect(dependency).not.toHaveBeenCalled();
    }
  });

  it("requires the exact case-sensitive execution gate", async () => {
    const dependencies = successfulDependencies();
    const result = await runSandboxSdkCsrOracle(
      oracleInput({
        environment: {
          [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "TRUE",
        },
      }),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.phase).toBe("PREFLIGHT");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_GATE_INVALID",
    ]);
    expect(result.evidence).toBeNull();
    for (const dependency of allDependencyMocks(dependencies)) {
      expect(dependency).not.toHaveBeenCalled();
    }
  });

  it.each([
    [["--no-network", "--simulation", "--metadata-json"]],
    [["--simulation", "--no-network"]],
    [[...OFFICIAL_ZATCA_SDK_CSR_ORACLE_CLI_FLAGS, "--extra"]],
  ])("rejects a non-exact CLI-mode flag sequence: %j", async (cliFlags) => {
    const dependencies = successfulDependencies();
    const result = await runSandboxSdkCsrOracle(
      oracleInput({ cliFlags }),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_CLI_MODE_INVALID",
    ]);
    for (const dependency of allDependencyMocks(dependencies)) {
      expect(dependency).not.toHaveBeenCalled();
    }
  });

  it.each([
    OFFICIAL_SYNTHETIC_CSR_CONFIGURATION.replace(
      "csr.organization.name=Synthetic LedgerByte Taxpayer\n",
      "",
    ),
    `${OFFICIAL_SYNTHETIC_CSR_CONFIGURATION}csr.extra=https://example.test\n`,
    OFFICIAL_SYNTHETIC_CSR_CONFIGURATION.replace(
      "csr.invoice.type=1100\n",
      "csr.invoice.type=1100\ncsr.invoice.type=1100\n",
    ),
  ])("rejects non-canonical CSR configuration before any seam call", async (csrConfiguration) => {
    const dependencies = successfulDependencies();
    const result = await runSandboxSdkCsrOracle(
      oracleInput({ csrConfiguration }),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_INPUT_INVALID",
    ]);
    for (const dependency of allDependencyMocks(dependencies)) {
      expect(dependency).not.toHaveBeenCalled();
    }
  });

  it("builds only the exact Simulation CSR arguments and a scrubbed bounded process request", async () => {
    const dependencies = successfulDependencies();
    const result = await runSandboxSdkCsrOracle(
      oracleInput({
        environment: {
          [OFFICIAL_ZATCA_SDK_CSR_ORACLE_GATE]: "true",
          DATABASE_URL: "must-not-leak",
          ZATCA_OTP: "must-not-leak",
          PATH: "must-not-be-inherited",
        },
      }),
      dependencies,
    );

    const workspace = "C:\\safe-temp\\oracle";
    const configPath = join(workspace, "csr-config.properties");
    const privateKeyPath = join(workspace, "generated-private-key.pem");
    const csrPath = join(workspace, "generated.csr");
    const stagedJarPath = join(
      workspace,
      "zatca-einvoicing-sdk-238-R3.4.8.jar",
    );
    const stagedSdkConfigPath = join(workspace, "sdk-config.json");

    expect(dependencies.filesystem.stagePinnedJar).toHaveBeenCalledWith(
      "C:\\zatca-sdk\\Apps\\zatca-einvoicing-sdk-238-R3.4.8.jar",
      stagedJarPath,
    );
    expect(dependencies.filesystem.stagePinnedConfig).toHaveBeenCalledWith(
      "C:\\zatca-sdk\\Configuration\\config.json",
      stagedSdkConfigPath,
    );
    expect(dependencies.process.execute).toHaveBeenCalledWith({
      command: "C:\\jdk11\\bin\\java.exe",
      arguments: [
        "-XX:-UsePerfData",
        expect.stringMatching(/LedgerByteNoNetworkSdkLauncher\.java$/u),
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
        ComSpec: "C:\\Windows\\System32\\cmd.exe",
        JAVA_HOME: "C:\\jdk11",
        PATH: "C:\\jdk11\\bin",
        PATHEXT: ".COM;.EXE;.BAT;.CMD",
        SDK_CONFIG: stagedSdkConfigPath,
        SystemRoot: "C:\\Windows",
        TEMP: workspace,
        TMP: workspace,
        WINDIR: "C:\\Windows",
        ZATCA_SDK_JAVA_BIN: "C:\\jdk11\\bin\\java.exe",
      },
      stdin: "ignore",
      shell: false,
      windowsHide: true,
      timeoutMs: 30_000,
      maxOutputBytes: 65_536,
    });
    expect(dependencies.filesystem.writePrivateFile).toHaveBeenCalledTimes(2);
    expect(dependencies.filesystem.writePrivateFile).toHaveBeenCalledWith(
      configPath,
      expect.any(Buffer),
      0o600,
    );
    expect(result.status).toBe("PASSED");
    expect(result.phase).toBe("COMPLETE");
    expect(result.safeErrorCodes).toEqual([]);
    expect(result.state).toEqual({
      workspaceCreated: true,
      processExecuted: true,
      artifactsInspected: true,
      custodyStored: true,
      custodyVerified: true,
      custodyDeleted: true,
      cleanupAttempted: true,
    });
    expect(result.evidence).toEqual({
      arc: "ARC-07B-06H",
      status: "PASSED",
      officialSdkTier2Executed: true,
      jdkVersion: "11.0.26",
      sdkVersion: "238-R3.4.8",
      sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      sdkChecksumMatch: true,
      sdkConfigChecksumMatch: true,
      jdkRuntimeChecksumsVerified: true,
      simulationFlagVerified: true,
      noNetworkArgumentVerified: true,
      argumentAllowlistVerified: true,
      csrSignatureVerified: true,
      csrAlgorithm: "ECDSA_SHA256",
      csrAlgorithmVerified: true,
      csrCurve: "secp256k1",
      csrCurveVerified: true,
      csrSubjectVerified: true,
      requestedExtensionsVerified: true,
      csrTemplate: "PREZATCA-Code-Signing",
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
    expect(JSON.stringify(result)).not.toMatch(
      /must-not-leak|synthetic-private-key|synthetic-csr|opaque-disposable-reference/iu,
    );
  });

  it("fails closed before filesystem/process/custody use when a runtime pin drifts", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectRuntime as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectRuntime"]
      >
    ).mockResolvedValue({
      jdkVersion: "17.0.16",
      jdkRuntimeChecksumsVerified: true,
      sdkVersion: OFFICIAL_ZATCA_SDK_VERSION,
      sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
      networkGuardMarkersPresent: true,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_JDK_PIN_MISMATCH",
    ]);
    expect(dependencies.inspector.inspectRuntime).toHaveBeenCalledTimes(1);
    expect(dependencies.filesystem.createWorkspace).not.toHaveBeenCalled();
    expect(dependencies.process.execute).not.toHaveBeenCalled();
    expect(dependencies.custody.storePrivateKey).not.toHaveBeenCalled();
  });

  it("fails closed when pinned JDK runtime checksums are unverified", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectRuntime as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectRuntime"]
      >
    ).mockResolvedValue({
      jdkVersion: OFFICIAL_ZATCA_SDK_JAVA_VERSION,
      jdkRuntimeChecksumsVerified: false,
      sdkVersion: OFFICIAL_ZATCA_SDK_VERSION,
      sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
      networkGuardMarkersPresent: true,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_JDK_PIN_MISMATCH",
    ]);
    expect(dependencies.filesystem.createWorkspace).not.toHaveBeenCalled();
    expect(dependencies.process.execute).not.toHaveBeenCalled();
  });

  it("returns a safe preflight failure for a malformed runtime-inspector result", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectRuntime as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectRuntime"]
      >
    ).mockResolvedValue({} as never);

    await expect(
      runSandboxSdkCsrOracle(oracleInput(), dependencies),
    ).resolves.toMatchObject({
      status: "FAILED",
      phase: "PREFLIGHT",
      safeErrorCodes: [
        "ZATCA_SDK_CSR_ORACLE_RUNTIME_INSPECTION_FAILED",
      ],
      evidence: null,
    });
    expect(dependencies.filesystem.createWorkspace).not.toHaveBeenCalled();
  });

  it("rechecks the staged JAR and refuses process execution on copy drift", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectStagedJar as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectStagedJar"]
      >
    ).mockResolvedValue({ sdkJarSha256: "0".repeat(64) });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_SDK_CHECKSUM_MISMATCH",
    ]);
    expect(dependencies.filesystem.stagePinnedJar).toHaveBeenCalledTimes(1);
    expect(dependencies.process.execute).not.toHaveBeenCalled();
    expect(dependencies.filesystem.removeFile).toHaveBeenCalledTimes(6);
    expect(dependencies.filesystem.removeDirectory).toHaveBeenCalledTimes(1);
  });

  it("rechecks the staged SDK config and refuses process execution on copy drift", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectStagedConfig as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectStagedConfig"]
      >
    ).mockResolvedValue({ sdkConfigSha256: "0".repeat(64) });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_SDK_CONFIG_CHECKSUM_MISMATCH",
    ]);
    expect(
      dependencies.filesystem.stagePinnedConfig,
    ).toHaveBeenCalledTimes(1);
    expect(dependencies.process.execute).not.toHaveBeenCalled();
    expect(dependencies.filesystem.removeFile).toHaveBeenCalledTimes(6);
    expect(dependencies.filesystem.removeDirectory).toHaveBeenCalledTimes(1);
  });

  it("does not claim no-network execution when the reviewed command/import graph is unverified", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector.inspectRuntime as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectRuntime"]
      >
    ).mockResolvedValue({
      jdkVersion: OFFICIAL_ZATCA_SDK_JAVA_VERSION,
      jdkRuntimeChecksumsVerified: true,
      sdkVersion: OFFICIAL_ZATCA_SDK_VERSION,
      sdkJarSha256: OFFICIAL_ZATCA_SDK_JAR_SHA256,
      sdkConfigSha256: OFFICIAL_ZATCA_SDK_CONFIG_SHA256,
      networkGuardMarkersPresent: false,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.evidence).toBeNull();
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_NETWORK_GUARD_SOURCE_UNVERIFIED",
    ]);
    expect(dependencies.filesystem.createWorkspace).not.toHaveBeenCalled();
    expect(dependencies.process.execute).not.toHaveBeenCalled();
  });

  it("treats a timeout as failure and still removes every owned workspace artifact", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.process.execute as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["process"]["execute"]
      >
    ).mockResolvedValue({
      exitCode: null,
      signal: "SIGTERM",
      timedOut: true,
      outputLimitExceeded: false,
      stdoutBytes: 0,
      stderrBytes: 0,
      terminationConfirmed: true,
      rawOutputCleared: true,
      networkIsolationVerified: true,
      networkCallsMade: false,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TIMEOUT",
    ]);
    expect(dependencies.inspector.inspectArtifacts).not.toHaveBeenCalled();
    expect(dependencies.custody.storePrivateKey).not.toHaveBeenCalled();
    expect(dependencies.filesystem.removeFile).toHaveBeenCalledTimes(6);
    expect(dependencies.filesystem.removeDirectory).toHaveBeenCalledTimes(1);
    expect(result.state.cleanupAttempted).toBe(true);
    expect(result.evidence).toMatchObject({
      status: "FAILED",
      officialSdkTier2Executed: true,
      cleanupComplete: true,
      networkCallsMade: false,
    });
  });

  it("classifies unconfirmed process termination distinctly and never produces passing evidence", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.process.execute as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["process"]["execute"]
      >
    ).mockResolvedValue({
      exitCode: null,
      signal: null,
      timedOut: true,
      outputLimitExceeded: false,
      stdoutBytes: 0,
      stderrBytes: 0,
      terminationConfirmed: false,
      rawOutputCleared: true,
      networkIsolationVerified: true,
      networkCallsMade: false,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TERMINATION_UNCONFIRMED",
    );
    expect(result.safeErrorCodes).not.toContain(
      "ZATCA_SDK_CSR_ORACLE_PROCESS_TIMEOUT",
    );
    expect(result.evidence?.status).toBe("FAILED");
  });

  it("rejects combined stdout/stderr metadata above the 64 KiB ceiling", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.process.execute as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["process"]["execute"]
      >
    ).mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      outputLimitExceeded: false,
      stdoutBytes: 40_000,
      stderrBytes: 30_000,
      terminationConfirmed: true,
      rawOutputCleared: true,
      networkIsolationVerified: true,
      networkCallsMade: false,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_PROCESS_OUTPUT_LIMIT",
    ]);
    expect(dependencies.inspector.inspectArtifacts).not.toHaveBeenCalled();
    expect(dependencies.custody.storePrivateKey).not.toHaveBeenCalled();
    expect(result.evidence).toMatchObject({
      status: "FAILED",
      cleanupComplete: true,
    });
  });

  it("rolls back disposable custody and files when the custody public key does not match", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.custody.verifyPublicKey as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["custody"]["verifyPublicKey"]
      >
    ).mockResolvedValue(false);

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_CUSTODY_KEY_MISMATCH",
    );
    expect(dependencies.custody.deleteReference).toHaveBeenCalledWith(
      "arc-07b-06h-sdk-csr-private-key",
    );
    expect(dependencies.custody.listDisposableMetadata).toHaveBeenCalled();
    expect(result.state.custodyDeleted).toBe(true);
    expect(result.evidence).toMatchObject({
      status: "FAILED",
      privateKeyMatchesCsr: true,
      custodyPublicKeyMatchesCsr: false,
      disposableCustodyMetadataEmpty: true,
      cleanupComplete: true,
    });
  });

  it("zeroes the key buffer and removes its file before custody verification", async () => {
    const dependencies = successfulDependencies();
    const privateKeyPath = join(
      "C:\\safe-temp\\oracle",
      "generated-private-key.pem",
    );
    let storedPrivateKey: Buffer | undefined;
    let plaintextKeyFileRemoved = false;
    (
      dependencies.filesystem.removeFile as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["filesystem"]["removeFile"]
      >
    ).mockImplementation(async (path) => {
      if (path === privateKeyPath) {
        plaintextKeyFileRemoved = true;
      }
      return true;
    });
    (
      dependencies.custody.storePrivateKey as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["custody"]["storePrivateKey"]
      >
    ).mockImplementation(async (input) => {
      storedPrivateKey = input.privateKey;
      expect(storedPrivateKey.some((byte) => byte !== 0)).toBe(true);
    });
    (
      dependencies.custody.verifyPublicKey as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["custody"]["verifyPublicKey"]
      >
    ).mockImplementation(async () => {
      expect(storedPrivateKey).toBeDefined();
      expect(storedPrivateKey?.every((byte) => byte === 0)).toBe(true);
      expect(plaintextKeyFileRemoved).toBe(true);
      expect(dependencies.filesystem.removeFile).toHaveBeenCalledWith(
        privateKeyPath,
      );
      expect(
        (dependencies.filesystem.removeFile as jest.Mock).mock
          .invocationCallOrder[0]!,
      ).toBeLessThan(
        (dependencies.custody.verifyPublicKey as jest.Mock).mock
          .invocationCallOrder[0]!,
      );
      return true;
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("PASSED");
    expect(result.evidence).toMatchObject({
      plaintextKeyRemovedBeforeCustodyVerification: true,
      plaintextKeyFileRemoved: true,
    });
    expect(
      (dependencies.filesystem.removeFile as jest.Mock).mock.calls.filter(
        ([path]) => path === privateKeyPath,
      ),
    ).toHaveLength(1);
  });

  it("does not verify custody when pre-verification plaintext-key removal fails", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.filesystem.removeFile as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["filesystem"]["removeFile"]
      >
    ).mockImplementation(
      async (path) => !path.endsWith("generated-private-key.pem"),
    );

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
    );
    expect(dependencies.custody.verifyPublicKey).not.toHaveBeenCalled();
    expect(dependencies.custody.deleteReference).toHaveBeenCalledWith(
      "arc-07b-06h-sdk-csr-private-key",
    );
    expect(result.state).toMatchObject({
      custodyStored: true,
      custodyVerified: false,
      custodyDeleted: true,
    });
    expect(result.evidence).toMatchObject({
      status: "FAILED",
      plaintextKeyRemovedBeforeCustodyVerification: false,
      plaintextKeyFileRemoved: false,
    });
  });

  it("downgrades an otherwise valid proof when cleanup is incomplete", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.filesystem.removeFile as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["filesystem"]["removeFile"]
      >
    ).mockImplementation(async (path) => !path.endsWith("generated.csr"));

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_SDK_CSR_ORACLE_FILE_CLEANUP_FAILED",
    ]);
    expect(result.evidence).toMatchObject({
      status: "FAILED",
      csrFileRemoved: false,
      cleanupComplete: false,
    });
  });

  it("refuses to claim no-network execution without enforced process isolation", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.process.execute as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["process"]["execute"]
      >
    ).mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      outputLimitExceeded: false,
      stdoutBytes: 0,
      stderrBytes: 0,
      terminationConfirmed: true,
      rawOutputCleared: true,
      networkIsolationVerified: false,
      networkCallsMade: null,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_NETWORK_ISOLATION_FAILED",
    );
    expect(dependencies.inspector.inspectArtifacts).not.toHaveBeenCalled();
  });

  it("fails when captured raw process output was not cleared", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.process.execute as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["process"]["execute"]
      >
    ).mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      outputLimitExceeded: false,
      stdoutBytes: 0,
      stderrBytes: 0,
      terminationConfirmed: true,
      rawOutputCleared: false,
      networkIsolationVerified: true,
      networkCallsMade: false,
    });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_RAW_OUTPUT_CLEANUP_FAILED",
    );
    expect(result.evidence?.rawOutputRemoved).toBe(false);
    expect(result.evidence?.cleanupComplete).toBe(false);
  });

  it("rehashes the source SDK after execution and fails on mutation", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.inspector
        .inspectSourceJarAfterRun as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["inspector"]["inspectSourceJarAfterRun"]
      >
    ).mockResolvedValue({ sdkJarSha256: "0".repeat(64) });

    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_SOURCE_CHECKSUM_CHANGED",
    );
    expect(result.evidence?.sdkChecksumMatch).toBe(false);
    expect(
      dependencies.inspector.inspectSourceJarAfterRun,
    ).toHaveBeenCalledWith(
      "C:\\zatca-sdk\\Apps\\zatca-einvoicing-sdk-238-R3.4.8.jar",
    );
  });

  it("cleans and audits the deterministic custody reference even when storage throws after persistence", async () => {
    const dependencies = successfulDependencies();
    (
      dependencies.custody.storePrivateKey as jest.MockedFunction<
        SandboxSdkCsrOracleDependencies["custody"]["storePrivateKey"]
      >
    ).mockRejectedValue(
      new Error("synthetic post-persistence failure with sensitive detail"),
    );
    const result = await runSandboxSdkCsrOracle(
      oracleInput(),
      dependencies,
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_SDK_CSR_ORACLE_CUSTODY_STORE_FAILED",
    );
    expect(dependencies.custody.deleteReference).toHaveBeenCalledWith(
      "arc-07b-06h-sdk-csr-private-key",
    );
    expect(dependencies.custody.listDisposableMetadata).toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("sensitive detail");
  });
});
