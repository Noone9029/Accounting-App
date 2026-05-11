import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildZatcaSdkValidationCommand, discoverZatcaSdkReadiness, parseJavaMajorVersion, parseJavaVersion } from "./zatca-sdk-paths";

describe("ZATCA SDK paths", () => {
  it("parses Java versions", () => {
    expect(parseJavaVersion('openjdk version "17.0.16" 2025-07-15')).toBe("17.0.16");
    expect(parseJavaMajorVersion("17.0.16")).toBe(17);
    expect(parseJavaMajorVersion("1.8.0_402")).toBe(8);
  });

  it("discovers SDK readiness and path-space warnings", () => {
    const root = mkdtempSync(join(tmpdir(), "ledgerbyte path "));
    mkdirSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "fatoora.bat"), "");
    writeFileSync(join(root, "reference", "zatca-einvoicing-sdk-Java", "Apps", "jq.exe"), "");

    const readiness = discoverZatcaSdkReadiness({
      projectRoot: root,
      platform: "win32",
      runCommand: () => ({ status: 0, stderr: 'openjdk version "17.0.16" 2025-07-15' }),
    });

    expect(readiness.referenceFolderFound).toBe(true);
    expect(readiness.sdkJarFound).toBe(true);
    expect(readiness.fatooraLauncherFound).toBe(true);
    expect(readiness.jqFound).toBe(true);
    expect(readiness.javaFound).toBe(true);
    expect(readiness.javaVersionSupported).toBe(false);
    expect(readiness.projectPathHasSpaces).toBe(true);
    expect(readiness.canAttemptSdkValidation).toBe(false);
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
    expect(JSON.stringify(readiness)).not.toContain("PRIVATE KEY");
  });
});

describe("ZATCA SDK validation command builder", () => {
  it("builds a Windows dry-run plan with quoted display paths and jq PATH prepend", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "C:\\Temp Path\\invoice.xml",
      sdkJarPath: "E:\\Accounting App\\reference\\sdk.jar",
      launcherPath: "E:\\Accounting App\\reference\\Apps\\fatoora.bat",
      jqPath: "E:\\Accounting App\\reference\\Apps\\jq.exe",
      workingDirectory: "E:\\Accounting App\\reference",
      platform: "win32",
      javaFound: true,
    });

    expect(plan.command).toBe("java");
    expect(plan.args).toContain("E:\\Accounting App\\reference\\sdk.jar");
    expect(plan.displayCommand).toContain('"E:\\Accounting App\\reference\\sdk.jar"');
    expect(plan.envAdditions.PATH_PREPEND).toBe("E:\\Accounting App\\reference\\Apps");
    expect(plan.warnings.join(" ")).toContain("Dry-run");
  });

  it("builds a Unix dry-run plan", () => {
    const plan = buildZatcaSdkValidationCommand({
      xmlFilePath: "/tmp/invoice.xml",
      sdkJarPath: "/repo/reference/sdk.jar",
      workingDirectory: "/repo/reference",
      platform: "linux",
      javaFound: true,
    });

    expect(plan.command).toBe("java");
    expect(plan.args).toEqual(["-jar", "/repo/reference/sdk.jar", "-validate", "-invoice", "/tmp/invoice.xml"]);
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
