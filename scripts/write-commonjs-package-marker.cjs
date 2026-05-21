const { mkdirSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const targetDirectory = process.argv[2];

if (!targetDirectory) {
  throw new Error("Usage: node scripts/write-commonjs-package-marker.cjs <directory>");
}

const resolvedDirectory = resolve(process.cwd(), targetDirectory);
mkdirSync(resolvedDirectory, { recursive: true });
writeFileSync(join(resolvedDirectory, "package.json"), '{\n  "type": "commonjs"\n}\n');
