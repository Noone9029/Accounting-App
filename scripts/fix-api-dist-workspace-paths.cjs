const fs = require("node:fs");
const path = require("node:path");

const apiDistRoot = path.join(__dirname, "..", "apps", "api", "dist", "apps", "api");

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const original = fs.readFileSync(fullPath, "utf8");
    const updated = original.replace(/(packages\/[^"']+\/src\/index)\.ts/g, "$1.js");
    if (updated !== original) {
      fs.writeFileSync(fullPath, updated);
    }
  }
}

if (fs.existsSync(apiDistRoot)) {
  walk(apiDistRoot);
}
