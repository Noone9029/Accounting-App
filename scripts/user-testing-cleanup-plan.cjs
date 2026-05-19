#!/usr/bin/env node
"use strict";

const DEFAULT_API_URL = "https://ledgerbyte-api-test.vercel.app";
const KNOWN_USER_TESTING_ORG_IDS = new Set(["00000000-0000-0000-0000-000000000001"]);
const SAFE_REMOTE_HOSTS = new Set(["ledgerbyte-api-test.vercel.app"]);
const SAFE_REMOTE_HOST_SUFFIX = "-ahmad-khalid-s-projects.vercel.app";
const SAFE_REMOTE_HOST_PREFIX = "ledgerbyte-api-test-";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const COUNT_ENDPOINTS = [
  ["contacts", "/contacts"],
  ["items", "/items"],
  ["salesInvoices", "/sales-invoices"],
  ["purchaseBills", "/purchase-bills"],
  ["customerPayments", "/customer-payments"],
  ["supplierPayments", "/supplier-payments"],
  ["cashExpenses", "/cash-expenses"],
  ["stockMovements", "/stock-movements"],
  ["generatedDocuments", "/generated-documents"],
  ["emailOutbox", "/email/outbox"],
  ["emailSuppressions", "/email/suppressions"],
  ["emailSenderDomainEvidence", "/email/sender-domain-evidence"],
  ["emailMonitoringEvidence", "/email/monitoring-evidence"],
  ["backupRestoreEvidence", "/system/backup-evidence"],
  ["zatcaSubmissions", "/zatca/submissions"],
];

function boolEnv(value) {
  return String(value ?? "").toLowerCase() === "true";
}

function normalizeApiUrl(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function redactUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "[invalid-url]";
  }
}

function isAllowedUserTestingHost(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) {
    return true;
  }
  if (SAFE_REMOTE_HOSTS.has(host)) {
    return true;
  }
  return host.startsWith(SAFE_REMOTE_HOST_PREFIX) && host.endsWith(SAFE_REMOTE_HOST_SUFFIX);
}

function assertSafeConfiguration({ apiUrl, organizationId, allowUnknownOrg = false, allowUnsafeHost = false }) {
  if (!organizationId) {
    throw new Error("LEDGERBYTE_USER_TESTING_ORG_ID is required for cleanup planning.");
  }
  if (!allowUnknownOrg && !KNOWN_USER_TESTING_ORG_IDS.has(organizationId)) {
    throw new Error("Cleanup planner refuses unknown organization ids unless LEDGERBYTE_USER_TESTING_CLEANUP_ALLOW_UNKNOWN_ORG=true.");
  }
  if (!allowUnsafeHost && !isAllowedUserTestingHost(apiUrl)) {
    throw new Error("Cleanup planner refuses this API host. Use the user-testing API host or localhost only.");
  }
}

function summarizeCount(payload) {
  if (Array.isArray(payload)) {
    return payload.length;
  }
  if (payload && typeof payload === "object") {
    for (const key of ["items", "data", "records", "evidence", "suppressions", "events", "outbox", "documents"]) {
      if (Array.isArray(payload[key])) {
        return payload[key].length;
      }
    }
    if (typeof payload.count === "number") {
      return payload.count;
    }
    if (typeof payload.total === "number") {
      return payload.total;
    }
  }
  return null;
}

async function apiRequest(apiUrl, path, options = {}, session) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.organizationId ? { "x-organization-id": session.organizationId } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload ? String(payload.message) : response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${message}`);
  }
  return payload;
}

async function login(apiUrl, email, password, organizationId) {
  const loginResponse = await apiRequest(apiUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!loginResponse?.accessToken) {
    throw new Error("Login response did not include an access token.");
  }
  const me = await apiRequest(apiUrl, "/auth/me", {}, { token: loginResponse.accessToken, organizationId: "" });
  const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
  const membership = memberships.find((item) => item.status === "ACTIVE" && (item.organizationId ?? item.organization?.id) === organizationId);
  if (!membership) {
    throw new Error("Authenticated user is not an active member of the requested user-testing organization.");
  }
  return { token: loginResponse.accessToken, organizationId };
}

async function collectCounts(apiUrl, session) {
  const counts = [];
  for (const [label, path] of COUNT_ENDPOINTS) {
    try {
      const payload = await apiRequest(apiUrl, path, {}, session);
      counts.push({
        label,
        path,
        ok: true,
        count: summarizeCount(payload),
        contentPrinted: false,
      });
    } catch (error) {
      counts.push({
        label,
        path,
        ok: false,
        count: null,
        error: sanitizeError(error),
        contentPrinted: false,
      });
    }
  }
  return counts;
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]")
    .replace(/accessToken["']?\s*:\s*["'][^"']+["']/gi, "accessToken:[REDACTED]")
    .replace(/password["']?\s*:\s*["'][^"']+["']/gi, "password:[REDACTED]")
    .replace(/token["']?\s*:\s*["'][^"']+["']/gi, "token:[REDACTED]");
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildRecommendedSteps() {
  return [
    "Review counts and identify records by approved demo markers only.",
    "Create a separate reviewed deletion plan before any mutation.",
    "Test destructive cleanup against a Supabase branch or disposable database first.",
    "Re-run remote smoke and E2E after cleanup and reseeding.",
    "Rotate test credentials after broad user testing.",
  ];
}

async function runCleanupPlanFromEnv(env = process.env) {
  const apiUrl = normalizeApiUrl(env.LEDGERBYTE_USER_TESTING_API_URL ?? env.LEDGERBYTE_API_URL ?? DEFAULT_API_URL);
  const organizationId = env.LEDGERBYTE_USER_TESTING_ORG_ID ?? env.LEDGERBYTE_E2E_ORGANIZATION_ID;
  const email = env.LEDGERBYTE_USER_TESTING_CLEANUP_EMAIL ?? env.LEDGERBYTE_E2E_EMAIL;
  const password = env.LEDGERBYTE_USER_TESTING_CLEANUP_PASSWORD ?? env.LEDGERBYTE_E2E_PASSWORD;
  const allowUnknownOrg = boolEnv(env.LEDGERBYTE_USER_TESTING_CLEANUP_ALLOW_UNKNOWN_ORG);
  const allowUnsafeHost = boolEnv(env.LEDGERBYTE_USER_TESTING_CLEANUP_ALLOW_UNSAFE_HOST);

  assertSafeConfiguration({ apiUrl, organizationId, allowUnknownOrg, allowUnsafeHost });

  if (!email || !password) {
    throw new Error("Cleanup planner requires LEDGERBYTE_USER_TESTING_CLEANUP_EMAIL/PASSWORD or LEDGERBYTE_E2E_EMAIL/PASSWORD.");
  }

  const session = await login(apiUrl, email, password, organizationId);
  const counts = await collectCounts(apiUrl, session);

  return {
    dryRun: true,
    readOnly: true,
    noMutation: true,
    noDeletion: true,
    noCustomerEmailSent: true,
    noZatcaNetwork: true,
    noDocumentOrAttachmentDownload: true,
    noCustomerContentPrinted: true,
    tokenPrinted: false,
    target: {
      apiUrl: redactUrl(apiUrl),
      organizationId,
      knownUserTestingOrg: KNOWN_USER_TESTING_ORG_IDS.has(organizationId),
    },
    counts,
    recommendedSteps: buildRecommendedSteps(),
  };
}

if (require.main === module) {
  runCleanupPlanFromEnv()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(sanitizeError(error));
      process.exitCode = 1;
    });
}

module.exports = {
  KNOWN_USER_TESTING_ORG_IDS,
  SAFE_REMOTE_HOSTS,
  assertSafeConfiguration,
  boolEnv,
  isAllowedUserTestingHost,
  normalizeApiUrl,
  redactUrl,
  runCleanupPlanFromEnv,
  summarizeCount,
};
