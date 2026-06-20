#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { validateRepo } = require("./openbooks-clean-room-validate.cjs");

function withFixture(files, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openbook-adoption-guard-"));
  try {
    for (const [relativePath, contents] of Object.entries(files)) {
      const fullPath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, contents, "utf8");
    }
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("allows attributed MIT reuse policy language in approved docs", () => {
  withFixture(
    {
      "docs/legal/OPENBOOK_MIT_ATTRIBUTION.md":
        "OpenBook MIT reuse is allowed for small attributed chunks.\nNo provider or production compliance claim is made.\n",
    },
    (root) => {
      const result = validateRepo({ repoRoot: root });

      assert.equal(result.status, "PASS");
      assert.equal(result.forbiddenClaimCount, 0);
    },
  );
});

test("blocks OpenBook references in production source", () => {
  withFixture(
    {
      "apps/web/src/lib/example.ts": "export const source = 'OpenBook reference';\n",
    },
    (root) => {
      const result = validateRepo({ repoRoot: root });

      assert.equal(result.status, "FAIL");
      assert.equal(result.blockedReferencesCount, 1);
      assert.match(result.blockedReferences[0].reason, /production\/runtime/);
    },
  );
});

test("blocks unattributed direct reuse claims outside approved intake docs", () => {
  withFixture(
    {
      "docs/product/example.md": "We copied OpenBook implementation details into LedgerByte.\n",
    },
    (root) => {
      const result = validateRepo({ repoRoot: root });

      assert.equal(result.status, "FAIL");
      assert.equal(result.forbiddenClaimCount, 1);
      assert.match(result.forbiddenClaims[0].reason, /Unattributed/);
    },
  );
});

test("continues to block compliance and provider readiness claims", () => {
  const sourceName = "Open" + "Book";
  const jurisdiction = "U" + "AE";
  const forbiddenClaim = `${sourceName} adoption proves ${jurisdiction} compliant behavior.\n`;

  withFixture(
    {
      "docs/development/openbooks-adoption/OPENBOOK_MIT_SOURCE_INTAKE.md": forbiddenClaim,
    },
    (root) => {
      const result = validateRepo({ repoRoot: root });

      assert.equal(result.status, "FAIL");
      assert.equal(result.forbiddenClaimCount, 1);
      assert.match(result.forbiddenClaims[0].reason, /compliance\/storage\/provider/);
    },
  );
});
