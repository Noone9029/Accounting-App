#!/usr/bin/env node
"use strict";

// Run only inside scripts/run-resource-bounded.py and with-local-postgres.py.
// This consumes already-built apps and an already-migrated disposable database.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { setTimeout: delay } = require("node:timers/promises");
const root = path.resolve(__dirname, "..");

function validateDatabase(value) {
  const url = new URL(value || "invalid:");
  const name = url.pathname.slice(1);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/^ledgerbyte_[a-z0-9_]*(?:proof|test)[a-z0-9_]*$/.test(name)) throw new Error("Disposable local proof database required.");
  return value;
}
function backendRoute(url) {
  const pathname = new URL(url, "http://127.0.0.1").pathname;
  return !pathname.startsWith("/api/locale") && (pathname === "/api" || pathname.startsWith("/api/"));
}
function safeTrialScreenshot(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && ["/plans", "/dashboard", "/inventory/accounting-review"].includes(parsed.pathname) && !parsed.search && !parsed.hash && !parsed.username && !parsed.password;
  } catch { return false; }
}
function systemEnvironment() {
  const result = {};
  for (const [key, value] of Object.entries(process.env)) if (/^(?:path|systemroot|windir|temp|tmp|userprofile|home|appdata|localappdata|comspec|programfiles(?:\(x86\))?|systemdrive|processor_architecture)$/i.test(key)) result[key] = value;
  return result;
}
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((error) => error ? reject(error) : resolve(port)); });
  });
}
function startupCapture(role) {
  assert.ok(["api", "web"].includes(role));
  const limit = 16 * 1024;
  let tail = Buffer.alloc(0), totalBytes = 0, spawnFailed = false, spawnCode = null;
  return {
    append(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.length;
      tail = Buffer.concat([tail, bytes.subarray(Math.max(0, bytes.length - limit))]).subarray(-limit);
    },
    spawnError(error) {
      spawnFailed = true;
      spawnCode = ["ENOENT", "EACCES", "EPERM", "ENOMEM"].includes(error?.code) ? error.code : "OTHER";
    },
    get failed() { return spawnFailed; },
    summarize(child) {
      // Never retain raw excerpts, URLs, environment values, headers, or stacks.
      // Output consists solely of fixed classifications and numeric process state.
      const output = tail.toString("utf8").replace(/\x1b\[[0-9;]*m/g, "");
      const categories = [
        ["MODULE_NOT_FOUND", /MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND|Cannot find module/],
        ["NEST_DEPENDENCY_UNRESOLVED", /Nest can't resolve dependencies|UnknownDependenciesException/],
        ["CONFIGURATION_REJECTED", /Invalid production configuration|Production configuration|environment validation|configuration validation|JWT_SECRET.*required/i],
        ["ADDRESS_IN_USE", /EADDRINUSE/],
        ["PERMISSION_DENIED", /EACCES|EPERM/],
        ["DATABASE_CONNECTION_FAILED", /PrismaClientInitializationError|Can't reach database server|P100[01]/],
        ["MISSING_BUILD", /Could not find a production build|BUILD_ID.*ENOENT/],
        ["MEMORY_LIMIT", /heap out of memory|Allocation failed|ENOMEM/i],
      ].filter(([, pattern]) => pattern.test(output)).map(([category]) => category);
      if (spawnFailed) categories.unshift("PROCESS_SPAWN_FAILED");
      return { role, categories: categories.length ? categories : ["UNCLASSIFIED"], spawnCode,
        exitCode: Number.isInteger(child.exitCode) ? child.exitCode : null,
        signal: ["SIGTERM", "SIGKILL", "SIGABRT", "SIGSEGV"].includes(child.signalCode) ? child.signalCode : null,
        outputBytes: totalBytes, outputTruncated: totalBytes > limit };
    },
    clear() { tail.fill(0); tail = Buffer.alloc(0); },
  };
}
async function waitReady(url, child, capture) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (capture.failed || child.exitCode !== null || child.signalCode !== null) throw new Error("Local runtime stopped before readiness.");
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1_000), redirect: "manual" }); if (response.ok) { await response.body?.cancel(); return; } await response.body?.cancel(); } catch {}
    await delay(250);
  }
  throw new Error("Local runtime readiness timeout.");
}
async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  const stopped = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  const deadline = setTimeout(() => child.kill("SIGKILL"), 5_000);
  await stopped; clearTimeout(deadline);
}
async function portClosed(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(false); }); socket.once("error", () => resolve(true));
  });
}

async function run() {
  let stage = "safety-gates";
  const evidence = { scope: "disposable-local-browser", startedAt: new Date().toISOString(), status: "FAILED", checks: {}, screenshots: [], externalBrowserRequestsBlocked: 0, browserPageErrors: 0, browserPageErrorsByStage: {}, workerStarted: false, liveProviderEnabled: false, productionReadinessProven: false, secretsRetainedInArtifacts: false };
  const children = [];
  const captures = new Map();
  const ports = [];
  let proxy, browser, prisma, page, origin;
  const output = path.join(root, ".dev-logs", "saudi-launch-browser-proof");
  try {
    if (!process.argv.includes("--execute-local-proof")) throw new Error("Explicit local proof flag required.");
    const databaseUrl = validateDatabase(process.env.DATABASE_URL);
    for (const directory of [root, path.join(root, "apps/api"), path.join(root, "apps/web")]) {
      for (const file of [".env", ".env.local", ".env.test", ".env.production", ".env.production.local", ".env.test.local"]) assert.ok(!fs.existsSync(path.join(directory, file)), "Local proof refuses ambient environment files.");
    }
    fs.mkdirSync(output, { recursive: true });
    const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
    const webRequire = createRequire(path.join(root, "apps/web/package.json"));
    const { PrismaClient } = apiRequire("@prisma/client");
    const { chromium, expect } = require("@playwright/test");
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });
    await prisma.$connect();
    assert.equal(await prisma.user.count(), 0, "Browser proof requires a fresh empty local database.");
    const apiEntry = path.join(root, "apps/api/dist/apps/api/src/main.js");
    assert.ok(fs.existsSync(apiEntry) && fs.existsSync(path.join(root, "apps/web/.next/BUILD_ID")), "Build both apps first.");
    const apiPort = await freePort();
    let webPort = await freePort();
    while (webPort === apiPort) webPort = await freePort();
    ports.push(apiPort, webPort);
    proxy = http.createServer((request, response) => {
      const api = backendRoute(request.url || "/");
      const upstream = http.request({ hostname: "127.0.0.1", port: api ? apiPort : webPort,
        path: api ? (request.url.slice(4) || "/") : request.url, method: request.method,
        headers: { ...request.headers, "x-forwarded-proto": "http", "x-forwarded-host": request.headers.host } }, (reply) => { response.writeHead(reply.statusCode, reply.headers); reply.pipe(response); });
      upstream.once("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.once("aborted", () => upstream.destroy()); request.pipe(upstream);
    });
    await new Promise((resolve, reject) => { proxy.once("error", reject); proxy.listen(0, "127.0.0.1", resolve); });
    const proxyPort = proxy.address().port;
    ports.push(proxyPort);
    origin = `http://127.0.0.1:${proxyPort}`;
    const env = { ...systemEnvironment(), NODE_ENV: "test", APP_ENV: "test", DATABASE_URL: databaseUrl,
      API_HOST: "127.0.0.1", API_PORT: String(apiPort), JWT_SECRET: crypto.randomBytes(48).toString("hex"), AUTH_SESSION_PEPPER: crypto.randomBytes(48).toString("hex"),
      APP_WEB_URL: origin, CORS_ORIGIN: origin, AUTH_COOKIE_SECURE: "false", AUTH_COOKIE_SAME_SITE: "lax",
      EMAIL_PROVIDER: "mock", EMAIL_FROM: "proof@example.test", LEDGERBYTE_SELF_SERVICE_ENABLED: "true", BILLING_ENFORCEMENT_MODE: "ENFORCE",
      LEDGERBYTE_BILLING_PROVIDER: "DISABLED", LEDGERBYTE_STRIPE_TEST_MODE_ENABLED: "false", LEDGERBYTE_BILLING_WORKER_ENABLED: "false",
      LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "false", LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1",
      PRISMA_CONNECTION_LIMIT: "3", PRISMA_TRANSACTION_MAX_WAIT_MS: "10000", PRISMA_TRANSACTION_TIMEOUT_MS: "20000", NODE_OPTIONS: "--max-old-space-size=1024" };
    const start = (role, args, cwd, childEnv) => {
      const capture = startupCapture(role);
      const child = spawn(process.execPath, args, { cwd, env: childEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      children.push(child); captures.set(child, capture);
      child.stdout.on("data", (chunk) => capture.append(chunk));
      child.stderr.on("data", (chunk) => capture.append(chunk));
      child.once("error", (error) => capture.spawnError(error));
      return child;
    };
    stage = "runtime-startup";
    const api = start("api", [apiEntry], path.join(root, "apps/api"), env);
    const web = start("web", [webRequire.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(webPort)], path.join(root, "apps/web"), { ...systemEnvironment(), NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: "--max-old-space-size=1024" });
    await waitReady(`${origin}/api/health`, api, captures.get(api)); await waitReady(`${origin}/login`, web, captures.get(web));
    stage = "browser-startup";
    browser = await chromium.launch({ channel: process.env.LEDGERBYTE_PROOF_BROWSER_CHANNEL || "chrome", headless: true, args: ["--renderer-process-limit=2", "--disable-background-networking", "--disable-component-update", "--disable-sync"] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ["data:", "blob:"].includes(url.protocol)) return route.continue();
      evidence.externalBrowserRequestsBlocked += 1; return route.abort("blockedbyclient");
    });
    page = await context.newPage(); page.setDefaultTimeout(20_000);
    const diagnosticPaths = new Set(["/api/billing/catalog", "/api/billing/plans", "/api/billing/status", "/api/billing/trial", "/api/auth/me", "/api/organizations", "/api/inventory/movement-accounting/pending", "/api/inventory/movement-accounting/reconciliation", "/api/accounts"]);
    evidence.httpDiagnostics = [];
    page.on("response", (response) => {
      const pathname = new URL(response.url()).pathname;
      if (diagnosticPaths.has(pathname) && evidence.httpDiagnostics.length < 30) evidence.httpDiagnostics.push({ stage, path: pathname, status: response.status() });
    });
    // Count errors without retaining their messages, stacks, URLs or page data.
    page.on("pageerror", () => { evidence.browserPageErrors += 1; evidence.browserPageErrorsByStage[stage] = (evidence.browserPageErrorsByStage[stage] ?? 0) + 1; });
    const nonce = crypto.randomUUID();
    const email = `launch-proof-${nonce}@example.test`;
    const password = `${crypto.randomBytes(24).toString("base64url")}Aa9!`;
    stage = "register";
    await page.goto(`${origin}/register`);
    await page.locator('input[name="name"]').fill("Synthetic Launch Owner");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/verify-email`);
    evidence.checks.registration = true;
    stage = "verification";
    const verificationResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/email-verification/request");
    await page.getByRole("button", { name: "Send verification link", exact: true }).click();
    assert.ok((await verificationResponse).ok());
    const outbox = await prisma.emailOutbox.findFirst({ where: { toEmail: email, templateType: "EMAIL_VERIFICATION" }, orderBy: { createdAt: "desc" }, select: { bodyText: true } });
    const link = outbox?.bodyText?.match(/https?:\/\/[^\s<>]+/)?.[0];
    const verificationUrl = new URL(link || "invalid:");
    assert.equal(verificationUrl.origin, origin); assert.equal(verificationUrl.pathname, "/verify-email"); assert.ok(verificationUrl.searchParams.get("token"));
    // No tracing, video, console output, or screenshots while a token exists in the address.
    await page.goto(verificationUrl.href);
    await expect(page).toHaveURL(`${origin}/verify-email`);
    await page.getByRole("button", { name: "Verify email", exact: true }).click();
    await page.getByRole("link", { name: "Continue to organization setup", exact: true }).click();
    evidence.checks.emailVerificationViaMockOutbox = true;
    stage = "organization";
    await page.locator('input[name="name"]').fill("Synthetic Launch Trading");
    await page.locator('input[name="legalName"]').fill("Synthetic Launch Trading");
    await page.getByRole("button", { name: "Create organization", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/plans`);
    stage = "trial-button";
    await page.getByRole("button", { name: /^Start (Starter|14-day) trial$/ }).first().click();
    stage = "trial-redirect";
    await expect(page).toHaveURL(`${origin}/dashboard`);
    stage = "trial-persistence";
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true, emailVerifiedAt: true, memberships: { select: { organizationId: true } } } });
    assert.ok(user.emailVerifiedAt); assert.equal(user.memberships.length, 1);
    const organizationId = user.memberships[0].organizationId;
    const subscription = await prisma.organizationSubscription.findFirstOrThrow({ where: { organizationId } });
    assert.equal(subscription.status, "TRIALING");
    assert.ok(subscription.trialEndsAt.getTime() - subscription.trialStartedAt.getTime() === 14 * 86400000);
    evidence.checks.fourteenDayNoCardTrial = true;
    const apiCall = async (endpoint, method = "GET", body) => {
      const cookies = await context.cookies(origin);
      const csrf = cookies.find((cookie) => cookie.name === "ledgerbyte_csrf")?.value;
      return context.request.fetch(`${origin}/api${endpoint}`, { method, headers: { "x-organization-id": organizationId, ...(csrf ? { "x-csrf-token": csrf } : {}) }, ...(body === undefined ? {} : { data: body }), maxRedirects: 0 });
    };
    stage = "synthetic-document";
    const contactResponse = await apiCall("/contacts", "POST", { type: "CUSTOMER", name: "Synthetic Proof Customer", countryCode: "SA" });
    assert.equal(contactResponse.status(), 201);
    const contact = await contactResponse.json();
    const account = await prisma.account.findFirstOrThrow({ where: { organizationId, type: "REVENUE", isActive: true, allowPosting: true } });
    const invoiceResponse = await apiCall("/sales-invoices", "POST", { customerId: contact.id, issueDate: new Date().toISOString().slice(0, 10), lines: [{ description: "Synthetic proof service", quantity: "1", unitPrice: "100", accountId: account.id }] });
    assert.equal(invoiceResponse.status(), 201);
    const invoice = await invoiceResponse.json();
    stage = "english-arabic";
    await expect(page.getByRole("button", { name: "Switch to Arabic", exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(output, "dashboard-en.png"), fullPage: true });
    evidence.screenshots.push("dashboard-en.png");
    const localeResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/locale" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Switch to Arabic", exact: true }).click();
    assert.ok((await localeResponse).ok());
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(output, "dashboard-ar.png"), fullPage: true });
    evidence.screenshots.push("dashboard-ar.png");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await page.getByRole("button", { name: "Switch to English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    evidence.checks.localeIngressAndPersistence = true;
    const openInventoryReview = async (locale) => {
      stage = `inventory-accounting-review-${locale}`;
      const requests = ["/api/inventory/movement-accounting/pending", "/api/inventory/movement-accounting/reconciliation", "/api/accounts"];
      const responses = await Promise.all([
        ...requests.map((pathname) => page.waitForResponse((response) => new URL(response.url()).pathname === pathname && response.request().method() === "GET")),
        page.goto(`${origin}/inventory/accounting-review`),
      ]);
      stage = `inventory-accounting-review-${locale}-responses`;
      for (const response of responses) assert.ok(response?.ok());
      stage = `inventory-accounting-review-${locale}-language`;
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      stage = `inventory-accounting-review-${locale}-title`;
      await expect(page.getByRole("heading", { name: locale === "ar" ? "مراجعة محاسبة المخزون" : "Inventory accounting review", exact: true })).toBeVisible();
      stage = `inventory-accounting-review-${locale}-reconciliation`;
      await expect(page.getByRole("heading", { name: locale === "ar" ? "مطابقة المخزون مع دفتر الأستاذ" : "Inventory to general ledger", exact: true })).toBeVisible();
      stage = `inventory-accounting-review-${locale}-empty`;
      await expect(page.getByText(locale === "ar" ? "لا توجد حركات مخزون بانتظار المراجعة المحاسبية." : "No inventory movements awaiting accounting review.", { exact: true })).toBeVisible();
      await page.waitForLoadState("networkidle");
      stage = `inventory-accounting-review-${locale}-alerts`;
      // Next's route announcer is an accessibility alert outside the app's main content.
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
      const screenshot = `inventory-accounting-review-${locale}.png`;
      await page.screenshot({ path: path.join(output, screenshot), fullPage: true });
      evidence.screenshots.push(screenshot);
    };
    await openInventoryReview("en");
    const inventoryLocaleResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/locale" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Switch to Arabic", exact: true }).click();
    assert.ok((await inventoryLocaleResponse).ok());
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await openInventoryReview("ar");
    await page.getByRole("button", { name: "Switch to English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto(`${origin}/dashboard`);
    await expect(page).toHaveURL(`${origin}/dashboard`);
    evidence.checks.inventoryReviewEnglishArabic = true;
    stage = "expiry-without-worker";
    const expiredAt = new Date(Date.now() - 60_000);
    await prisma.organizationSubscription.update({ where: { id: subscription.id }, data: { trialStartedAt: new Date(expiredAt.getTime() - 14 * 86400000), trialEndsAt: expiredAt } });
    const denied = await apiCall("/contacts", "POST", { type: "CUSTOMER", name: "Blocked After Expiry" });
    stage = "expiry-write-denial";
    evidence.expiredWriteStatus = denied.status();
    assert.equal(denied.status(), 403);
    stage = "expiry-denial-reason";
    const denialBody = await denied.json();
    assert.equal(denialBody.error?.code, "FORBIDDEN");
    assert.match(String(denialBody.error?.message), /read-only.*subscription/i);
    stage = "expiry-persisted-state";
    assert.equal((await prisma.organizationSubscription.findUniqueOrThrow({ where: { id: subscription.id } })).status, "TRIALING");
    stage = "expiry-invoice-read";
    const retained = await apiCall(`/sales-invoices/${invoice.id}`); assert.equal(retained.status(), 200);
    stage = "expiry-pdf-read";
    const pdf = await apiCall(`/sales-invoices/${invoice.id}/pdf`); assert.equal(pdf.status(), 200);
    assert.match(pdf.headers()["content-type"], /^application\/pdf/); assert.equal((await pdf.body()).subarray(0, 5).toString("ascii"), "%PDF-");
    evidence.checks.expiredTrialBlocksWritesWithWorkerStopped = true;
    evidence.checks.retainedInvoiceAndPdfReads = true;
    stage = "logout-revocation";
    const originalCookies = await context.cookies(origin);
    const authCookie = originalCookies.find((cookie) => cookie.name === "ledgerbyte_auth"); assert.ok(authCookie?.httpOnly);
    const logout = await apiCall("/auth/logout", "POST"); assert.ok(logout.ok());
    // Replay only the synthetic in-memory cookie to prove server-side revocation.
    const revoked = await context.request.get(`${origin}/api/auth/me`, { headers: { cookie: `${authCookie.name}=${authCookie.value}` }, maxRedirects: 0 });
    assert.equal(revoked.status(), 401);
    evidence.checks.logoutRevokesStoredSession = true;
    stage = "arabic-auth-after-logout";
    assert.ok((await page.goto(`${origin}/login`))?.ok());
    await expect(page.getByRole("heading", { name: "Log in", exact: true })).toBeVisible();
    const authLocaleResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/locale" && response.request().method() === "POST");
    await page.getByRole("button", { name: "العربية", exact: true }).click();
    assert.ok((await authLocaleResponse).ok());
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الدخول", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "إنشاء حساب", exact: true })).toBeVisible();
    await expect(page.getByLabel("البريد الإلكتروني", { exact: true })).toHaveValue("");
    await expect(page.getByLabel(/^كلمة المرور/)).toHaveValue("");
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(output, "login-ar.png"), fullPage: true });
    evidence.screenshots.push("login-ar.png");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
    evidence.checks.arabicAuthAfterLogout = true;
    assert.equal(evidence.browserPageErrors, 0);
    evidence.checks.noBrowserPageErrors = true;
    evidence.status = "PASS";
  } catch (error) {
    evidence.failedStage = stage;
    evidence.failureKind = ["AssertionError", "TimeoutError"].includes(error?.name) ? error.name : "OtherError";
    if (page && safeTrialScreenshot(page.url(), origin)) {
      await page.screenshot({ path: path.join(output, "journey-failure.png"), fullPage: true }).then(() => evidence.screenshots.push("journey-failure.png")).catch(() => {});
    }
    if (stage === "runtime-startup") evidence.startupDiagnostics = children.map((child) => captures.get(child).summarize(child));
    process.exitCode = 1;
  } finally {
    try { await browser?.close(); } catch { evidence.status = "FAILED"; process.exitCode = 1; }
    if (evidence.browserPageErrors !== 0) { evidence.status = "FAILED"; process.exitCode = 1; }
    for (const child of children.reverse()) {
      try { await stopChild(child); } catch { evidence.status = "FAILED"; process.exitCode = 1; }
    }
    for (const capture of captures.values()) capture.clear();
    try { if (proxy) { proxy.closeAllConnections(); await new Promise((resolve) => proxy.close(resolve)); } } catch { evidence.status = "FAILED"; process.exitCode = 1; }
    try { await prisma?.$disconnect(); } catch { evidence.status = "FAILED"; process.exitCode = 1; }
    evidence.localRuntimePortsClosed = (await Promise.all(ports.map(portClosed))).every(Boolean);
    if (!evidence.localRuntimePortsClosed) { evidence.status = "FAILED"; process.exitCode = 1; }
    // Never serialize thrown errors, provider bodies, database URLs, cookies, or verification links.
    if (fs.existsSync(output)) fs.writeFileSync(path.join(output, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    process.stdout.write(JSON.stringify(evidence) + "\n");
  }
}

module.exports = { backendRoute, validateDatabase, startupCapture, safeTrialScreenshot };
if (require.main === module) void run().catch(() => { console.error("Local browser proof cleanup failed; inspect owned process state."); process.exitCode = 1; });
