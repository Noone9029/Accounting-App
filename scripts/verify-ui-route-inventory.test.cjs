const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("UI route inventory stays aligned with the shipped page and canonical route counts", () => {
  const script = path.join(__dirname, "verify-ui-route-inventory.cjs");
  const output = execFileSync(process.execPath, [script], { encoding: "utf8" });
  assert.match(output, /205 page modules, 96 canonical routes \(92 active, 4 planned\)/);
  assert.match(output, /PASS: every active canonical route has a page module/);
});
