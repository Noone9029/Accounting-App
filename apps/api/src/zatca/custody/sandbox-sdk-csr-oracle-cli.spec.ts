import {
  SandboxSdkCsrOracleCliError,
  parseSandboxSdkCsrOracleCliArguments,
  runSandboxSdkCsrOracleCli,
} from "./sandbox-sdk-csr-oracle-cli";

describe("ZATCA Simulation SDK CSR oracle CLI boundary", () => {
  const requiredArguments = [
    "--simulation",
    "--no-network",
    "--metadata-json",
  ] as const;

  it("accepts exactly the explicit Simulation no-network metadata arguments", () => {
    expect(parseSandboxSdkCsrOracleCliArguments(requiredArguments)).toEqual({
      simulation: true,
      noNetwork: true,
      metadataJson: true,
    });
    expect(
      parseSandboxSdkCsrOracleCliArguments(["--", ...requiredArguments]),
    ).toEqual({
      simulation: true,
      noNetwork: true,
      metadataJson: true,
    });
  });

  const rejectedArgumentSets: string[][] = [
    [],
    ["--simulation", "--no-network"],
    ["--simulation", "--metadata-json"],
    ["--no-network", "--metadata-json"],
    [...requiredArguments, "--simulation"],
    [...requiredArguments, "--production"],
    [...requiredArguments, "--keep-temp-files"],
    [...requiredArguments, "--otp=123456"],
    [...requiredArguments, "--csid=test"],
    [...requiredArguments, "--url=https://example.test"],
    [...requiredArguments, "https://example.test"],
  ];

  const passedMetadata = {
    arc: "ARC-07B-06H",
    status: "PASSED",
    officialSdkTier2Executed: true,
    jdkVersion: "11.0.26",
    sdkVersion: "238-R3.4.8",
    sdkJarSha256:
      "48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530",
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
  } as const;

  it.each(rejectedArgumentSets.map((arguments_) => [arguments_] as const))("rejects unsafe or incomplete arguments %#", (arguments_) => {
    expect(() => parseSandboxSdkCsrOracleCliArguments(arguments_)).toThrow(
      SandboxSdkCsrOracleCliError,
    );
  });

  it("invokes the oracle once and writes only its metadata object", async () => {
    const execute = jest.fn(async () => ({
      arc: "ARC-07B-06H",
      status: "SKIPPED_EXTERNAL_ORACLE",
      officialSdkTier2Executed: false,
      networkCallsMade: false,
      otpUsed: false,
      csidRequested: false,
      productionExecution: false,
      sensitiveBodiesReturned: false,
    }));
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await runSandboxSdkCsrOracleCli(
      requiredArguments,
      execute,
      {
        output: { write: (chunk: string) => output.push(chunk) },
        error: { write: (chunk: string) => error.push(chunk) },
      },
    );

    expect(exitCode).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({
      simulation: true,
      noNetwork: true,
      metadataJson: true,
    });
    expect(error).toEqual([]);
    const parsed = JSON.parse(output.join("")) as Record<string, unknown>;
    expect(parsed.status).toBe("SKIPPED_EXTERNAL_ORACLE");
    expect(output.join("")).not.toMatch(
      /PRIVATE KEY|CERTIFICATE REQUEST|authorization|otp=|https?:\/\//iu,
    );
  });

  it("accepts only the complete exact PASSED evidence schema", async () => {
    const output: string[] = [];
    const error: string[] = [];

    await expect(
      runSandboxSdkCsrOracleCli(
        requiredArguments,
        async () => ({ ...passedMetadata }),
        {
          output: { write: (chunk: string) => output.push(chunk) },
          error: { write: (chunk: string) => error.push(chunk) },
        },
      ),
    ).resolves.toBe(0);

    expect(error).toEqual([]);
    expect(JSON.parse(output.join(""))).toEqual(passedMetadata);
  });

  it.each([
    [
      "missing evidence field",
      Object.fromEntries(
        Object.entries(passedMetadata).filter(
          ([key]) => key !== "cleanupComplete",
        ),
      ),
    ],
    [
      "unexpected safe-looking field",
      { ...passedMetadata, otpValue: "123456" },
    ],
    [
      "false required proof",
      { ...passedMetadata, sdkChecksumMatch: false },
    ],
    [
      "unverified JDK runtime checksums",
      { ...passedMetadata, jdkRuntimeChecksumsVerified: false },
    ],
    [
      "SDK config checksum mismatch",
      { ...passedMetadata, sdkConfigChecksumMatch: false },
    ],
    [
      "false custody destruction order proof",
      {
        ...passedMetadata,
        plaintextKeyRemovedBeforeCustodyVerification: false,
      },
    ],
  ])("rejects %s without emitting partial metadata", async (_label, result) => {
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await runSandboxSdkCsrOracleCli(
      requiredArguments,
      async () => result,
      {
        output: { write: (chunk: string) => output.push(chunk) },
        error: { write: (chunk: string) => error.push(chunk) },
      },
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(error.join("")).toBe("ZATCA_SDK_CSR_ORACLE_FAILED\n");
  });

  it("returns a bounded safe error without invoking the oracle", async () => {
    const execute = jest.fn(async () => ({}));
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await runSandboxSdkCsrOracleCli(
      ["--production", "--no-network", "--metadata-json"],
      execute,
      {
        output: { write: (chunk: string) => output.push(chunk) },
        error: { write: (chunk: string) => error.push(chunk) },
      },
    );

    expect(exitCode).toBe(2);
    expect(execute).not.toHaveBeenCalled();
    expect(output).toEqual([]);
    expect(error.join("")).toBe("ZATCA_SDK_CSR_ARGUMENTS_REJECTED\n");
  });

  it("redacts oracle failures and never prints raw thrown details", async () => {
    const output: string[] = [];
    const error: string[] = [];

    const exitCode = await runSandboxSdkCsrOracleCli(
      requiredArguments,
      async () => {
        throw new Error(
          "PRIVATE KEY body at C:\\Users\\owner\\sdk-generated-private.pem",
        );
      },
      {
        output: { write: (chunk: string) => output.push(chunk) },
        error: { write: (chunk: string) => error.push(chunk) },
      },
    );

    expect(exitCode).toBe(1);
    expect(output).toEqual([]);
    expect(error.join("")).toBe("ZATCA_SDK_CSR_ORACLE_FAILED\n");
  });
});
