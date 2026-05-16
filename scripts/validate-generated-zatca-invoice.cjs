#!/usr/bin/env node
const { mkdir, writeFile } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const apiUrl = trimTrailingSlash(process.env.LEDGERBYTE_API_URL || "http://localhost:4000");
const email = process.env.LEDGERBYTE_E2E_EMAIL || "admin@example.com";
const password = process.env.LEDGERBYTE_E2E_PASSWORD || "Password123!";
const invoiceId = argValue("--invoice-id") || process.env.ZATCA_INVOICE_ID;
const requestedOrganizationId = process.env.LEDGERBYTE_ORG_ID;

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: safeError(error) }, null, 2));
  process.exitCode = 1;
});

async function main() {
  if (!invoiceId) {
    throw new Error("Provide --invoice-id <id> or ZATCA_INVOICE_ID to validate generated invoice XML.");
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

  const me = await requestJson("/auth/me", { token: accessToken, auth: true });
  const membership =
    (requestedOrganizationId ? me.memberships?.find((item) => item.organization?.id === requestedOrganizationId) : null) ??
    me.memberships?.find((item) => item.status === "ACTIVE") ??
    me.memberships?.[0];

  if (!membership?.organization?.id) {
    throw new Error("Could not resolve an organization membership for SDK validation.");
  }

  const organizationId = membership.organization.id;
  const headers = { token: accessToken, organizationId };
  const metadata = await requestJson(`/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/generate`, {
    method: "POST",
    body: {},
    ...headers,
  });
  const xml = metadata.xmlBase64 ? Buffer.from(metadata.xmlBase64, "base64").toString("utf8") : await requestText(`/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/xml`, headers);
  const tempDir = join(tmpdir(), "ledgerbyte-zatca-generated");
  await mkdir(tempDir, { recursive: true });
  const xmlTempPath = join(tempDir, `${safeFilePart(invoiceId)}.xml`);
  await writeFile(xmlTempPath, xml, "utf8");

  const validation = await requestJson(`/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/sdk-validate`, {
    method: "POST",
    body: {},
    ...headers,
  });

  const summary = {
    ok: Boolean(validation.officialValidationAttempted && validation.success),
    apiUrl,
    invoiceId,
    organizationId,
    metadataId: metadata.id ?? null,
    xmlTempPath,
    sdk: {
      disabled: Boolean(validation.disabled),
      officialValidationAttempted: Boolean(validation.officialValidationAttempted),
      success: Boolean(validation.success),
      sdkExitCode: validation.sdkExitCode ?? null,
      sdkHashPresent: Boolean(validation.sdkHash),
      appHashPresent: Boolean(validation.appHash),
      hashMatches: validation.hashMatches ?? null,
      hashComparisonStatus: validation.hashComparisonStatus ?? "NOT_AVAILABLE",
      blockingReasons: validation.blockingReasons ?? [],
      warnings: validation.warnings ?? [],
      validationMessages: validation.validationMessages ?? [],
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!validation.officialValidationAttempted) {
    process.exitCode = 2;
  } else if (!validation.success) {
    process.exitCode = 1;
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] || null;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function safeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "invoice";
}

async function requestJson(path, options) {
  const response = await rawRequest(path, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed with HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function requestText(path, options) {
  const response = await rawRequest(path, { ...options, method: "GET" });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

async function rawRequest(path, options = {}) {
  const headers = { ...(options.body ? { "content-type": "application/json" } : {}) };
  if (options.auth !== false && options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.organizationId) {
    headers["x-organization-id"] = options.organizationId;
  }

  return fetch(`${apiUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function safeError(error) {
  return String(error?.message || error).replace(password, "[REDACTED]");
}
