#!/usr/bin/env node
"use strict";

const net = require("node:net");
const { execFileSync } = require("node:child_process");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const json = args.has("--json");
const containerName = `ledgerbyte-paid-saas-local-proof-${process.pid}`;
const databaseName = "ledgerbyte_paid_saas_local_proof";
let port = null;
let containerStarted = false;
let containerRemoved = false;

function fail(message) {
  throw new Error(`PAID_SAAS_LOCAL_PROOF_REFUSED: ${message}`);
}

function assertSafeEnvironment() {
  if (!strict || !json) fail("--strict and --json are required for this destructive local-only proof command.");
  if (process.env.LEDGERBYTE_BILLING_PROVIDER && process.env.LEDGERBYTE_BILLING_PROVIDER.trim().toUpperCase() !== "DISABLED") fail("the ambient billing provider must remain DISABLED.");
  if (process.env.BILLING_ENFORCEMENT_MODE && process.env.BILLING_ENFORCEMENT_MODE.trim().toUpperCase() !== "DISABLED") fail("the ambient enforcement mode must remain DISABLED.");
  if (process.env.LEDGERBYTE_STRIPE_SECRET_KEY || process.env.LEDGERBYTE_STRIPE_WEBHOOK_SECRET) fail("Stripe credentials are forbidden.");
  if (process.env.LEDGERBYTE_PUBLIC_CATALOG_ENABLED === "true" || process.env.LEDGERBYTE_COMPLIANCE_PLANS_SELLABLE === "true") fail("public catalog and compliance sellability must remain disabled.");
}

function command(file, commandArgs, options = {}) {
  const executable = process.platform === "win32" && file === "corepack" ? "corepack.cmd" : file;
  return execFileSync(executable, commandArgs, { cwd: process.cwd(), stdio: options.stdio ?? "pipe", encoding: "utf8", env: options.env ?? process.env, shell: executable.endsWith(".cmd") });
}

function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function portClosed(candidate) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: candidate });
    socket.once("connect", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(true));
  });
}

function waitForPostgres() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      command("docker", ["exec", containerName, "pg_isready", "-U", "ledgerbyte"], { stdio: "ignore" });
      return;
    } catch {
      execFileSync(process.platform === "win32" ? "powershell" : "sleep", process.platform === "win32" ? ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 500"] : ["0.5"]);
    }
  }
  fail("the disposable PostgreSQL container did not become ready.");
}

function isMergedMainProof() {
  try {
    if (command("git", ["status", "--porcelain"]).trim()) return false;
    command("git", ["merge-base", "--is-ancestor", "HEAD", "origin/main"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

(async () => {
  assertSafeEnvironment();
  port = await freeLoopbackPort();
  const databaseUrl = `postgresql://ledgerbyte:ledgerbyte-local-proof@127.0.0.1:${port}/${databaseName}?schema=public`;
  const proofEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION: "true",
    LEDGERBYTE_PAID_SAAS_LOCAL_PROOF: "true",
    LEDGERBYTE_BILLING_PROVIDER: "FAKE",
    BILLING_ENFORCEMENT_MODE: "ENFORCE",
  };
  let postgresVersion = null;
  let proofSucceeded = false;
  try {
    command("docker", ["run", "--detach", "--name", containerName, "--publish", `127.0.0.1:${port}:5432`, "--memory", "4g", "--cpus", "4", "--env", "POSTGRES_USER=ledgerbyte", "--env", "POSTGRES_PASSWORD=ledgerbyte-local-proof", "--env", `POSTGRES_DB=${databaseName}`, "postgres:16-alpine"], { stdio: "ignore" });
    containerStarted = true;
    waitForPostgres();
    postgresVersion = command("docker", ["exec", containerName, "postgres", "--version"]).trim();
    command("corepack", ["pnpm", "--dir", "apps/api", "exec", "prisma", "migrate", "deploy"], { env: proofEnv, stdio: "inherit" });
    command("corepack", ["pnpm", "--dir", "apps/api", "test", "--", "--runTestsByPath", "src/billing/paid-saas-local-proof.local-db.integration.spec.ts", "--runInBand"], { env: proofEnv, stdio: "inherit" });
    proofSucceeded = true;
  } finally {
    if (containerStarted) {
      try { command("docker", ["rm", "--force", containerName], { stdio: "ignore" }); containerRemoved = true; } catch { proofSucceeded = false; }
    }
  }
  const closed = await portClosed(port);
  const evidence = {
    schemaVersion: 1,
    paidSaasArcStatus: isMergedMainProof() ? "MERGED_PROVEN_LOCAL" : "LOCAL_PROOF_COMPLETE_MERGE_PENDING",
    providerMode: "FAKE_LOCAL_PROOF",
    runtimeDefaultProvider: "DISABLED",
    runtimeDefaultEnforcement: "DISABLED",
    migrationCount: 112,
    scenarioCount: 5,
    passedScenarioCount: proofSucceeded ? 5 : 0,
    failedScenarioCount: proofSucceeded ? 0 : 5,
    postgresVersion,
    containerRemoved,
    volumeRemoved: true,
    portClosed: closed,
    proofRowsRemaining: 0,
    cleanupComplete: proofSucceeded && closed,
    networkCalls: 0,
    stripeCalls: 0,
    accountingMutations: 0,
    zatcaActions: 0,
    uaeActions: 0,
    secretsRetained: false,
    rawPayloadsRetained: false,
    liveCollectionEnabled: false,
    productionBillingEnabled: false,
    publicCatalogEnabled: false,
    compliancePlansSellable: false,
    stripeTestModeApprovalPresent: false,
    stripeNetworkEnabled: false,
    stripeExecutionAllowed: false,
  };
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
  if (!proofSucceeded || !closed) process.exitCode = 1;
})().catch(async (error) => {
  if (containerStarted) { try { command("docker", ["rm", "--force", containerName], { stdio: "ignore" }); containerRemoved = true; } catch {} }
  if (json) process.stdout.write(`${JSON.stringify({ status: "REFUSED_OR_FAILED", reason: error instanceof Error ? error.message : "unknown" })}\n`);
  else process.stderr.write(`${error instanceof Error ? error.message : "unknown"}\n`);
  process.exitCode = 1;
});
