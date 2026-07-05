#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS_LOCAL_REVIEW = "PRODUCTION_ENV_PREFLIGHT_LOCAL_REVIEW";
const STATUS_PASSED = "PRODUCTION_ENV_PREFLIGHT_PASSED";
const STATUS_BLOCKED = "PRODUCTION_ENV_PREFLIGHT_BLOCKED";

const MINIMUM_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRET_PATTERN = /(?:replace[-_ ]?me|change[-_ ]?me|placeholder|example|dummy|dev-only-secret|test-only-secret|your[-_])/i;
const PLACEHOLDER_URL_PATTERN = /(?:replace[-_ ]?me|change[-_ ]?me|placeholder|dummy|dev-only-secret|test-only-secret|your[-_])/i;
const PRODUCTION_NAMES = new Set(["production", "prod"]);

const CLEANUP_SCRIPT_EXPECTATIONS = {
  "security:cleanup": "corepack pnpm --filter @ledgerbyte/api security:cleanup",
  "security:cleanup:dry-run": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run",
  "security:cleanup:execute": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute",
};

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    json: false,
    strict: false,
    production: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--production") {
      parsed.production = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/production-env-preflight.cjs --json",
    "  node scripts/production-env-preflight.cjs --json --strict",
    "  node scripts/production-env-preflight.cjs --json --production",
    "",
    "This preflight classifies selected production environment settings without printing values.",
    "It makes no network calls, no database calls, no hosted mutations, no migrations, no cleanup execution, and no provider calls.",
  ].join("\n");
}

function buildProductionEnvPreflight(options = {}) {
  const env = options.env || process.env;
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const strictMode = Boolean(options.strict);
  const productionProfile = Boolean(options.production || options.strict || isProductionLike(env));
  const checks = [];
  const blockers = [];
  const warnings = [];

  evaluateJwtSecret({ env, productionProfile, checks, blockers, warnings });
  evaluateCors({ env, productionProfile, checks, blockers, warnings });
  evaluateAuthCookie({ env, productionProfile, checks, blockers, warnings });
  evaluateNextPublicApiUrl({ env, productionProfile, checks, blockers, warnings });
  evaluateDatabaseUrls({ env, productionProfile, checks, blockers, warnings });
  evaluateCleanupScripts({ repoRoot, productionProfile, checks, blockers, warnings });

  const status = blockers.length > 0 ? STATUS_BLOCKED : productionProfile ? STATUS_PASSED : STATUS_LOCAL_REVIEW;

  return {
    status,
    strictMode,
    productionProfile,
    repoRoot,
    readOnly: true,
    noNetwork: true,
    noDatabaseConnection: true,
    noMutation: true,
    noHostedMutation: true,
    noHostedMigration: true,
    noCleanupExecute: true,
    noProviderCall: true,
    noSecretsPrinted: true,
    valuesPrinted: false,
    checks,
    blockers: unique(blockers),
    warnings: unique(warnings),
    remainingManualGates: [
      "Hosted migrations must run only through the approved deployment process.",
      "security:cleanup -- --execute must not run without owner approval and production runbook review.",
      "Production secret values must stay in the approved secret store and must not be copied into evidence.",
      "A passed local preflight does not prove provider-side env values unless run inside the approved target environment.",
    ],
  };
}

function evaluateJwtSecret({ env, productionProfile, checks, blockers, warnings }) {
  const value = readEnvValue(env, "JWT_SECRET");
  if (!productionProfile && !value.present) {
    addCheck(checks, "JWT_SECRET", "skip", "JWT_SECRET not required for local non-production preflight.");
    return;
  }

  if (!value.present) {
    block(checks, blockers, "JWT_SECRET", "JWT_SECRET must be present for production-like environments.");
    return;
  }

  if (PLACEHOLDER_SECRET_PATTERN.test(value.raw)) {
    block(checks, blockers, "JWT_SECRET", "JWT_SECRET must not be a placeholder or development fallback value.");
    return;
  }

  if (value.raw.length < MINIMUM_JWT_SECRET_LENGTH) {
    block(checks, blockers, "JWT_SECRET", `JWT_SECRET must be at least ${MINIMUM_JWT_SECRET_LENGTH} characters for production-like environments.`);
    return;
  }

  addCheck(checks, "JWT_SECRET", "pass", "JWT_SECRET is present and meets the minimum production length check.");
  if (!productionProfile) {
    warnings.push("JWT_SECRET is present in a local preflight; value was classified but not printed.");
  }
}

function evaluateCors({ env, productionProfile, checks, blockers, warnings }) {
  const value = readEnvValue(env, "CORS_ORIGIN");
  if (!productionProfile && !value.present) {
    addCheck(checks, "CORS_ORIGIN", "skip", "CORS_ORIGIN not required for local non-production preflight.");
    return;
  }

  if (!value.present) {
    block(checks, blockers, "CORS_ORIGIN", "CORS_ORIGIN must be configured for production-like environments.");
    return;
  }

  const origins = parseCorsOrigins(value.raw);
  if (!origins.valid) {
    block(checks, blockers, "CORS_ORIGIN", origins.message);
    return;
  }

  for (const origin of origins.entries) {
    if (origin.wildcardAll) {
      block(checks, blockers, "CORS_ORIGIN", "CORS_ORIGIN must not use wildcard-all origins in production-like environments.");
      return;
    }
    if (productionProfile && origin.protocol !== "https:") {
      block(checks, blockers, "CORS_ORIGIN", "CORS_ORIGIN entries must use HTTPS in production-like environments.");
      return;
    }
    if (productionProfile && origin.hostClass === "local") {
      block(checks, blockers, "CORS_ORIGIN", "CORS_ORIGIN must not point at localhost in production-like environments.");
      return;
    }
    if (origin.wildcardSubdomain) {
      warnings.push("CORS_ORIGIN includes a wildcard subdomain entry; keep this limited to staging/user-testing unless explicitly approved for production.");
    }
  }

  addCheck(checks, "CORS_ORIGIN", "pass", `CORS_ORIGIN has ${origins.entries.length} allowed origin entry or entries without printing values.`, {
    originCount: origins.entries.length,
    originClasses: origins.entries.map((origin) => ({
      protocol: origin.protocol,
      hostClass: origin.hostClass,
      wildcardSubdomain: origin.wildcardSubdomain,
    })),
  });
}

function evaluateAuthCookie({ env, productionProfile, checks, blockers, warnings }) {
  const secure = readEnvValue(env, "AUTH_COOKIE_SECURE");
  const sameSite = readEnvValue(env, "AUTH_COOKIE_SAME_SITE");
  const domain = readEnvValue(env, "AUTH_COOKIE_DOMAIN");

  if (productionProfile && secure.present && secure.raw.toLowerCase() === "false") {
    block(checks, blockers, "AUTH_COOKIE_SECURE", "AUTH_COOKIE_SECURE=false is not allowed in production-like environments.");
  } else if (productionProfile) {
    addCheck(checks, "AUTH_COOKIE_SECURE", "pass", "Production-like auth cookies are not explicitly configured as insecure.");
  } else {
    addCheck(checks, "AUTH_COOKIE_SECURE", "skip", "Secure cookie enforcement is not required for local non-production preflight.");
  }

  if (sameSite.present && !["lax", "strict", "none"].includes(sameSite.raw.toLowerCase())) {
    block(checks, blockers, "AUTH_COOKIE_SAME_SITE", "AUTH_COOKIE_SAME_SITE must be one of lax, strict, or none.");
  } else if (sameSite.present && sameSite.raw.toLowerCase() === "none" && secure.raw.toLowerCase() !== "true") {
    block(checks, blockers, "AUTH_COOKIE_SAME_SITE", "SameSite=None requires AUTH_COOKIE_SECURE=true.");
  } else {
    addCheck(checks, "AUTH_COOKIE_SAME_SITE", "pass", sameSite.present ? "AUTH_COOKIE_SAME_SITE has an accepted value." : "AUTH_COOKIE_SAME_SITE is unset; runtime defaults apply.");
  }

  if (domain.present && isLocalHostname(stripLeadingDot(domain.raw))) {
    block(checks, blockers, "AUTH_COOKIE_DOMAIN", "AUTH_COOKIE_DOMAIN must not be localhost in production-like environments.");
  } else if (productionProfile && !domain.present) {
    addCheck(checks, "AUTH_COOKIE_DOMAIN", "warn", "AUTH_COOKIE_DOMAIN is unset; this can be valid for same-host deployments but must be reviewed for split web/API domains.");
    warnings.push("AUTH_COOKIE_DOMAIN is unset; review cookie scope for the final web/API domain topology.");
  } else {
    addCheck(checks, "AUTH_COOKIE_DOMAIN", "pass", domain.present ? "AUTH_COOKIE_DOMAIN is configured without printing the value." : "AUTH_COOKIE_DOMAIN is unset for local preflight.");
  }
}

function evaluateNextPublicApiUrl({ env, productionProfile, checks, blockers, warnings }) {
  const value = readEnvValue(env, "NEXT_PUBLIC_API_URL");
  if (!value.present) {
    addCheck(checks, "NEXT_PUBLIC_API_URL", productionProfile ? "warn" : "skip", "NEXT_PUBLIC_API_URL is absent in this process; verify it in the web project environment.");
    if (productionProfile) {
      warnings.push("NEXT_PUBLIC_API_URL is absent from this process; verify the deployed web environment separately.");
    }
    return;
  }

  const classified = classifyUrl(value.raw);
  if (!classified.valid) {
    block(checks, blockers, "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL must be a valid URL.");
    return;
  }
  if (productionProfile && classified.protocol !== "https:") {
    block(checks, blockers, "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL must use HTTPS in production-like environments.");
    return;
  }
  if (productionProfile && classified.hostClass === "local") {
    block(checks, blockers, "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL must not point at localhost in production-like environments.");
    return;
  }

  addCheck(checks, "NEXT_PUBLIC_API_URL", "pass", "NEXT_PUBLIC_API_URL is valid for the selected profile without printing the value.", {
    protocol: classified.protocol,
    hostClass: classified.hostClass,
  });
}

function evaluateDatabaseUrls({ env, productionProfile, checks, blockers, warnings }) {
  const databaseUrl = readEnvValue(env, "DATABASE_URL");
  const directUrl = readEnvValue(env, "DIRECT_URL");

  if (!productionProfile && !databaseUrl.present) {
    addCheck(checks, "DATABASE_URL", "skip", "DATABASE_URL not required for local non-production preflight.");
  } else if (!databaseUrl.present) {
    block(checks, blockers, "DATABASE_URL", "DATABASE_URL must be present for production-like API runtime environments.");
  } else {
    evaluateDatabaseUrlValue({ name: "DATABASE_URL", value: databaseUrl.raw, productionProfile, checks, blockers });
  }

  if (directUrl.present) {
    evaluateDatabaseUrlValue({ name: "DIRECT_URL", value: directUrl.raw, productionProfile, checks, blockers });
    if (databaseUrl.present && directUrl.raw === databaseUrl.raw) {
      block(checks, blockers, "DIRECT_URL", "DIRECT_URL must not equal DATABASE_URL; migration/admin credentials must stay separated from runtime credentials.");
    } else {
      warnings.push("DIRECT_URL is present in this process; verify it is reserved for approved migration/direct workflows and not ordinary API runtime traffic.");
    }
  } else if (productionProfile) {
    addCheck(checks, "DIRECT_URL", "warn", "DIRECT_URL is absent; confirm the approved migration process has a separate direct/admin credential.");
    warnings.push("DIRECT_URL is absent; production migrations still require approved direct/admin credential handling outside ordinary runtime traffic.");
  } else {
    addCheck(checks, "DIRECT_URL", "skip", "DIRECT_URL not required for local non-production preflight.");
  }
}

function evaluateDatabaseUrlValue({ name, value, productionProfile, checks, blockers }) {
  const classified = classifyUrl(value);
  if (!classified.valid) {
    block(checks, blockers, name, `${name} must be a valid URL.`);
    return;
  }
  if (!["postgres:", "postgresql:"].includes(classified.protocol)) {
    block(checks, blockers, name, `${name} must use a Postgres URL.`);
    return;
  }
  if (PLACEHOLDER_URL_PATTERN.test(value)) {
    block(checks, blockers, name, `${name} must not be a placeholder value.`);
    return;
  }
  if (productionProfile && classified.hostClass === "local") {
    block(checks, blockers, name, `${name} must not point at a local database in production-like environments.`);
    return;
  }

  addCheck(checks, name, "pass", `${name} is a valid Postgres URL for the selected profile without printing the value.`, {
    protocol: classified.protocol,
    hostClass: classified.hostClass,
  });
}

function evaluateCleanupScripts({ repoRoot, productionProfile, checks, blockers, warnings }) {
  const packagePath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    const message = "package.json was not found; security cleanup package scripts could not be verified.";
    if (productionProfile) {
      block(checks, blockers, "SECURITY_CLEANUP_SCRIPTS", message);
    } else {
      addCheck(checks, "SECURITY_CLEANUP_SCRIPTS", "warn", message);
      warnings.push(message);
    }
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    block(checks, blockers, "SECURITY_CLEANUP_SCRIPTS", "package.json could not be parsed.");
    return;
  }

  const scripts = parsed.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  for (const [name, expectedCommand] of Object.entries(CLEANUP_SCRIPT_EXPECTATIONS)) {
    if (scripts[name] !== expectedCommand) {
      block(checks, blockers, `SECURITY_CLEANUP_SCRIPT:${name}`, `Package script ${name} must point at the expected security cleanup command.`);
    } else {
      addCheck(checks, `SECURITY_CLEANUP_SCRIPT:${name}`, "pass", `Package script ${name} is present and points at the expected command.`);
    }
  }
}

function isProductionLike(env) {
  return [env.APP_ENV, env.NODE_ENV, env.VERCEL_ENV].some((value) => PRODUCTION_NAMES.has(String(value || "").toLowerCase()));
}

function readEnvValue(env, name) {
  const raw = Object.prototype.hasOwnProperty.call(env, name) ? String(env[name] ?? "").trim() : "";
  return {
    present: raw.length > 0,
    raw,
  };
}

function parseCorsOrigins(rawValue) {
  const parts = rawValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) {
    return { valid: false, message: "CORS_ORIGIN must include at least one origin." };
  }

  const entries = [];
  for (const part of parts) {
    if (part === "*") {
      entries.push({ wildcardAll: true, wildcardSubdomain: false, protocol: "*", hostClass: "wildcard" });
      continue;
    }
    const wildcardSubdomain = part.includes("*.");
    const parseable = wildcardSubdomain ? part.replace("*.", "wildcard.") : part;
    const classified = classifyUrl(parseable);
    if (!classified.valid) {
      return { valid: false, message: "CORS_ORIGIN contains an invalid origin." };
    }
    entries.push({
      wildcardAll: false,
      wildcardSubdomain,
      protocol: classified.protocol,
      hostClass: classified.hostClass,
    });
  }

  return { valid: true, entries };
}

function classifyUrl(rawValue) {
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    return { valid: false };
  }

  return {
    valid: true,
    protocol: parsed.protocol,
    hostClass: classifyHost(parsed.hostname),
  };
}

function classifyHost(hostname) {
  const host = stripLeadingDot(String(hostname || "").toLowerCase());
  if (isLocalHostname(host)) {
    return "local";
  }
  if (isPrivateHostname(host)) {
    return "private";
  }
  return "external";
}

function stripLeadingDot(value) {
  return value.replace(/^\./, "");
}

function isLocalHostname(host) {
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}

function isPrivateHostname(host) {
  return (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function addCheck(checks, id, status, message, metadata = {}) {
  checks.push({
    id,
    status,
    message,
    valuePrinted: false,
    ...metadata,
  });
}

function block(checks, blockers, id, message) {
  addCheck(checks, id, "block", message);
  blockers.push(message);
}

function formatText(result) {
  const lines = [
    `Production env preflight: ${result.status}`,
    `Strict mode: ${result.strictMode}`,
    `Production profile: ${result.productionProfile}`,
    `No network: ${result.noNetwork}`,
    `No database connection: ${result.noDatabaseConnection}`,
    `No mutation: ${result.noMutation}`,
    `No hosted migration: ${result.noHostedMigration}`,
    `No cleanup execute: ${result.noCleanupExecute}`,
    `No secrets printed: ${result.noSecretsPrinted}`,
    "",
    "Checks:",
    ...result.checks.map((check) => `- ${check.status}: ${check.id} - ${check.message}`),
    "",
    "Blockers:",
    ...(result.blockers.length ? result.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Warnings:",
    ...(result.warnings.length ? result.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Remaining manual gates:",
    ...result.remainingManualGates.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

function resolveRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json")) || fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(start);
    }
    current = parent;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function main() {
  let parsed;
  try {
    parsed = parseArgs();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (parsed.help) {
    console.log(usage());
    return;
  }

  const result = buildProductionEnvPreflight({
    cwd: process.cwd(),
    strict: parsed.strict,
    production: parsed.production,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatText(result));
  }

  if (result.status === STATUS_BLOCKED) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  STATUS_BLOCKED,
  STATUS_LOCAL_REVIEW,
  STATUS_PASSED,
  CLEANUP_SCRIPT_EXPECTATIONS,
  parseArgs,
  usage,
  buildProductionEnvPreflight,
  formatText,
  classifyUrl,
  parseCorsOrigins,
  resolveRepoRoot,
};
