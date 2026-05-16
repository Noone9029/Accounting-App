import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isAllowedZatcaFixturePath, ZATCA_SDK_FIXTURE_REGISTRY } from "./zatca-official-fixtures";
import {
  buildZatcaSdkGenerateHashCommand,
  buildZatcaSdkValidationCommand,
  discoverZatcaSdkReadiness,
  parseJavaMajorVersion,
  parseJavaVersion,
  readZatcaSdkExecutionConfig,
  ZATCA_SDK_GENERATE_HASH_COMMAND,
  ZATCA_SDK_REQUIRED_JAVA_RANGE,
  ZATCA_SDK_VALIDATE_COMMAND,
} from "./zatca-sdk-paths";

describe("ZATCA SDK paths", () => {
  it("parses Java versions", () => {
    expect(parseJavaVersion('openjdk version "17.0.16" 2025-07-15')).toBe("17.0.16");
    expect(parseJavaVersion('openjdk version "11.0.26" 2025-01-21 LTS')).toBe("11.0.26");
    expect(parseJavaMajorVersion("17.0.16")).toBe(17);
    expect(parseJavaMajorVersion("14.0.2")).toBe(14);
    expect(parseJavaMajorVersion("15.0.2")).toBe(15);
    expect(parseJavaMajorVersion("1.8.0_402")).toBe(8);
  });

  it("discovers SDK readiness and path-space warnings", () => {
    const root = mkdtempSync(join(tmpdir(), "ledgerbyte path "));
    mkdirSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps"), { recursive: true });
    mkdirSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Configuration"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "fatoora.bat"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "jq.exe"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Configuration", "config.json"), "{}");

    const readiness = discoverZatcaSdkReadiness({
      projectRoot: root,
      platform: "win32",
      env: { ZATCA_SDK_EXECUTION_ENABLED: "true" },
      runCommand: () => ({ status: 0, stderr: 'openjdk version "17.0.16" 2025-07-15' }),
    });

    expect(readiness.enabled).toBe(true);
    expect(readiness.referenceFolderFound).toBe(true);
    expect(readiness.sdkJarFound).toBe(true);
    expect(readiness.fatooraLauncherFound).toBe(true);
    expect(readiness.jqFound).toBe(true);
    expect(readiness.javaFound).toBe(true);
    expect(readiness.javaVersionSupported).toBe(false);
    expect(readiness.detectedJavaVersion).toBe("17.0.16");
    expect(readiness.javaSupported).toBe(false);
    expect(readiness.requiredJavaRange).toBe(ZATCA_SDK_REQUIRED_JAVA_RANGE);
    expect(readiness.javaBlockerMessage).toContain("outside the SDK-supported range");
    expect(readiness.sdkCommand).toBe(ZATCA_SDK_VALIDATE_COMMAND);
    expect(readiness.projectPathHasSpaces).toBe(true);
    expect(readiness.canAttemptSdkValidation).toBe(false);
    expect(readiness.canRunLocalValidation).toBe(false);
    expect(readiness.configDirFound).toBe(true);
    expect(readiness.supportedCommandsKnown).toBe(true);
    expect(readiness.blockingReasons.join(" ")).toContain("outside the SDK-supported range");
  });

  it("accepts Java 11-14 and blocks Java 15+", () => {
    const root = mkdtempSync(join(tmpdir(), "ledgerbyte-zatca-java-"));
    mkdirSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps"), { recursive: true });
    mkdirSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Configuration"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Configuration", "config.json"), "{}");

    const java11 = discoverZatcaSdkReadiness({
      projectRoot: root,
      env: { ZATCA_SDK_EXECUTION_ENABLED: "true" },
      runCommand: () => ({ status: 0, stderr: 'openjdk version "11.0.26" 2025-01-21 LTS' }),
    });
    const java14 = discoverZatcaSdkReadiness({
      projectRoot: root,
      env: { ZATCA_SDK_EXECUTION_ENABLED: "true" },
      runCommand: () => ({ status: 0, stderr: 'openjdk version "14.0.2" 2020-07-14' }),
    });
    const java15 = discoverZatcaSdkReadiness({
      projectRoot: root,
      env: { ZATCA_SDK_EXECUTION_ENABLED: "true" },
      runCommand: () => ({ status: 0, stderr: 'openjdk version "15.0.2" 2021-01-19' }),
    });

    expect(java11.javaSupported).toBe(true);
    expect(java11.javaBlockerMessage).toBeNull();
    expect(java14.javaSupported).toBe(true);
    expect(java15.javaSupported).toBe(false);
    expect(java15.javaBlockerMessage).toContain("outside the SDK-supported range");
  });

  it("handles a missing SDK folder safely", () => {
    const root = mkdtempSync(join(tmpdir(), "ledgerbyte-nosdk-"));
    const readiness = discoverZatcaSdkReadiness({
      projectRoot: root,
      runCommand: () => ({ status: 1, stderr: "" }),
    });

    expect(readiness.referenceFolderFound).toBe(false);
    expect(readiness.sdkJarFound).toBe(false);
    expect(readiness.canAttemptSdkValidation).toBe(false);
    expect(readiness.blockingReasons.join(" ")).toContain("disabled");
    expect(JSON.stringify(readiness)).not.toContain("PRIVATE KEY");
  });

  it("reads SDK execution config from env without exposing secrets", () => {
    const config = readZatcaSdkExecutionConfig({
      ZATCA_SDK_EXECUTION_ENABLED: "true",
      ZATCA_SDK_JAR_PATH: "C:\\sdk\\zatca.jar",
      ZATCA_SDK_CONFIG_DIR: "C:\\sdk\\Configuration",
      ZATCA_SDK_WORK_DIR: "C:\\temp\\zatca",
      ZATCA_SDK_JAVA_BIN: "C:\\Java 11\\bin\\java.exe",
      ZATCA_SDK_TIMEOUT_MS: "45000",
    });

    expect(config.enabled).toBe(true);
    expect(config.sdkJarPath).toBe("C:\\sdk\\zatca.jar");
    expect(config.configDir).toBe("C:\\sdk\\Configuration");
    expect(config.workDir).toBe("C:\\temp\\zatca");
    expect(config.javaBin).toBe("C:\\Java 11\\bin\\java.exe");
    expect(config.timeoutMs).toBe(45000);
  });
});

describe("ZATCA SDK validation command builder", () => {
  it("builds a Windows dry-run plan with quoted display paths and jq PATH prepend", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "C:\\Temp Path\\invoice.xml",
      sdkJarPath: "E:\\Accounting App\\reference\\sdk.jar",
      launcherPath: "E:\\Accounting App\\reference\\Apps\\fatoora.bat",
      jqPath: "E:\\Accounting App\\reference\\Apps\\jq.exe",
      configDirPath: "E:\\Accounting App\\reference\\Configuration",
      workingDirectory: "E:\\Accounting App\\reference",
      platform: "win32",
      javaFound: true,
    });

    expect(plan.command).toBe("cmd.exe");
    expect(plan.args).toEqual(["/d", "/c", "E:\\Accounting App\\reference\\Apps\\fatoora.bat", "-validate", "-invoice", "C:\\Temp Path\\invoice.xml"]);
    expect(plan.displayCommand).toContain('"E:\\Accounting App\\reference\\Apps\\fatoora.bat"');
    expect(plan.envAdditions.PATH_PREPEND).toBe("E:\\Accounting App\\reference\\Apps");
    expect(plan.envAdditions.SDK_CONFIG).toBe("E:\\Accounting App\\reference\\Configuration\\config.json");
    expect(plan.envAdditions.FATOORA_HOME).toBe("E:\\Accounting App\\reference\\Apps");
    expect(plan.warnings.join(" ")).toContain("argument-array");
    expect(plan.warnings.join(" ")).toContain("official Windows fatoora.bat launcher");
  });

  it("builds a Unix dry-run plan", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "/tmp/invoice.xml",
      sdkJarPath: "/repo/reference/sdk.jar",
      configDirPath: "/repo/reference/Configuration",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: true,
      javaCommand: "/opt/java-11/bin/java",
    });

    expect(plan.command).toBe("/opt/java-11/bin/java");
    expect(plan.args).toEqual(["-jar", "/repo/reference/sdk.jar", "-validate", "-invoice", "/tmp/invoice.xml"]);
    expect(plan.envAdditions.SDK_CONFIG).toBe("/repo/reference/Configuration/config.json");
  });

  it("builds a launcher validation plan using the SDK readme flags", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "/tmp/invoice.xml",
      launcherPath: "/repo/reference/Apps/fatoora",
      jqPath: "/repo/reference/Apps/jq",
      configDirPath: "/repo/reference/Configuration",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: true,
    });

    expect(plan.command).toBe("/repo/reference/Apps/fatoora");
    expect(plan.args).toEqual(["-validate", "-invoice", "/tmp/invoice.xml"]);
    expect(plan.displayCommand).toContain("-validate -invoice /tmp/invoice.xml");
    expect(plan.envAdditions.FATOORA_HOME).toBe("/repo/reference/Apps");
  });

  it("builds a launcher hash-generation plan using the SDK readme flags", () => {
    const plan = buildZatcaSdkGenerateHashCommand({
      xmlFilePath: "/tmp/invoice.xml",
      launcherPath: "/repo/reference/Apps/fatoora",
      jqPath: "/repo/reference/Apps/jq",
      configDirPath: "/repo/reference/Configuration",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: true,
    });

    expect(plan.command).toBe("/repo/reference/Apps/fatoora");
    expect(plan.args).toEqual(["-generateHash", "-invoice", "/tmp/invoice.xml"]);
    expect(plan.displayCommand).toContain("-generateHash -invoice /tmp/invoice.xml");
    expect(plan.warnings.join(" ")).toContain(ZATCA_SDK_GENERATE_HASH_COMMAND);
    expect(plan.envAdditions.FATOORA_HOME).toBe("/repo/reference/Apps");
  });

  it("prefers a configured no-space SDK launcher beside ZATCA_SDK_JAR_PATH", () => {
    const root = mkdtempSync(join(tmpdir(), "ledgerbyte-configured-sdk-root-"));
    const configuredSdkRoot = join(root, "sdk-copy");
    mkdirSync(join(root, "reference"), { recursive: true });
    mkdirSync(join(configuredSdkRoot, "Apps"), { recursive: true });
    mkdirSync(join(configuredSdkRoot, "Configuration"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    writeFileSync(join(configuredSdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar"), "");
    writeFileSync(join(configuredSdkRoot, "Apps", "fatoora.bat"), "");
    writeFileSync(join(configuredSdkRoot, "Apps", "jq.exe"), "");
    writeFileSync(join(configuredSdkRoot, "Configuration", "config.json"), "{}");

    const readiness = discoverZatcaSdkReadiness({
      projectRoot: root,
      platform: "win32",
      env: {
        ZATCA_SDK_EXECUTION_ENABLED: "true",
        ZATCA_SDK_JAR_PATH: join(configuredSdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar"),
        ZATCA_SDK_CONFIG_DIR: join(configuredSdkRoot, "Configuration"),
      },
      runCommand: () => ({ status: 0, stderr: 'openjdk version "11.0.26" 2025-01-21 LTS' }),
    });

    expect(readiness.fatooraLauncherPath).toBe(join(configuredSdkRoot, "Apps", "fatoora.bat"));
    expect(readiness.jqPath).toBe(join(configuredSdkRoot, "Apps", "jq.exe"));
    expect(readiness.sdkRootPath).toBe(configuredSdkRoot);
    expect(readiness.canRunLocalValidation).toBe(true);
  });

  it("warns when jq, Java, or SDK JAR are missing", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "/tmp/invoice.xml",
      sdkJarPath: "",
      launcherPath: "/repo/reference/Apps/fatoora",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: false,
    });

    expect(plan.command).toBe("/repo/reference/Apps/fatoora");
    expect(plan.warnings.join(" ")).toContain("Java is missing");
    expect(plan.warnings.join(" ")).toContain("jq was not found");
  });

  it("returns a safe empty command when no executable path exists", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "/tmp/invoice.xml",
      sdkJarPath: "",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: false,
    });

    expect(plan.command).toBeNull();
    expect(plan.args).toEqual([]);
    expect(plan.warnings.join(" ")).toContain("Neither SDK JAR nor fatoora launcher is available");
  });
});

describe("ZATCA official fixture registry", () => {
  it("keeps registered fixture paths relative and allowlisted", () => {
    expect(ZATCA_SDK_FIXTURE_REGISTRY.length).toBeGreaterThanOrEqual(6);
    expect(ZATCA_SDK_FIXTURE_REGISTRY.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "official-standard-invoice",
        "official-simplified-invoice",
        "official-standard-credit-note",
        "official-standard-debit-note",
        "ledgerbyte-local-standard-invoice",
        "ledgerbyte-local-simplified-invoice",
      ]),
    );

    for (const entry of ZATCA_SDK_FIXTURE_REGISTRY) {
      expect(entry.relativePath).not.toMatch(/^[a-zA-Z]:/);
      expect(entry.relativePath).not.toContain("..");
      expect(isAllowedZatcaFixturePath(entry.relativePath)).toBe(true);
    }
  });

  it("rejects fixture path traversal and non-XML inputs", () => {
    expect(isAllowedZatcaFixturePath("../.env")).toBe(false);
    expect(isAllowedZatcaFixturePath("reference/../.env.xml")).toBe(false);
    expect(isAllowedZatcaFixturePath("reference/zatca-docs/reporting.pdf")).toBe(false);
    expect(isAllowedZatcaFixturePath("C:\\temp\\invoice.xml")).toBe(false);
    expect(isAllowedZatcaFixturePath("/tmp/invoice.xml")).toBe(false);
  });
});
