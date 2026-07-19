const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HELPER_SOURCE = "scripts/zatca-c14n11-helper.java";

class DisabledZatcaC14n11HashProvider {
  kind = "DISABLED";

  computeHash(_xml) {
    return { status: "SKIPPED_EXTERNAL_ORACLE", hash: null, safeErrorCodes: ["C14N11_HELPER_NOT_CONFIGURED"], xmlBodyPrinted: false, networkCallsMade: false };
  }

  canonicalize(_xml) {
    return { status: "SKIPPED_EXTERNAL_ORACLE", canonicalBytes: null, safeErrorCodes: ["C14N11_HELPER_NOT_CONFIGURED"], xmlBodyPrinted: false, networkCallsMade: false };
  }
}

class LocalJavaZatcaC14n11HashProvider {
  kind = "LOCAL_JAVA_C14N11";

  constructor({ cwd, env, spawn, sdkRoot, javaBin, jar, helper }) {
    this.cwd = cwd;
    this.env = env;
    this.spawn = spawn;
    this.sdkRoot = sdkRoot;
    this.javaBin = javaBin;
    this.jar = jar;
    this.helper = helper;
  }

  computeHash(xml) {
    const { javaBin, jar, helper, spawn } = this;
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

  canonicalize(xml) {
    const { javaBin, jar, helper, spawn } = this;
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-c14n11-"));
    try {
      const compile = spawn(javaBin.replace(/java(?:\.exe)?$/i, process.platform === "win32" ? "javac.exe" : "javac"), ["-cp", jar, "-d", temp, helper], { encoding: "utf8", windowsHide: true, timeout: 30000 });
      if (compile.status !== 0) return { status: "FAILED", canonicalBytes: null, safeErrorCodes: ["C14N11_HELPER_COMPILE_FAILED"], xmlBodyPrinted: false, networkCallsMade: false };
      const result = spawn(javaBin, ["-cp", `${temp}${path.delimiter}${jar}`, "ZatcaC14n11Helper", "--canonicalize-stdin"], { input: xml, encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
      const output = String(result.stdout || "").trim();
      if (result.status !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(output)) return { status: "FAILED", canonicalBytes: null, safeErrorCodes: ["C14N11_CANONICALIZATION_FAILED"], xmlBodyPrinted: false, networkCallsMade: false };
      return { status: "PASSED", canonicalBytes: Buffer.from(output, "base64"), safeErrorCodes: [], xmlBodyPrinted: false, networkCallsMade: false, canonicalization: "C14N11_OMIT_COMMENTS" };
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}

function createZatcaC14n11HashProvider({ cwd = process.cwd(), env = process.env, spawn = spawnSync } = {}) {
  const sdkRoot = env.ZATCA_SDK_ROOT ? path.resolve(env.ZATCA_SDK_ROOT) : null;
  const javaBin = env.ZATCA_SDK_JAVA_BIN ? path.resolve(env.ZATCA_SDK_JAVA_BIN) : null;
  const jar = sdkRoot && path.join(sdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
  const helper = path.resolve(cwd, HELPER_SOURCE);
  if (!sdkRoot || !javaBin || !jar || !fs.existsSync(jar) || !fs.existsSync(helper)) {
    return new DisabledZatcaC14n11HashProvider();
  }
  return new LocalJavaZatcaC14n11HashProvider({ cwd, env, spawn, sdkRoot, javaBin, jar, helper });
}

function computeZatcaC14n11Hash({ xml, cwd = process.cwd(), env = process.env, spawn = spawnSync }) {
  return createZatcaC14n11HashProvider({ cwd, env, spawn }).computeHash(xml);
}

function canonicalizeZatcaXmlC14n11({ xml, cwd = process.cwd(), env = process.env, spawn = spawnSync }) {
  return createZatcaC14n11HashProvider({ cwd, env, spawn }).canonicalize(xml);
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
    const result = spawn(javaBin, ["-Dfile.encoding=UTF-8", "-jar", jar, "-generateHash", "-invoice", invoice], { encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
    const sdkHash = (String(result.stdout || "") + "\n" + String(result.stderr || "")).match(/(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{43}=(?![A-Za-z0-9+/])/g)?.[0] || null;
    return { ...ledgerByte, sdkHash, hashesEqual: Boolean(sdkHash && sdkHash === ledgerByte.hash), status: sdkHash && sdkHash === ledgerByte.hash ? "PASSED" : "FAILED", safeErrorCodes: sdkHash ? [] : ["SDK_HASH_NOT_FOUND"] };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = {
  compareWithOfficialSdkHash,
  computeZatcaC14n11Hash,
  canonicalizeZatcaXmlC14n11,
  createZatcaC14n11HashProvider,
  DisabledZatcaC14n11HashProvider,
  LocalJavaZatcaC14n11HashProvider,
};
