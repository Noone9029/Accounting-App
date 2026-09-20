"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const test = require("node:test");

const apiRequire = createRequire(path.join(__dirname, "..", "apps", "api", "package.json"));
const prismaRequire = createRequire(apiRequire.resolve("prisma/package.json"));
const configPackage = prismaRequire.resolve("@prisma/config/package.json");
const configRequire = createRequire(configPackage);
const { loadConfigFromFile } = prismaRequire("@prisma/config");
const { deepmerge } = configRequire("deepmerge-ts");

test("the scoped Prisma config override resolves the reviewed versions", () => {
  assert.equal(JSON.parse(fs.readFileSync(configPackage, "utf8")).version, "6.19.3");
  const mergeManifest = path.resolve(path.dirname(configRequire.resolve("deepmerge-ts")), "..", "package.json");
  assert.equal(JSON.parse(fs.readFileSync(mergeManifest, "utf8")).version, "8.0.0");
});

test("Prisma's real config loader preserves schema and nested migration settings", async () => {
  const parent = path.resolve(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, "ledgerbyte-prisma-config-proof-"));
  try {
    fs.writeFileSync(path.join(directory, "package.json"), '{"private":true}\n');
    const filename = path.join(directory, "prisma.config.cjs");
    fs.writeFileSync(filename, 'module.exports = { schema: "./schema.prisma", migrations: { path: "./migrations", seed: "node synthetic-seed.cjs" } };\n');
    const loaded = await loadConfigFromFile({ configRoot: directory, configFile: filename });
    assert.equal(loaded.error, undefined, "Synthetic Prisma config should load without errors.");
    assert.equal(loaded.resolvedPath, filename);
    assert.equal(loaded.config.schema, path.join(directory, "schema.prisma"));
    assert.equal(loaded.config.migrations.path, path.join(directory, "migrations"));
    assert.equal(loaded.config.migrations.seed, "node synthetic-seed.cjs");
  } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith("ledgerbyte-prisma-config-proof-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test("the config merger handles circular records without stack exhaustion", () => {
  const first = { first: true }; first.self = first;
  const second = { second: true }; second.self = second;
  const merged = deepmerge(first, second);
  assert.equal(merged.first, true);
  assert.equal(merged.second, true);
  assert.equal(merged.self, merged);
});

test("special property names cannot mutate inherited or global prototypes", () => {
  const marker = "ledgerbyteSyntheticPrototypeMarker";
  assert.equal(Object.prototype[marker], undefined);
  for (const payload of [
    JSON.parse('{"__proto__":{"ledgerbyteSyntheticPrototypeMarker":true}}'),
    JSON.parse('{"constructor":{"prototype":{"ledgerbyteSyntheticPrototypeMarker":true}}}'),
  ]) {
    const target = { migrations: { path: "./migrations" } };
    const merged = deepmerge(target, payload);
    assert.equal(Object.getPrototypeOf(merged), Object.prototype);
    assert.equal(Object.getPrototypeOf(target), Object.prototype);
    assert.equal(merged[marker], undefined);
    assert.equal(target[marker], undefined);
    assert.equal(Object.prototype[marker], undefined);
  }
});
