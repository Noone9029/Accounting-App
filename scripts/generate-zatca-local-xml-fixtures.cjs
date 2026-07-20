#!/usr/bin/env node
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const FIXTURES = [
  {
    id: "ledgerbyte-generated-standard-invoice",
    type: "standard-invoice",
    input: "ledgerbyte-generated-standard-invoice.input.json",
    output: "ledgerbyte-generated-standard-invoice.expected.xml",
  },
  {
    id: "ledgerbyte-generated-credit-note",
    type: "credit-note",
    input: "ledgerbyte-generated-credit-note.input.json",
    output: "ledgerbyte-generated-credit-note.expected.xml",
  },
  {
    id: "ledgerbyte-generated-debit-note",
    type: "debit-note",
    input: "ledgerbyte-generated-debit-note.input.json",
    output: "ledgerbyte-generated-debit-note.expected.xml",
  },
  {
    id: "ledgerbyte-generated-allowance-invoice",
    type: "standard-invoice-with-document-allowance",
    input: "ledgerbyte-generated-allowance-invoice.input.json",
    output: "ledgerbyte-generated-allowance-invoice.expected.xml",
  },
];

main();

function main() {
  const repoRoot = resolveRepoRoot(process.cwd());
  const fixturesDir = path.join(repoRoot, "packages", "zatca-core", "fixtures");
  const core = loadZatcaCore(repoRoot);
  const results = FIXTURES.map((fixture) => writeFixture({ fixture, fixturesDir, core }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        localOnly: true,
        noNetwork: true,
        productionCompliance: false,
        xmlBodyPrinted: false,
        qrPayloadPrinted: false,
        privateKeyPrinted: false,
        fixtures: results,
      },
      null,
      2,
    ),
  );
}

function writeFixture({ fixture, fixturesDir, core }) {
  const inputPath = path.join(fixturesDir, fixture.input);
  const outputPath = path.join(fixturesDir, fixture.output);
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const xml = `${core.buildZatcaInvoiceXml(input)}\n`;
  fs.writeFileSync(outputPath, xml, "utf8");

  return {
    fixtureId: fixture.id,
    fixtureType: fixture.type,
    sourceCategory: "sanitized-local-demo-data",
    relativePath: path.relative(resolveRepoRoot(process.cwd()), outputPath).replace(/\\/g, "/"),
    sizeBytes: Buffer.byteLength(xml, "utf8"),
    sha256: createHash("sha256").update(xml, "utf8").digest("hex"),
    xmlBodyPrinted: false,
    qrPayloadPrinted: false,
    privateKeyPrinted: false,
    productionCompliance: false,
  };
}

function loadZatcaCore(repoRoot) {
  const distPath = path.join(repoRoot, "packages", "zatca-core", "dist", "index.js");
  if (!fs.existsSync(distPath)) {
    throw new Error("packages/zatca-core/dist/index.js was not found. Run corepack pnpm --filter @ledgerbyte/zatca-core build first.");
  }
  return require(distPath);
}

function resolveRepoRoot(startDirectory) {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml")) || fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.resolve(current, "..");
    if (parent === current) {
      return path.resolve(startDirectory);
    }
    current = parent;
  }
}
