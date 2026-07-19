const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HELPER_SOURCE = "scripts/zatca-c14n11-helper.java";

function computeZatcaC14n11Hash({ xml, cwd = process.cwd(), env = process.env, spawn = spawnSync }) {
  const sdkRoot = env.ZATCA_SDK_ROOT ? path.resolve(env.ZATCA_SDK_ROOT) : null;
  const javaBin = env.ZATCA_SDK_JAVA_BIN ? path.resolve(env.ZATCA_SDK_JAVA_BIN) : null;
  const jar = sdkRoot && path.join(sdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
  const helper = path.resolve(cwd, HELPER_SOURCE);
  if (!sdkRoot || !javaBin || !jar || !fs.existsSync(jar) || !fs.existsSync(helper)) {
    return { status: "SKIPPED_EXTERNAL_ORACLE", hash: null, safeErrorCodes: ["C14N11_HELPER_NOT_CONFIGURED"], xmlBodyPrinted: false, networkCallsMade: false };
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-c14n11-"));
  try {
    const compile = spawn(javaBin.replace(/java(?:\.exe)?$/i, process.platform === "win32" ? "javac.exe" : "javac"), ["-cp", jar, "-d", temp, helper], { encoding: "utf8", windowsHide: true, timeout: 30000 });
    if (compile.status !== 0) return failed("C14N11_HELPER_COMPILE_FAILED");
    const result = spawn(javaBin, ["-cp", `${temp}${path.delimiter}${jar}`, "ZatcaC14n11Helper", "--hash-stdin"], { input: xml, encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
    const hash = String(result.stdout || "").trim();
    if (result.status !== 0 || !/^[A-Za-z0-9+/]{43}=$/.test(hash)) return failed("C14N11_HASH_FAILED");
    return { status: "PASSED", hash, safeErrorCodes: [], xmlBodyPrinted: false, networkCallsMade: false, canonicalization: "C14N11_OMIT_COMMENTS" };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function failed(code) {
  return { status: "FAILED", hash: null, safeErrorCodes: [code], xmlBodyPrinted: false, networkCallsMade: false };
}

function compareWithOfficialSdkHash({ xml, cwd = process.cwd(), env = process.env, spawn = spawnSync }) {
  const ledgerByte = computeZatcaC14n11Hash({ xml, cwd, env, spawn });
  if (ledgerByte.status !== "PASSED") return { ...ledgerByte, sdkHash: null, hashesEqual: false };
  const sdkRoot = path.resolve(env.ZATCA_SDK_ROOT);
  const javaBin = path.resolve(env.ZATCA_SDK_JAVA_BIN);
  const jar = path.join(sdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-sdk-hash-"));
  try {
    const invoice = path.join(temp, "invoice.xml");
    fs.writeFileSync(invoice, xml, "utf8");
    const result = spawn(javaBin, ["-jar", jar, "-generateHash", "-invoice", invoice], { encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
    const sdkHash = (String(result.stdout || "") + "\n" + String(result.stderr || "")).match(/(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{43}=(?![A-Za-z0-9+/])/g)?.[0] || null;
    return { ...ledgerByte, sdkHash, hashesEqual: Boolean(sdkHash && sdkHash === ledgerByte.hash), status: sdkHash && sdkHash === ledgerByte.hash ? "PASSED" : "FAILED", safeErrorCodes: sdkHash ? [] : ["SDK_HASH_NOT_FOUND"] };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { compareWithOfficialSdkHash, computeZatcaC14n11Hash };
