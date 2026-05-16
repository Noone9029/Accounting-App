#!/usr/bin/env node
const { execFile } = require("node:child_process");
const { mkdir, mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const apiUrl = trimTrailingSlash(process.env.LEDGERBYTE_API_URL || "http://localhost:4000");
const email = process.env.LEDGERBYTE_E2E_EMAIL || process.env.LEDGERBYTE_SMOKE_EMAIL || "admin@example.com";
const password = process.env.LEDGERBYTE_E2E_PASSWORD || process.env.LEDGERBYTE_SMOKE_PASSWORD || "Password123!";
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const repoRoot = path.resolve(__dirname, "..");
const officialFirstPihSeed = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }, null, 2));
  process.exitCode = 1;
});

async function main() {
  const sdkConfig = resolveSdkConfig();
  const java = await javaVersion(sdkConfig.javaBin);
  if (!java.supported) {
    throw new Error(`Java ${java.version || "unknown"} is outside the supported ZATCA SDK range >=11 <15.`);
  }

  const login = await requestJson("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  const accessToken = login.accessToken;
  if (!accessToken) {
    throw new Error("Login response did not include an access token.");
  }

  const organization = await requestJson("/organizations", {
    method: "POST",
    token: accessToken,
    body: {
      name: `SDK Hash Validation ${runId}`,
      legalName: `SDK Hash Validation ${runId} LLC`,
      taxNumber: "300000000000003",
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
  });
  const organizationId = organization.id;
  const headers = { token: accessToken, organizationId };

  await requestJson("/zatca/profile", {
    method: "PATCH",
    ...headers,
    body: {
      sellerName: `SDK Hash Validation ${runId} LLC`,
      vatNumber: "300000000000003",
      companyIdType: "CRN",
      companyIdNumber: "1010010000",
      buildingNumber: "1234",
      streetName: "King Fahd Road",
      district: "Olaya",
      city: "Riyadh",
      postalCode: "12271",
      countryCode: "SA",
      additionalAddressNumber: "5678",
      businessCategory: "Software",
      environment: "SANDBOX",
    },
  });

  let egsUnit = await requestJson("/zatca/egs-units", {
    method: "POST",
    ...headers,
    body: {
      name: `SDK Hash EGS ${runId}`,
      deviceSerialNumber: `SDK-HASH-${runId}`,
      environment: "SANDBOX",
      solutionName: "LedgerByte SDK Hash Validation",
    },
  });
  egsUnit = await requestJson(`/zatca/egs-units/${encodeURIComponent(egsUnit.id)}/activate-dev`, {
    method: "POST",
    ...headers,
    body: {},
  });

  const readiness = await requestJson("/zatca-sdk/readiness", { ...headers });
  if (!readiness.enabled || !readiness.canRunLocalValidation) {
    throw new Error(`ZATCA SDK readiness failed: ${(readiness.blockingReasons || []).join("; ")}`);
  }

  const resetPlanBefore = await requestJson("/zatca/hash-chain-reset-plan", { ...headers });
  const egsPlanBefore = resetPlanBefore.egsUnits?.find((unit) => unit.id === egsUnit.id);
  if (!egsPlanBefore || egsPlanBefore.metadataCount !== 0 || egsPlanBefore.canEnableSdkHashMode !== true) {
    throw new Error(`Fresh EGS was not eligible for SDK hash mode: ${JSON.stringify(egsPlanBefore)}`);
  }

  egsUnit = await requestJson(`/zatca/egs-units/${encodeURIComponent(egsUnit.id)}/enable-sdk-hash-mode`, {
    method: "POST",
    ...headers,
    body: {
      confirmReset: true,
      reason: "Local SDK hash mode validation for fresh EGS",
    },
  });
  if (egsUnit.hashMode !== "SDK_GENERATED") {
    throw new Error(`EGS did not switch to SDK_GENERATED. Current mode: ${egsUnit.hashMode}`);
  }

  const auditLogs = await requestJson(`/audit-logs?action=ZATCA_SDK_HASH_MODE_ENABLED&entityId=${encodeURIComponent(egsUnit.id)}&limit=10`, headers);
  const auditEventFound = Boolean(auditLogs.data?.some((entry) => entry.action === "ZATCA_SDK_HASH_MODE_ENABLED" && entry.entityId === egsUnit.id));

  const accounts = await requestJson("/accounts", headers);
  const revenueAccount = accounts.find((account) => account.type === "REVENUE" && account.allowPosting && account.isActive) || accounts.find((account) => account.allowPosting && account.isActive);
  if (!revenueAccount) {
    throw new Error("No posting revenue account found for SDK hash validation invoices.");
  }
  const taxRates = await requestJson("/tax-rates", headers);
  const salesVat = taxRates.find((taxRate) => taxRate.name === "VAT on Sales 15%" && taxRate.isActive);
  const customer = await requestJson("/contacts", {
    method: "POST",
    ...headers,
    body: {
      type: "CUSTOMER",
      name: `SDK Hash Customer ${runId}`,
      displayName: `SDK Hash Customer ${runId}`,
      taxNumber: "399999999900003",
      addressLine1: "King Abdullah Financial District",
      addressLine2: "Al Aqeeq",
      city: "Riyadh",
      postalCode: "13519",
      countryCode: "SA",
    },
  });
  const itemBody = {
    name: `SDK Hash Service ${runId}`,
    sku: `SDK-HASH-SERVICE-${runId}`,
    type: "SERVICE",
    sellingPrice: "100.0000",
    revenueAccountId: revenueAccount.id,
  };
  if (salesVat) {
    itemBody.salesTaxRateId = salesVat.id;
  }
  const item = await requestJson("/items", { method: "POST", ...headers, body: itemBody });

  const invoice1 = await createFinalizedInvoice(headers, customer.id, item.id, salesVat?.id, "first");
  const invoice1Result = await generateValidateAndCompare({
    headers,
    invoice: invoice1,
    sdkConfig,
    expectedPreviousHash: officialFirstPihSeed,
    xmlName: "invoice-1",
  });

  const invoice2 = await createFinalizedInvoice(headers, customer.id, item.id, salesVat?.id, "second");
  const invoice2Result = await generateValidateAndCompare({
    headers,
    invoice: invoice2,
    sdkConfig,
    expectedPreviousHash: invoice1Result.metadata.invoiceHash,
    xmlName: "invoice-2",
  });

  const egsAfterInvoice2 = await requestJson(`/zatca/egs-units/${encodeURIComponent(egsUnit.id)}`, headers);
  const repeat1 = await requestJson(`/sales-invoices/${encodeURIComponent(invoice1.id)}/zatca/generate`, { method: "POST", ...headers, body: {} });
  const repeat2 = await requestJson(`/sales-invoices/${encodeURIComponent(invoice2.id)}/zatca/generate`, { method: "POST", ...headers, body: {} });
  const egsAfterRepeat = await requestJson(`/zatca/egs-units/${encodeURIComponent(egsUnit.id)}`, headers);

  const idempotency = {
    invoice1Stable:
      repeat1.id === invoice1Result.metadata.id &&
      repeat1.icv === invoice1Result.metadata.icv &&
      repeat1.previousInvoiceHash === invoice1Result.metadata.previousInvoiceHash &&
      repeat1.invoiceHash === invoice1Result.metadata.invoiceHash,
    invoice2Stable:
      repeat2.id === invoice2Result.metadata.id &&
      repeat2.icv === invoice2Result.metadata.icv &&
      repeat2.previousInvoiceHash === invoice2Result.metadata.previousInvoiceHash &&
      repeat2.invoiceHash === invoice2Result.metadata.invoiceHash,
    egsStable:
      egsAfterRepeat.lastIcv === egsAfterInvoice2.lastIcv &&
      egsAfterRepeat.lastInvoiceHash === egsAfterInvoice2.lastInvoiceHash,
    lastIcvBeforeRepeat: egsAfterInvoice2.lastIcv,
    lastIcvAfterRepeat: egsAfterRepeat.lastIcv,
    lastHashBeforeRepeat: egsAfterInvoice2.lastInvoiceHash,
    lastHashAfterRepeat: egsAfterRepeat.lastInvoiceHash,
  };

  if (!idempotency.invoice1Stable || !idempotency.invoice2Stable || !idempotency.egsStable) {
    throw new Error(`Idempotency check failed: ${JSON.stringify(idempotency)}`);
  }
  if (invoice2Result.metadata.previousInvoiceHash !== invoice1Result.metadata.invoiceHash) {
    throw new Error("Invoice 2 PIH did not match invoice 1 SDK hash.");
  }
  if (egsAfterInvoice2.lastInvoiceHash !== invoice2Result.metadata.invoiceHash) {
    throw new Error("EGS last invoice hash did not match invoice 2 SDK hash.");
  }

  const summary = {
    ok: true,
    apiUrl,
    java,
    sdk: {
      sdkRoot: sdkConfig.sdkRoot,
      jarFound: fs.existsSync(sdkConfig.sdkJar),
      launcherFound: fs.existsSync(sdkConfig.launcher),
      configDirFound: fs.existsSync(sdkConfig.configDir),
      workDir: sdkConfig.workDir,
      readiness: {
        enabled: readiness.enabled,
        javaSupported: readiness.javaSupported,
        canRunLocalValidation: readiness.canRunLocalValidation,
        blockingReasons: readiness.blockingReasons,
      },
    },
    organization: {
      id: organizationId,
      name: organization.name,
    },
    egsUnit: {
      id: egsUnit.id,
      name: egsUnit.name,
      hashMode: egsUnit.hashMode,
      metadataCountBeforeEnable: egsPlanBefore.metadataCount,
      auditEventFound,
    },
    firstPihSeed: officialFirstPihSeed,
    invoices: [invoice1Result, invoice2Result].map(formatInvoiceResult),
    chain: {
      invoice1PreviousHashIsFirstSeed: invoice1Result.metadata.previousInvoiceHash === officialFirstPihSeed,
      invoice2PreviousHashEqualsInvoice1Hash: invoice2Result.metadata.previousInvoiceHash === invoice1Result.metadata.invoiceHash,
      egsLastHashEqualsInvoice2Hash: egsAfterInvoice2.lastInvoiceHash === invoice2Result.metadata.invoiceHash,
    },
    idempotency,
    noNetwork: true,
    productionComplianceClaimed: false,
  };

  console.log(JSON.stringify(summary, null, 2));

  const allHashChecksPass = summary.invoices.every((invoice) => invoice.hashCompare.hashMatches === true && invoice.hashCompare.hashComparisonStatus === "MATCH");
  const allDirectHashesMatch = summary.invoices.every((invoice) => invoice.persistedHash === invoice.directSdkHash);
  if (!auditEventFound || !allHashChecksPass || !allDirectHashesMatch) {
    process.exitCode = 1;
  }
}

async function createFinalizedInvoice(headers, customerId, itemId, taxRateId, label) {
  const line = {
    itemId,
    description: `SDK hash ${label} invoice line`,
    quantity: "1.0000",
    unitPrice: label === "first" ? "100.0000" : "125.0000",
  };
  if (taxRateId) {
    line.taxRateId = taxRateId;
  }
  const draft = await requestJson("/sales-invoices", {
    method: "POST",
    ...headers,
    body: {
      customerId,
      issueDate: new Date().toISOString(),
      currency: "SAR",
      notes: `Local SDK hash mode validation ${label} invoice`,
      lines: [line],
    },
  });
  return requestJson(`/sales-invoices/${encodeURIComponent(draft.id)}/finalize`, {
    method: "POST",
    ...headers,
    body: {},
  });
}

async function generateValidateAndCompare({ headers, invoice, sdkConfig, expectedPreviousHash, xmlName }) {
  const metadata = await requestJson(`/sales-invoices/${encodeURIComponent(invoice.id)}/zatca/generate`, {
    method: "POST",
    ...headers,
    body: {},
  });
  const xml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8");
  const xmlPath = path.join(sdkConfig.workDir, `${xmlName}-${safeFilePart(invoice.invoiceNumber || invoice.id)}.xml`);
  await mkdir(path.dirname(xmlPath), { recursive: true });
  await writeFile(xmlPath, xml, "utf8");

  if (metadata.hashModeSnapshot !== "SDK_GENERATED") {
    throw new Error(`${invoice.invoiceNumber} metadata hashModeSnapshot was ${metadata.hashModeSnapshot}, expected SDK_GENERATED.`);
  }
  if (metadata.previousInvoiceHash !== expectedPreviousHash) {
    throw new Error(`${invoice.invoiceNumber} previousInvoiceHash did not match expected PIH.`);
  }

  const directHash = await runFatoora(sdkConfig, "generateHash", xmlPath);
  const directSdkHash = extractInvoiceHash(`${directHash.stdout}\n${directHash.stderr}`);
  if (!directSdkHash) {
    throw new Error(`${invoice.invoiceNumber} direct SDK hash output could not be parsed.`);
  }
  if (directSdkHash !== metadata.invoiceHash || metadata.xmlHash !== metadata.invoiceHash) {
    throw new Error(`${invoice.invoiceNumber} persisted hash did not match direct SDK hash.`);
  }

  const directValidation = await runFatoora(sdkConfig, "validate", xmlPath, { previousInvoiceHash: metadata.previousInvoiceHash });
  const validationMessages = extractValidationMessages(`${directValidation.stdout}\n${directValidation.stderr}`);
  const hashCompare = await requestJson(`/sales-invoices/${encodeURIComponent(invoice.id)}/zatca/hash-compare`, {
    method: "POST",
    ...headers,
    body: {},
  });
  const apiValidation = await requestJson(`/sales-invoices/${encodeURIComponent(invoice.id)}/zatca/sdk-validate`, {
    method: "POST",
    ...headers,
    body: {},
  });

  if (hashCompare.hashComparisonStatus !== "MATCH" || hashCompare.hashMatches !== true || hashCompare.sdkHash !== metadata.invoiceHash) {
    throw new Error(`${invoice.invoiceNumber} hash compare did not MATCH.`);
  }

  return {
    invoice,
    metadata,
    xmlPath,
    directSdkHash,
    directValidation: {
      exitCode: directValidation.exitCode,
      messages: validationMessages,
    },
    hashCompare,
    apiValidation,
  };
}

function formatInvoiceResult(result) {
  return {
    invoiceId: result.invoice.id,
    invoiceNumber: result.invoice.invoiceNumber,
    metadataId: result.metadata.id,
    icv: result.metadata.icv,
    previousInvoiceHash: result.metadata.previousInvoiceHash,
    persistedHash: result.metadata.invoiceHash,
    xmlHash: result.metadata.xmlHash,
    hashModeSnapshot: result.metadata.hashModeSnapshot,
    directSdkHash: result.directSdkHash,
    xmlPath: result.xmlPath,
    directValidation: result.directValidation,
    apiValidation: {
      success: result.apiValidation.success,
      sdkExitCode: result.apiValidation.sdkExitCode,
      hashComparisonStatus: result.apiValidation.hashComparisonStatus,
      hashMatches: result.apiValidation.hashMatches,
      warnings: result.apiValidation.warnings || [],
      validationMessages: result.apiValidation.validationMessages || [],
    },
    hashCompare: {
      egsHashMode: result.hashCompare.egsHashMode,
      metadataHashModeSnapshot: result.hashCompare.metadataHashModeSnapshot,
      sdkHash: result.hashCompare.sdkHash,
      appHash: result.hashCompare.appHash,
      hashMatches: result.hashCompare.hashMatches,
      hashComparisonStatus: result.hashCompare.hashComparisonStatus,
      noMutation: result.hashCompare.noMutation,
      warnings: result.hashCompare.warnings || [],
    },
  };
}

function resolveSdkConfig() {
  const sdkJar =
    process.env.ZATCA_SDK_JAR_PATH ||
    path.join(repoRoot, "reference", "zatca-einvoicing-sdk-Java-238-R3.4.8", "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
  const sdkRoot = process.env.ZATCA_SDK_ROOT || path.dirname(path.dirname(sdkJar));
  const launcher = process.env.ZATCA_SDK_LAUNCHER_PATH || path.join(sdkRoot, "Apps", process.platform === "win32" ? "fatoora.bat" : "fatoora");
  const configDir = process.env.ZATCA_SDK_CONFIG_DIR || path.join(sdkRoot, "Configuration");
  const javaBin = process.env.ZATCA_SDK_JAVA_BIN || "java";
  const workDir = process.env.LEDGERBYTE_ZATCA_HASH_MODE_WORK_DIR || path.join(os.tmpdir(), "ledgerbyte-zatca-sdk-hash-mode", runId);
  const jqPath = path.join(configDir, "jq.exe");

  if (!fs.existsSync(sdkJar)) throw new Error(`ZATCA SDK JAR was not found: ${sdkJar}`);
  if (!fs.existsSync(launcher)) throw new Error(`ZATCA SDK launcher was not found: ${launcher}`);
  if (!fs.existsSync(configDir)) throw new Error(`ZATCA SDK config dir was not found: ${configDir}`);

  return { sdkRoot, sdkJar, launcher, configDir, javaBin, workDir, jqPath };
}

async function runFatoora(config, operation, xmlPath, options = {}) {
  const operationFlag = operation === "validate" ? "-validate" : "-generateHash";
  const env = { ...process.env };
  const pathParts = [path.dirname(config.javaBin)];
  if (fs.existsSync(config.jqPath)) {
    pathParts.push(path.dirname(config.jqPath));
  }
  const delimiter = process.platform === "win32" ? ";" : ":";
  env.PATH = `${pathParts.join(delimiter)}${delimiter}${env.PATH || env.Path || ""}`;
  if (process.platform === "win32") env.Path = env.PATH;
  const override = operation === "validate" && options.previousInvoiceHash ? await preparePihOverrideConfig(config, options.previousInvoiceHash) : null;
  env.SDK_CONFIG = override?.configPath || path.join(config.configDir, "config.json");
  env.FATOORA_HOME = path.join(config.sdkRoot, "Apps");

  const command = process.platform === "win32" && /\.bat$/i.test(config.launcher) ? process.env.ComSpec || "cmd.exe" : config.launcher;
  const args = command.toLowerCase().endsWith("cmd.exe") ? ["/d", "/c", config.launcher, operationFlag, "-invoice", xmlPath] : [operationFlag, "-invoice", xmlPath];

  try {
    return await new Promise((resolveResult) => {
      execFile(command, args, { cwd: config.sdkRoot, env, timeout: 60000, windowsHide: true, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        const maybeCode = error && typeof error.code === "number" ? error.code : null;
        resolveResult({
          exitCode: error ? maybeCode : 0,
          stdout: sanitize(String(stdout || "")),
          stderr: sanitize(String(stderr || error?.message || "")),
        });
      });
    });
  } finally {
    if (override?.dir) {
      await rm(override.dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function preparePihOverrideConfig(config, previousInvoiceHash) {
  const pihValue = String(previousInvoiceHash || "").trim();
  if (!pihValue) return null;

  const dir = await mkdtemp(path.join(config.workDir, "pih-config-"));
  const configDir = path.join(dir, "Configuration");
  const pihPath = path.join(dir, "pih.txt");
  const configPath = path.join(configDir, "config.json");
  const baseConfigPath = path.join(config.configDir, "config.json");
  const baseConfig = JSON.parse(await readFile(baseConfigPath, "utf8"));
  const tempConfig = { ...baseConfig, pihPath };
  for (const key of ["xsdPath", "enSchematron", "zatcaSchematron", "certPath", "privateKeyPath", "inputPath", "usagePathFile"]) {
    if (typeof tempConfig[key] === "string" && tempConfig[key].trim() && !path.isAbsolute(tempConfig[key])) {
      tempConfig[key] = path.resolve(config.configDir, tempConfig[key]);
    }
  }
  await mkdir(configDir, { recursive: true });
  await writeFile(pihPath, pihValue, "ascii");
  await writeFile(configPath, JSON.stringify(tempConfig, null, 2), "utf8");
  return { dir, configPath };
}

async function javaVersion(javaBin) {
  const result = await new Promise((resolveResult) => {
    execFile(javaBin, ["-version"], { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      resolveResult({ error, stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const version = parseJavaVersion(output);
  const major = version ? parseJavaMajorVersion(version) : null;
  return {
    javaBin,
    version,
    major,
    supported: major !== null && major >= 11 && major < 15,
  };
}

function parseJavaVersion(output) {
  const quoted = output.match(/version\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const openJdk = output.match(/openjdk\s+([0-9][^\s]*)/i);
  return openJdk?.[1] || null;
}

function parseJavaMajorVersion(version) {
  const legacy = version.match(/^1\.(\d+)/);
  if (legacy?.[1]) return Number(legacy[1]);
  const modern = version.match(/^(\d+)/);
  return modern?.[1] ? Number(modern[1]) : null;
}

function extractInvoiceHash(output) {
  return sanitize(output).match(/INVOICE\s+HASH\s*=\s*([A-Za-z0-9+/=]+)/i)?.[1] || null;
}

function extractValidationMessages(output) {
  return sanitize(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(validation result|GLOBAL VALIDATION RESULT|CODE :|WARNING|ERROR|BR-KSA|KSA-|QRCODE|SIGNATURE)\b/i.test(line))
    .slice(0, 80);
}

function sanitize(output) {
  return String(output || "")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED]")
    .replace(new RegExp(escapeRegExp(password), "g"), "[REDACTED]")
    .replace(/(password|passwordHash|token|tokenHash|secret|apiKey|accessKey|privateKey|privateKeyPem|authorization|contentBase64)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/(DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|JWT_SECRET|S3_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function safeError(error) {
  return sanitize(error?.message || error);
}

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "invoice";
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

async function requestJson(route, options = {}) {
  const response = await rawRequest(route, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${route} failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function rawRequest(route, options = {}) {
  const headers = { ...(options.body ? { "content-type": "application/json" } : {}) };
  if (options.auth !== false && options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.organizationId) {
    headers["x-organization-id"] = options.organizationId;
  }
  return fetch(`${apiUrl}${route}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
