const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  STATUS_BLOCKED,
  STATUS_LOCAL_REVIEW,
  STATUS_PASSED,
  buildProductionEnvPreflight,
  formatText,
  parseArgs,
} = require("./production-env-preflight.cjs");

test("default local run is non-mutating and does not require production secrets", () => {
  const result = buildProductionEnvPreflight({ env: {}, repoRoot: createFixtureRepo() });

  assert.equal(result.status, STATUS_LOCAL_REVIEW);
  assert.equal(result.productionProfile, false);
  assert.equal(result.noNetwork, true);
  assert.equal(result.noDatabaseConnection, true);
  assert.equal(result.noMutation, true);
  assert.equal(result.noSecretsPrinted, true);
  assert.equal(result.blockers.length, 0);
});

test("strict production profile passes with safe synthetic values", () => {
  const env = safeProductionEnv();
  const result = buildProductionEnvPreflight({ env, repoRoot: createFixtureRepo(), strict: true });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.productionProfile, true);
  assert.equal(result.blockers.length, 0);
  assert.ok(result.checks.some((check) => check.id === "JWT_SECRET" && check.status === "pass"));
  assert.ok(result.checks.some((check) => check.id === "CORS_ORIGIN" && check.status === "pass"));
  assert.ok(result.checks.some((check) => check.id === "AUTH_COOKIE_SECURE" && check.status === "pass"));
});

test("strict production profile blocks missing or weak JWT secret values", () => {
  const missing = buildProductionEnvPreflight({ env: { ...safeProductionEnv(), JWT_SECRET: "" }, repoRoot: createFixtureRepo(), strict: true });
  const placeholder = buildProductionEnvPreflight({
    env: { ...safeProductionEnv(), JWT_SECRET: "replace-me-with-a-real-production-secret" },
    repoRoot: createFixtureRepo(),
    strict: true,
  });
  const short = buildProductionEnvPreflight({ env: { ...safeProductionEnv(), JWT_SECRET: "short" }, repoRoot: createFixtureRepo(), strict: true });

  assert.equal(missing.status, STATUS_BLOCKED);
  assert.match(missing.blockers.join("\n"), /JWT_SECRET must be present/);
  assert.equal(placeholder.status, STATUS_BLOCKED);
  assert.match(placeholder.blockers.join("\n"), /JWT_SECRET must not be a placeholder/);
  assert.equal(short.status, STATUS_BLOCKED);
  assert.match(short.blockers.join("\n"), /JWT_SECRET must be at least/);
});

test("strict production profile blocks wildcard, non-https, and localhost CORS origins", () => {
  for (const corsOrigin of ["*", "http://ledgerbyte.example", "https://localhost:3000"]) {
    const result = buildProductionEnvPreflight({
      env: { ...safeProductionEnv(), CORS_ORIGIN: corsOrigin },
      repoRoot: createFixtureRepo(),
      strict: true,
    });

    assert.equal(result.status, STATUS_BLOCKED, corsOrigin);
    assert.match(result.blockers.join("\n"), /CORS_ORIGIN/);
  }
});

test("strict production profile blocks insecure cookie and public API URL settings", () => {
  const insecureCookie = buildProductionEnvPreflight({
    env: { ...safeProductionEnv(), AUTH_COOKIE_SECURE: "false" },
    repoRoot: createFixtureRepo(),
    strict: true,
  });
  const sameSiteNone = buildProductionEnvPreflight({
    env: { ...safeProductionEnv(), AUTH_COOKIE_SAME_SITE: "none", AUTH_COOKIE_SECURE: "false" },
    repoRoot: createFixtureRepo(),
    strict: true,
  });
  const localApi = buildProductionEnvPreflight({
    env: { ...safeProductionEnv(), NEXT_PUBLIC_API_URL: "http://localhost:4000" },
    repoRoot: createFixtureRepo(),
    strict: true,
  });

  assert.equal(insecureCookie.status, STATUS_BLOCKED);
  assert.match(insecureCookie.blockers.join("\n"), /AUTH_COOKIE_SECURE=false/);
  assert.equal(sameSiteNone.status, STATUS_BLOCKED);
  assert.match(sameSiteNone.blockers.join("\n"), /SameSite=None/);
  assert.equal(localApi.status, STATUS_BLOCKED);
  assert.match(localApi.blockers.join("\n"), /NEXT_PUBLIC_API_URL/);
});

test("strict production profile blocks local runtime DB URLs and identical direct URLs", () => {
  const localRuntime = buildProductionEnvPreflight({
    env: {
      ...safeProductionEnv(),
      DATABASE_URL: "postgresql://localhost:5432/accounting?schema=public",
    },
    repoRoot: createFixtureRepo(),
    strict: true,
  });
  const identicalDirect = buildProductionEnvPreflight({
    env: {
      ...safeProductionEnv(),
      DIRECT_URL: safeProductionEnv().DATABASE_URL,
    },
    repoRoot: createFixtureRepo(),
    strict: true,
  });

  assert.equal(localRuntime.status, STATUS_BLOCKED);
  assert.match(localRuntime.blockers.join("\n"), /DATABASE_URL must not point at a local database/);
  assert.equal(identicalDirect.status, STATUS_BLOCKED);
  assert.match(identicalDirect.blockers.join("\n"), /DIRECT_URL must not equal DATABASE_URL/);
});

test("output redacts real-looking values while still reporting variable names", () => {
  const env = {
    ...safeProductionEnv(),
    JWT_SECRET: "super-secret-production-jwt-value-that-must-not-print",
    DATABASE_URL: "postgresql://db.example.internal:6543/ledgerbyte_prod?schema=public",
    DIRECT_URL: "postgresql://db.example.internal:5432/ledgerbyte_prod?schema=public",
  };
  const result = buildProductionEnvPreflight({ env, repoRoot: createFixtureRepo(), strict: true });
  const serialized = `${JSON.stringify(result)}\n${formatText(result)}`;

  assert.match(serialized, /JWT_SECRET/);
  assert.match(serialized, /DATABASE_URL/);
  assert.doesNotMatch(serialized, /super-secret-production-jwt-value-that-must-not-print/);
  assert.doesNotMatch(serialized, /db\.example\.internal|ledgerbyte_prod/);
});

test("script source stays local-only and does not import network, database, or process mutation APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "production-env-preflight.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|nodemailer|sendMail/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

test("parses command line flags", () => {
  assert.deepEqual(parseArgs(["--json", "--strict"]), { json: true, strict: true, production: false, help: false });
  assert.deepEqual(parseArgs(["--production"]), { json: false, strict: false, production: true, help: false });
});

function safeProductionEnv() {
  return {
    APP_ENV: "production",
    NODE_ENV: "production",
    JWT_SECRET: "0123456789abcdef0123456789abcdef",
    CORS_ORIGIN: "https://app.ledgerbyte.example,https://api.ledgerbyte.example",
    AUTH_COOKIE_SECURE: "true",
    AUTH_COOKIE_SAME_SITE: "lax",
    AUTH_COOKIE_DOMAIN: ".ledgerbyte.example",
    NEXT_PUBLIC_API_URL: "https://api.ledgerbyte.example",
    DATABASE_URL: "postgresql://db.example.internal:6543/ledgerbyte_app?schema=public",
    DIRECT_URL: "postgresql://db.example.internal:5432/ledgerbyte_app?schema=public",
  };
}

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-prod-env-preflight-"));
  const scripts = options.omitCleanupScripts
    ? {}
    : {
        "security:cleanup": "corepack pnpm --filter @ledgerbyte/api security:cleanup",
        "security:cleanup:dry-run": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run",
        "security:cleanup:execute": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute",
      };
  fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ name: "fixture-ledgerbyte", private: true, scripts }, null, 2));
  return repoRoot;
}
