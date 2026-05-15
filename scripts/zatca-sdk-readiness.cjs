const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const sdkRoot = path.join(repoRoot, "reference", "zatca-einvoicing-sdk-Java-238-R3.4.8");
const sdkJar = path.join(sdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
const launcher = path.join(sdkRoot, "Apps", process.platform === "win32" ? "fatoora.bat" : "fatoora");
const configDir = path.join(sdkRoot, "Configuration");
const workDir = process.env.ZATCA_SDK_WORK_DIR || path.join(os.tmpdir(), "ledgerbyte-zatca-sdk");

const requiredRange = ">=11 <15";
const command = "fatoora -validate -invoice <filename>";

function parseVersion(output) {
  const quoted = output.match(/version\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const openJdk = output.match(/openjdk\s+([0-9][^\s]*)/i);
  return openJdk?.[1] || null;
}

function parseMajor(version) {
  if (!version) return null;
  const legacy = version.match(/^1\.(\d+)/);
  if (legacy?.[1]) return Number(legacy[1]);
  const modern = version.match(/^(\d+)/);
  return modern?.[1] ? Number(modern[1]) : null;
}

function javaVersion(javaBin) {
  const result = spawnSync(javaBin, ["-version"], { encoding: "utf8", timeout: 5000, windowsHide: true });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const version = parseVersion(output);
  const major = parseMajor(version);
  return {
    javaBin,
    found: !result.error && Boolean(version),
    version,
    major,
    supported: major !== null && major >= 11 && major < 15,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function windowsJavaCandidates() {
  const candidates = [];
  if (process.env.ZATCA_SDK_JAVA_BIN) candidates.push(process.env.ZATCA_SDK_JAVA_BIN);
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, "bin", "java.exe"));

  const whereResult = spawnSync("where.exe", ["java"], { encoding: "utf8", windowsHide: true });
  if (!whereResult.error) {
    candidates.push(...whereResult.stdout.split(/\r?\n/).map((line) => line.trim()));
  }

  for (const root of [path.join(process.env.ProgramFiles || "C:\\Program Files", "Java"), path.join(process.env.ProgramFiles || "C:\\Program Files", "Microsoft")]) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      candidates.push(path.join(root, entry, "bin", "java.exe"));
    }
  }

  return unique(candidates).filter((candidate) => fs.existsSync(candidate));
}

const candidates = process.platform === "win32" ? windowsJavaCandidates() : unique([process.env.ZATCA_SDK_JAVA_BIN, process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, "bin", "java"), "java"]);
const javaChecks = candidates.map(javaVersion);
const supported = javaChecks.filter((check) => check.supported);

const summary = {
  requiredJavaRange: requiredRange,
  supportedJavaFound: supported.length > 0,
  command,
  sdkJarFound: fs.existsSync(sdkJar),
  launcherFound: fs.existsSync(launcher),
  configDirFound: fs.existsSync(configDir),
  workDir,
  javaCandidates: javaChecks,
};

console.log(JSON.stringify(summary, null, 2));

if (!summary.sdkJarFound || !summary.configDirFound || !summary.supportedJavaFound) {
  process.exitCode = 1;
}
