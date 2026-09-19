"use strict";
// pnpm deploy installs production dependencies into a fresh virtual store.
// Preserve the generated platform-specific client without shipping Prisma CLI.
const { createRequire } = require("node:module");
const { cpSync, existsSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
function clientPath(manifest) {
  const requireFrom = createRequire(resolve(manifest));
  return resolve(dirname(requireFrom.resolve("@prisma/client/package.json")), "../../.prisma/client");
}
const source = clientPath(process.argv[2]);
const destination = clientPath(process.argv[3]);
if (!existsSync(resolve(source, "schema.prisma"))) throw new Error("Generated Prisma client is missing from build output.");
cpSync(source, destination, { recursive: true });
