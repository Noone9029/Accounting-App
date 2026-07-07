"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  REQUIRED_PACKAGE_SCRIPTS,
  REQUIRED_SURFACES,
  STATUS_BLOCKED,
  STATUS_PASSED,
  buildSupportEmailReadinessProof,
  formatText,
} = require("./support-email-readiness-proof.cjs");

test("passes when email and support readiness proof surfaces are present", () => {
  const result = buildSupportEmailReadinessProof({ cwd: createFixtureRepo() });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.metadataOnly, true);
  assert.equal(result.localStaticOnly, true);
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.secretsPrinted, false);
  assert.equal(result.customerDataUsed, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.databaseConnectionsMade, false);
  assert.equal(result.hostedMutationsMade, false);
  assert.equal(result.hostedMigrationsRun, false);
  assert.equal(result.emailSent, false);
  assert.equal(result.providerCallsMade, false);
  assert.equal(result.supportTicketCreated, false);
  assert.equal(result.blockers.length, 0);
});

test("blocks when a required support/email surface is missing", () => {
  const result = buildSupportEmailReadinessProof({
    cwd: createFixtureRepo({ omitSurfaceId: "email-delivery-architecture" }),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_SURFACE_INVALID: email-delivery-architecture/);
});

test("blocks when a required support/email safety boundary drifts", () => {
  const result = buildSupportEmailReadinessProof({
    cwd: createFixtureRepo({
      overrideSurfaceText: {
        "docs/email/EMAIL_DELIVERY_ARCHITECTURE.md": "# Email\n\nThis incomplete doc lacks the required safety contract.\n",
      },
    }),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  const architectureCheck = result.proofSurfaces.checks.find((check) => check.id === "email-delivery-architecture");
  assert.ok(architectureCheck.missingText.includes("Real provider delivery remains disabled by default."));
});

test("blocks when package scripts drift from the expected local proof commands", () => {
  const result = buildSupportEmailReadinessProof({
    cwd: createFixtureRepo({
      packageScripts: {
        ...REQUIRED_PACKAGE_SCRIPTS,
        "support:email-readiness-proof": "node unsafe-email-proof.js",
      },
    }),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_PACKAGE_SCRIPT_INVALID: support:email-readiness-proof/);
});

test("json CLI output is parseable and reports no hosted operations or email sends", () => {
  const repoRoot = createFixtureRepo();
  const scriptPath = path.join(__dirname, "support-email-readiness-proof.cjs");
  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, STATUS_PASSED);
  assert.equal(parsed.networkCallsMade, false);
  assert.equal(parsed.databaseConnectionsMade, false);
  assert.equal(parsed.hostedMutationsMade, false);
  assert.equal(parsed.hostedMigrationsRun, false);
  assert.equal(parsed.emailSent, false);
  assert.equal(parsed.providerCallsMade, false);
  assert.equal(parsed.supportTicketCreated, false);
});

test("formatted output excludes secrets, raw emails, customer data, and provider payloads", () => {
  const result = buildSupportEmailReadinessProof({ cwd: createFixtureRepo() });
  const serialized = `${JSON.stringify(result)}\n${formatText(result)}`;

  assert.doesNotMatch(serialized, /SMTP_PASSWORD=.*|EMAIL_PROVIDER_WEBHOOK_SECRET=.*|BEGIN PRIVATE KEY|Authorization: Bearer/i);
  assert.doesNotMatch(serialized, /customer@example\.com|raw provider payload|message body/i);
});

test("script source stays static and does not import execution, network, database, email, or provider APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "support-email-readiness-proof.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|NestFactory|nodemailer|sendMail/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-support-email-readiness-"));
  write(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "fixture-ledgerbyte",
        private: true,
        scripts: options.packageScripts || REQUIRED_PACKAGE_SCRIPTS,
      },
      null,
      2,
    )}\n`,
  );

  for (const surface of REQUIRED_SURFACES) {
    if (surface.id === options.omitSurfaceId) {
      continue;
    }
    write(repoRoot, surface.path, options.overrideSurfaceText?.[surface.path] || buildSurfaceText(surface));
  }

  return repoRoot;
}

function buildSurfaceText(surface) {
  return [`# ${surface.id}`, "", ...surface.requiredText].join("\n");
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
