"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(__dirname, "vercel-postinstall.cjs"), "utf8");
const runtimePackages = Object.keys(JSON.parse(fs.readFileSync(path.join(root, "apps/api/package.json"), "utf8")).dependencies)
  .filter((name) => name.startsWith("@ledgerbyte/"));

function simulate({ env = {}, verify = false, missingPackage } = {}) {
  const commands = [];
  const resolved = [];
  const accessed = [];
  const exit = {};
  const fakeRequire = (name) => {
    if (name === "node:child_process") return { execSync: (command, options) => commands.push({ command, options }) };
    if (name === "node:fs") return { accessSync: (filename) => accessed.push(filename) };
    if (name === "node:path") return path;
    throw new Error(`Unexpected dependency ${name}`);
  };
  fakeRequire.resolve = (name) => {
    if (name === missingPackage) throw new Error(`Missing runtime build: ${name}`);
    resolved.push(name);
    return `${name}/dist/index.js`;
  };
  try {
    vm.runInNewContext(script, {
      require: fakeRequire,
      __dirname,
      process: { env, argv: verify ? ["node", "script", "--verify-api-build"] : ["node", "script"], exit: () => { throw exit; } },
    });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return { commands, resolved, accessed };
}

test("ordinary installs and the web project do not compile the API", () => {
  assert.equal(simulate().commands.length, 0);
  assert.equal(simulate({ env: { VERCEL: "1", LEDGERBYTE_DEPLOY_TARGET: "web" } }).commands.length, 0);
});

test("a fresh API install builds and resolves every runtime workspace before deployment", () => {
  const result = simulate({ env: { VERCEL: "1", LEDGERBYTE_DEPLOY_TARGET: "api" } });
  assert.equal(result.commands.length, 3);
  for (const name of runtimePackages) assert.ok(result.commands[0].command.includes(`--filter ${name}`));
  assert.deepEqual(result.resolved.slice().sort(), runtimePackages.slice().sort());
  assert.match(result.commands[1].command, /db:generate$/);
  assert.match(result.commands[2].command, /--filter @ledgerbyte\/api build$/);
  for (const { command, options } of result.commands) {
    assert.match(command, /--workspace-concurrency=1/);
    assert.equal(options.cwd, root);
    assert.equal(options.env.NODE_OPTIONS, "--max-old-space-size=4096");
    assert.equal(options.env.UV_THREADPOOL_SIZE, "1");
    assert.doesNotMatch(command, /db:migrate|db:seed/);
  }
  assert.deepEqual(result.accessed, [path.join(root, "apps/api/dist/apps/api/api/index.js")]);
});

test("the API build step verifies output without compiling another workspace", () => {
  const result = simulate({ env: { VERCEL: "1", LEDGERBYTE_DEPLOY_TARGET: "api" }, verify: true });
  assert.equal(result.commands.length, 0);
  assert.equal(result.resolved.length, runtimePackages.length);
  assert.throws(() => simulate({ verify: true }), /requires LEDGERBYTE_DEPLOY_TARGET=api/);
  assert.throws(() => simulate({ env: { VERCEL: "1", LEDGERBYTE_DEPLOY_TARGET: "api" }, verify: true, missingPackage: "@ledgerbyte/uae-peppol-pint-ae" }), /Missing runtime build/);
});

test("both API deployment configs preserve the root wrapper and explicit verification step", () => {
  for (const filename of ["vercel.json", "vercel.api.json"]) {
    const config = JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
    assert.equal(config.outputDirectory, "apps/api/dist");
    assert.equal(config.routes[0].dest, "/api/index.js");
    assert.match(config.buildCommand, /vercel-postinstall\.cjs --verify-api-build$/);
    assert.match(config.installCommand, /--frozen-lockfile --child-concurrency=1/);
  }
});

test("both web deployment configs use the web workspace with one build worker", () => {
  for (const filename of ["vercel.web.json", "apps/web/vercel.json"]) {
    const config = JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
    assert.match(config.buildCommand, /LEDGERBYTE_NEXT_BUILD_CPUS=1/);
    assert.match(config.buildCommand, /--workspace-concurrency=1 --filter @ledgerbyte\/web build$/);
    assert.match(config.installCommand, /--frozen-lockfile --child-concurrency=1/);
  }
});
