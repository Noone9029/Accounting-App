"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT = path.join(__dirname, "zatca-official-sandbox-contracts.cjs");
const REQUIRED_PDFS = [
  ["zatca-clearance-api", "clearance.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-compliance-csid-api", "compliance_csid.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-compliance-invoice-api", "compliance_invoice.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-detailed-guideline", "E-Invoicing_Detailed__Guideline.pdf", "OFFICIAL_ZATCA_PDF"],
  ["zatca-detailed-technical-guidelines", "E-invoicing_Detailed_Technical_Guidelines.pdf", "OFFICIAL_ZATCA_PDF"],
  ["zatca-fatoora-portal-manual", "Fatoora_Portal_User_Manual_English.pdf", "OFFICIAL_ZATCA_PDF"],
  ["zatca-onboarding-api", "onboarding.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-renewal-api", "renewal.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-reporting-api", "reporting.pdf", "AUTHENTICATED_SWAGGER_PDF_EXPORT"],
  ["zatca-developer-portal-manual-v3", "User_Manual_Developer_Portal_Manual_Version_3.pdf", "OFFICIAL_ZATCA_PDF"],
];

test("normal CI validates v2 metadata, canonical digest, safety, and synthetic source checksums without opening PDFs", () => {
  const { __testOnlyValidateOfficialSandboxContractsFixture } =
    loadWithNetworkTrap();
  const fixture = createRepo();
  const originalOpen = fs.openSync;
  fs.openSync = function rejectPdfOpen(fileName) {
    if (/\.pdf$/iu.test(String(fileName))) throw new Error("normal mode tried to open a PDF");
    return originalOpen.apply(this, arguments);
  };

  try {
    const result = __testOnlyValidateOfficialSandboxContractsFixture({
      cwd: fixture.cwd,
      expectedReviewedContractSha256: fixture.reviewedContractSha256,
    });
    assert.equal(result.schemaVersion, 2);
    assert.equal(result.officialContractComplete, true);
    assert.equal(result.sourceChecksumMetadataValid, true);
    assert.equal(result.sourceChecksumsVerified, false);
    assert.equal(result.restrictedEvidenceVerified, false);
    assert.equal(result.contractSha256, fixture.evidence.contractSha256);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.sourceCount, 10);
    assert.equal(result.networkCallsMade, false);
    assert.equal(
      result.simulationBaseUrl,
      "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
    );
    assert.equal(
      result.productionBaseUrl,
      "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
    );
    assert.equal(
      result.developerIntegrationSandboxBaseUrl,
      "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
    );
  } finally {
    fs.openSync = originalOpen;
  }
});

test("canonical digest recursively sorts object keys, omits only the top-level contractSha256, and binds nested names", () => {
  const { computeContractSha256 } = requireFresh();
  const left = { z: [{ y: 2, x: 1 }], contractSha256: "a".repeat(64), a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, contractSha256: "b".repeat(64), z: [{ x: 1, y: 2 }] };
  const nestedLeft = { contractSha256: "a".repeat(64), contract: { value: { contractSha256: "nested-a" } } };
  const nestedRight = { contractSha256: "b".repeat(64), contract: { value: { contractSha256: "nested-b" } } };
  const prototypeLeft = JSON.parse('{"contractSha256":"","contract":{"__proto__":{"productionAllowed":false}}}');
  const prototypeRight = JSON.parse('{"contractSha256":"","contract":{"__proto__":{"productionAllowed":true}}}');

  assert.equal(computeContractSha256(left), computeContractSha256(right));
  assert.equal(computeContractSha256(left), sha256('{"a":{"c":3,"d":4},"z":[{"x":1,"y":2}]}'));
  assert.notEqual(computeContractSha256(nestedLeft), computeContractSha256(nestedRight));
  assert.notEqual(computeContractSha256(prototypeLeft), computeContractSha256(prototypeRight));
});

test("rejects duplicate JSON member names before parsing or canonical hashing", async (t) => {
  const mutations = {
    "duplicate top-level member": (raw) =>
      raw.replace("{", '{\n  "arc": "UNREVIEWED_DUPLICATE",'),
    "escaped-equivalent duplicate member": (raw) =>
      raw.replace("{", '{\n  "\\u0061rc": "UNREVIEWED_DUPLICATE",'),
    "duplicate nested member with discarded sensitive text": (raw) =>
      raw.replace(
        '  "contract": {',
        '  "contract": {\n    "environments": {"discarded": "Authorization: Bearer synthetic-sensitive-value"},',
      ),
    "duplicate source member": (raw) =>
      raw.replace(
        '      "sourceId":',
        '      "sourceId": "UNREVIEWED_DUPLICATE",\n      "sourceId":',
      ),
  };

  for (const [name, mutateRaw] of Object.entries(mutations)) {
    await t.test(name, () => {
      const fixture = createRepo();
      const target = path.join(
        fixture.cwd,
        "docs",
        "zatca",
        "evidence",
        "arc-07b",
        "official-sandbox-contracts.json",
      );
      fs.writeFileSync(target, mutateRaw(fs.readFileSync(target, "utf8")), "utf8");

      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.equal(result.contractDigestVerified, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
      assert.doesNotMatch(JSON.stringify(result), /UNREVIEWED_DUPLICATE|synthetic-sensitive-value/u);
    });
  }
});

test("fails closed with bounded output for malformed but parseable leaf shapes", () => {
  const fixture = createRepo({
    mutate: (evidence) => { delete evidence.contract.headers.otp.value.requiredFor; },
    resign: true,
  });

  assert.doesNotThrow(() => {
    const result = validateFixture(fixture);
    assert.equal(result.officialContractComplete, false);
    assert.equal(result.simulationBaseUrl, "");
    assert.equal(result.productionBaseUrl, "");
    assert.equal(result.developerIntegrationSandboxBaseUrl, "");
    assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
  });

  const cli = spawnSync(process.execPath, [SCRIPT, "--json"], {
    cwd: fixture.cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(cli.status, 1);
  assert.doesNotMatch(`${cli.stdout}${cli.stderr}`, /TypeError|at\s+\S+\.cjs:\d+/u);
  const payload = JSON.parse(cli.stdout);
  assert.equal(payload.officialContractComplete, false);
  assert.ok(payload.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
});

test("fails closed for missing groups, required leaves, sources, and dangling source references", async (t) => {
  const mutations = {
    "missing contract group": (evidence) => delete evidence.contract.headers,
    "missing required operation": (evidence) => delete evidence.contract.operations.clearance,
    "missing required source": (evidence) => evidence.sources.pop(),
    "dangling source reference": (evidence) => { evidence.contract.headers.otp.sourceIds = ["not-a-source"]; },
    "invalid source page reference": (evidence) => { evidence.contract.headers.otp.sourcePages = ["other-source:p1"]; },
  };

  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, () => {
      const fixture = createRepo({ mutate, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
    });
  }
});

test("rejects duplicate source IDs and checksum metadata mismatches", async (t) => {
  await t.test("duplicate source ID", () => {
    const fixture = createRepo({
      mutate: (evidence) => { evidence.sources[1].sourceId = evidence.sources[0].sourceId; },
      resign: true,
    });
    const result = validateFixture(fixture);
    assert.equal(result.officialContractComplete, false);
    assert.ok(result.blockers.includes("ZATCA_OFFICIAL_SOURCE_ID_DUPLICATE"));
  });

  for (const sha of ["0".repeat(64), "not-a-checksum"]) {
    await t.test(`checksum ${sha.slice(0, 8)}`, () => {
      const fixture = createRepo({ mutate: (evidence) => { evidence.sources[0].sha256 = sha; }, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.sourceChecksumMetadataValid, false);
      assert.equal(result.sourceChecksumsVerified, false);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_SOURCE_CHECKSUM_UNVERIFIED"));
    });
  }
});

test("rejects unsafe and non-official source locators without echoing them", async (t) => {
  const marker = "must-not-echo";
  const locators = [
    `http://www.zatca.gov.sa/${marker}.pdf`,
    `https://user:pass@www.zatca.gov.sa/${marker}.pdf`,
    `https://www.zatca.gov.sa:8443/${marker}.pdf`,
    `https://www.zatca.gov.sa/${marker}.pdf?download=1`,
    `https://www.zatca.gov.sa/${marker}.pdf#page=1`,
    `https://www.zatca.gov.sa/safe/../${marker}.pdf`,
    `https://www.zatca.gov.sa/safe/%2e%2e/${marker}.pdf`,
    `https://example.test/${marker}.pdf`,
  ];

  for (const officialLocator of locators) {
    await t.test(new URL(officialLocator).protocol + new URL(officialLocator).hostname + officialLocator.length, () => {
      const fixture = createRepo({ mutate: (evidence) => { evidence.sources[0].officialLocator = officialLocator; }, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.ok(
        result.blockers.includes("ZATCA_OFFICIAL_SOURCE_URL_UNSAFE") ||
          result.blockers.includes("ZATCA_OFFICIAL_SOURCE_DOMAIN_REJECTED"),
      );
      assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
    });
  }
});

test("rejects /core and /developer-portal substitutions for the Simulation target", async (t) => {
  for (const replacement of ["/e-invoicing/core", "/e-invoicing/developer-portal"]) {
    await t.test(replacement, () => {
      const fixture = createRepo({
        mutate: (evidence) => { evidence.contract.environments.simulation.value = `https://gw-fatoora.zatca.gov.sa${replacement}`; },
        resign: true,
      });
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_SIMULATION_TARGET_SUBSTITUTION_REJECTED"));
    });
  }
});

test("rejects unknown evidence states, sensitive/body/local-path fields, and contract drift", async (t) => {
  const cases = {
    "unknown state": {
      mutate: (evidence) => { evidence.contract.otp.format.status = "OWNER_CONFIRMED"; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_EVIDENCE_STATE_UNKNOWN",
    },
    "sensitive field": {
      mutate: (evidence) => { evidence.contract.otp.format.value = { otpValue: "must-not-echo" }; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "body field": {
      mutate: (evidence) => { evidence.contract.responseFields.invoiceValidation.value = { responseBody: "must-not-echo" }; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "local path": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["C:\\private\\must-not-echo.pdf"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "embedded local path": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["Owner path E:\\private\\must-not-echo.pdf"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "private key body": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["-----BEGIN PRIVATE KEY-----must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "authorization value": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["Authorization: Basic must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "secret value": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["secret: must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "password value": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["password=must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "binary security token": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["binarySecurityToken: must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "API key": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["apiKey=must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "OTP value": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["OTP value: 123456 must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "XML body": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["<Invoice>must-not-echo</Invoice>"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "QR value": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["qrPayload=must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "raw JSON parser error": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["Unexpected token < in JSON at position 0 must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "raw XML parser error": {
      mutate: (evidence) => { evidence.nonNormativeNotes = ["SAXParseException: malformed namespace must-not-echo"]; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "numeric OTP value": {
      mutate: (evidence) => { evidence.contract.otp.format.value.code = 123456; },
      resign: true,
      blocker: "ZATCA_OFFICIAL_UNSAFE_METADATA_REJECTED",
    },
    "digest drift": {
      mutate: (evidence) => { evidence.contract.headers.otp.value = "changed"; },
      resign: false,
      blocker: "ZATCA_OFFICIAL_CONTRACT_DIGEST_MISMATCH",
    },
  };

  for (const [name, spec] of Object.entries(cases)) {
    await t.test(name, () => {
      const fixture = createRepo(spec);
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes(spec.blocker));
      assert.doesNotMatch(JSON.stringify(result), /must-not-echo/u);
    });
  }
});

test("pins every documented authenticated Swagger response code", async (t) => {
  const expected = {
    complianceCsid: [200, 400, 406, 500],
    complianceInvoice: [200, 400, 401, 406, 500],
    productionCsid: [200, 400, 401, 406, 500],
    clearance: [200, 202, 208, 303, 400, 401, 500],
    reporting: [200, 202, 400, 401, 406, 409, 500],
    renewal: [200, 400, 401, 406, 428, 500],
  };
  const fixture = createRepo();

  for (const [operation, codes] of Object.entries(expected)) {
    assert.deepEqual(fixture.evidence.contract.statusCodes[operation].value, codes);
    await t.test(`rejects missing ${operation} status`, () => {
      const mutated = createRepo({
        mutate: (evidence) => { evidence.contract.statusCodes[operation].value.pop(); },
        resign: true,
      });
      const result = validateFixture(mutated);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
    });
  }
});

test("rejects re-signed but incomplete, downgraded, uncited, or expanded contract metadata", async (t) => {
  const cases = {
    "unreviewed extra leaf": (evidence) => {
      evidence.contract.headers.unreviewed = structuredClone(evidence.contract.headers.contentType);
    },
    "confirmed claim downgraded to not applicable": (evidence) => {
      evidence.contract.headers.acceptVersion.status = "NOT_APPLICABLE";
    },
    "malformed source-page citation": (evidence) => {
      evidence.contract.headers.acceptVersion.sourcePages = ["zatca-clearance-api:not-a-page"];
    },
    "unknown compliance CSID status": (evidence) => {
      evidence.contract.statusCodes.complianceCsid.value = [999];
    },
    "incomplete certificate response fields": (evidence) => {
      evidence.contract.responseFields.certificateIssue.value = {
        fields: ["requestID", "binarySecurityToken"],
        operations: ["complianceCsid", "productionCsid", "renewal"],
      };
    },
    "incomplete invoice response fields": (evidence) => {
      evidence.contract.responseFields.invoiceValidation.value = {
        complianceInvoice: [],
        clearance: ["clearedInvoice"],
        reporting: [],
      };
    },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const fixture = createRepo({ mutate, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
    });
  }
});

test("reviewed digest pins source metadata, citations, and every executable contract value", async (t) => {
  const cases = {
    "unrelated valid citation": (evidence) => {
      evidence.contract.headers.acceptVersion.sourceIds = ["zatca-detailed-guideline"];
      evidence.contract.headers.acceptVersion.sourcePages = ["zatca-detailed-guideline:p1"];
    },
    "changed valid source checksum": (evidence) => {
      evidence.sources[0].sha256 = "a".repeat(64);
    },
    "changed source byte length": (evidence) => {
      evidence.sources[0].byteLength += 1;
    },
    "changed authentication role": (evidence) => {
      evidence.contract.authentication.complianceBasic.value.credentialRole = "Production Certificate";
    },
    "changed authentication operations": (evidence) => {
      evidence.contract.authentication.complianceBasic.value.operations = ["reporting"];
    },
    "production lane enabled": (evidence) => {
      evidence.contract.environments.production.value.currentLaneProhibited = false;
    },
    "clearance meanings swapped": (evidence) => {
      evidence.contract.headers.clearanceStatus.value.meaning = {
        "0": "clearance enabled",
        "1": "clearance disabled",
      };
    },
    "clearance operation substituted": (evidence) => {
      evidence.contract.headers.clearanceStatus.value.operations = ["complianceCsid"];
    },
    "automated OTP progression": (evidence) => {
      evidence.contract.credentialProgression.sequence.value[0] = "OTP supplied by automation";
    },
    "unreviewed CSR permission": (evidence) => {
      evidence.contract.csr.requirements.value.productionAllowed = true;
    },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const fixture = createRepo({ mutate, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.officialContractComplete, false);
      assert.equal(result.contractDigestVerified, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_DIGEST_MISMATCH"));
    });
  }
});

test("deliberately unpublished rate and backoff leaves do not block an otherwise complete contract", () => {
  const fixture = createRepo();
  const result = validateFixture(fixture);

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.unpublishedItemsRecorded, true);
  assert.deepEqual(result.blockers, []);
});

test("re-signed safe metadata cannot change the executable operation, OTP, CSR, matrix, retry, or duplicate contract", async (t) => {
  const mutations = {
    "operation method": (evidence) => { evidence.contract.operations.clearance.value.method = "GET"; },
    "operation path": (evidence) => { evidence.contract.operations.reporting.value.path = "/reporting"; },
    "environment base": (evidence) => { evidence.contract.environments.simulation.value.baseUrl = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation-alt"; },
    "Accept-Version": (evidence) => { evidence.contract.headers.acceptVersion.value.value = "V1"; },
    "optional language semantics": (evidence) => { evidence.contract.headers.acceptLanguage.value.required = true; },
    "OTP digits": (evidence) => { evidence.contract.otp.format.value.length = 8; },
    "OTP ASCII pattern": (evidence) => { evidence.contract.otp.format.value.pattern = "^\\d{6}$"; },
    "OTP validity": (evidence) => { evidence.contract.otp.validity.value.minutes = 30; },
    "CSR curve": (evidence) => { evidence.contract.csr.requirements.value.curve = "P-256"; },
    "CSR signature": (evidence) => { evidence.contract.csr.requirements.value.signature = "SHA-256"; },
    "CSR template": (evidence) => { evidence.contract.csr.requirements.value.templates.simulation = "ZATCA-Code-Signing"; },
    "CSR subject fields": (evidence) => { evidence.contract.csr.requirements.value.subjectFields.pop(); },
    "six-document matrix": (evidence) => { evidence.contract.complianceMatrix.requiredDocuments.value["1100"].pop(); },
    "retry action map": (evidence) => { evidence.contract.retry.automaticRetry.value.resendAfterFailureStatusCodes = [500]; },
    "ambiguous retry": (evidence) => { evidence.contract.retry.ambiguousTransmission.value.immutablePayloadRequired = false; },
    "clearance duplicate": (evidence) => { evidence.contract.duplicates.clearance208.value.statusCode = 200; },
    "reporting duplicate": (evidence) => { evidence.contract.duplicates.reporting409.value.meaning = "generic conflict"; },
    "303 redirect": (evidence) => { evidence.contract.duplicates.clearance303.value.genericRedirectAllowed = true; },
    "credential order": (evidence) => { evidence.contract.credentialProgression.sequence.value.reverse(); },
  };

  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, () => {
      const fixture = createRepo({ mutate, resign: true });
      const result = validateFixture(fixture);
      assert.equal(result.contractDigestVerified, false);
      assert.equal(result.officialContractComplete, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
    });
  }
});

test("restricted evidence mode hashes exactly the ten required regular PDFs by name, byte length, and SHA-256", () => {
  const fixture = createRepo();
  const result = validateFixture(fixture, { evidenceDirectory: fixture.evidenceDirectory });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.sourceChecksumMetadataValid, true);
  assert.equal(result.sourceChecksumsVerified, true);
  assert.equal(result.restrictedEvidenceVerified, true);
  assert.equal(result.restrictedEvidenceFileCount, 10);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(escapeRegExp(fixture.evidenceDirectory), "iu"));
});

test("restricted evidence mode fails closed for a changed, missing, extra, or linked PDF", async (t) => {
  const cases = {
    changed: (fixture) => fs.appendFileSync(path.join(fixture.evidenceDirectory, REQUIRED_PDFS[0][1]), "changed"),
    missing: (fixture) => fs.rmSync(path.join(fixture.evidenceDirectory, REQUIRED_PDFS[0][1])),
    extra: (fixture) => fs.writeFileSync(path.join(fixture.evidenceDirectory, "extra.pdf"), "extra"),
  };
  if (process.platform !== "win32") {
    cases.linked = (fixture) => {
      const target = path.join(fixture.evidenceDirectory, REQUIRED_PDFS[0][1]);
      fs.rmSync(target);
      fs.symlinkSync(path.join(fixture.evidenceDirectory, REQUIRED_PDFS[1][1]), target);
    };
  }

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const fixture = createRepo();
      mutate(fixture);
      const result = validateFixture(fixture, { evidenceDirectory: fixture.evidenceDirectory });
      assert.equal(result.officialContractComplete, false);
      assert.equal(result.restrictedEvidenceVerified, false);
      assert.ok(result.blockers.includes("ZATCA_OFFICIAL_RESTRICTED_EVIDENCE_MISMATCH"));
      assert.doesNotMatch(JSON.stringify(result), new RegExp(escapeRegExp(fixture.evidenceDirectory), "iu"));
    });
  }
});

test("strict CLI pins the reviewed digest, requires an absolute evidence directory, and never prints paths or PDF contents", () => {
  const fixture = createRepo();
  const repoRoot = path.join(__dirname, "..");
  const marker = "pdf-content-must-not-echo";
  const markerFile = path.join(fixture.evidenceDirectory, REQUIRED_PDFS[0][1]);
  fs.writeFileSync(markerFile, marker);
  fixture.evidence.sources[0].byteLength = Buffer.byteLength(marker);
  fixture.evidence.sources[0].sha256 = sha256(marker);
  fixture.evidence.contractSha256 = canonicalSha256(fixture.evidence);
  writeEvidence(fixture.cwd, fixture.evidence);

  const normal = spawnSync(process.execPath, [SCRIPT, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(normal.status, 0);
  assert.equal(JSON.parse(normal.stdout).officialContractComplete, true);

  const mismatch = spawnSync(process.execPath, [SCRIPT, "--evidence-directory", fixture.evidenceDirectory], {
    cwd: fixture.cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(mismatch.status, 1);
  const payload = JSON.parse(mismatch.stdout);
  assert.equal(payload.restrictedEvidenceVerified, true);
  assert.doesNotMatch(mismatch.stdout, new RegExp(marker, "u"));
  assert.doesNotMatch(mismatch.stdout, new RegExp(escapeRegExp(fixture.evidenceDirectory), "iu"));

  const refused = spawnSync(process.execPath, [SCRIPT, "--evidence-directory", "relative-evidence"], {
    cwd: fixture.cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(refused.status, 2);
  assert.doesNotMatch(`${refused.stdout}${refused.stderr}`, /relative-evidence/u);
});

test("CLI accepts the pnpm argument separator without weakening argument validation", () => {
  const repoRoot = path.join(__dirname, "..");
  const result = spawnSync(process.execPath, [SCRIPT, "--", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.officialContractComplete, true);
  assert.equal(payload.networkCallsMade, false);
});

function loadWithNetworkTrap() {
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  const originalLoad = Module._load;
  delete require.cache[require.resolve(SCRIPT)];
  Module._load = function guardedLoad(request) {
    if (networkModules.has(request)) throw new Error(`network module requested: ${request}`);
    return originalLoad.apply(this, arguments);
  };
  try {
    return require(SCRIPT);
  } finally {
    Module._load = originalLoad;
  }
}

function requireFresh() {
  delete require.cache[require.resolve(SCRIPT)];
  return require(SCRIPT);
}

function validateFixture(fixture, options = {}) {
  return requireFresh().__testOnlyValidateOfficialSandboxContractsFixture({
    cwd: fixture.cwd,
    evidenceDirectory: options.evidenceDirectory,
    expectedReviewedContractSha256: fixture.reviewedContractSha256,
  });
}

function createRepo(options = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-contracts-v2-"));
  const evidenceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-pdf-evidence-"));
  const sources = REQUIRED_PDFS.map(([sourceId, fileName, evidenceClass], index) => {
    const content = Buffer.from(`synthetic-pdf-${index + 1}`, "utf8");
    fs.writeFileSync(path.join(evidenceDirectory, fileName), content);
    return {
      sourceId,
      title: `Official ZATCA source ${index + 1}`,
      fileName,
      retrievedOn: "2026-07-28",
      portalSection: evidenceClass === "AUTHENTICATED_SWAGGER_PDF_EXPORT" ? "Authenticated Developer Portal" : "Official public documentation",
      version: "owner-retrieved-2026-07-28",
      officialLocator: `https://www.zatca.gov.sa/en/E-Invoicing/${encodeURIComponent(fileName)}`,
      byteLength: content.length,
      sha256: sha256(content),
      evidenceClass,
      redistributionClassification: "METADATA_ONLY_DO_NOT_REDISTRIBUTE",
    };
  });
  const sourceIds = sources.map((source) => source.sourceId);
  const leaf = (value, status = "CONFIRMED_AUTHENTICATED_OFFICIAL", ids = [sourceIds[0]]) => ({
    value,
    status,
    sourceIds: ids,
    sourcePages: ids.map((sourceId) => `${sourceId}:p1`),
  });
  const operation = (method, pathName, sourceId) => leaf(
    { environment: "simulation", method, path: pathName },
    "CONFIRMED_AUTHENTICATED_OFFICIAL",
    [sourceId],
  );
  const evidence = {
    schemaVersion: 2,
    arc: "ARC-07B-06F",
    retrievedOn: "2026-07-28",
    contractSha256: "",
    sources,
    contract: {
      environments: {
        simulation: leaf({
          baseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
          allowed: true,
          purpose: "DEVELOPER_INTEGRATION_SANDBOX_ONLY",
          interchangeableWithOtherEnvironments: false,
        }, "CONFIRMED_AUTHENTICATED_OFFICIAL", ["zatca-developer-portal-manual-v3"]),
        developerPortal: leaf({
          baseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
          allowed: false,
          interchangeableWithSimulation: false,
        }),
        production: leaf({
          baseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
          allowed: false,
          interchangeableWithSimulation: false,
        }),
      },
      operations: {
        complianceCsid: operation("POST", "/compliance", "zatca-compliance-csid-api"),
        complianceInvoice: operation("POST", "/compliance/invoices", "zatca-compliance-invoice-api"),
        productionCsid: operation("POST", "/production/csids", "zatca-onboarding-api"),
        clearance: operation("POST", "/invoices/clearance/single", "zatca-clearance-api"),
        reporting: operation("POST", "/invoices/reporting/single", "zatca-reporting-api"),
        renewal: operation("PATCH", "/production/csids", "zatca-renewal-api"),
      },
      authentication: {
        complianceBasic: leaf({ scheme: "Basic", usernameField: "binarySecurityToken", passwordField: "secret" }, "CONFIRMED_AUTHENTICATED_OFFICIAL", ["zatca-compliance-invoice-api"]),
        productionBasic: leaf({ scheme: "Basic", usernameField: "binarySecurityToken", passwordField: "secret" }, "CONFIRMED_AUTHENTICATED_OFFICIAL", ["zatca-clearance-api", "zatca-reporting-api"]),
      },
      headers: {
        otp: leaf({ name: "OTP", requiredFor: ["complianceCsid", "renewal"] }),
        acceptVersion: leaf({ name: "Accept-Version", value: "V2", required: true }),
        acceptLanguage: leaf({ name: "Accept-Language", required: false, allowedValues: ["en", "ar"], default: "en" }),
        clearanceStatus: leaf({ name: "Clearance-Status", required: true, allowedValues: ["0", "1"] }),
        contentType: leaf({ name: "Content-Type", value: "application/json" }),
        authorization: leaf({ name: "Authorization", scheme: "Basic" }),
      },
      requestFields: {
        complianceCsid: leaf({ fields: ["csr"] }),
        complianceInvoice: leaf({ fields: ["invoiceHash", "uuid", "invoice"] }),
        productionCsid: leaf({ fields: ["compliance_request_id"] }),
        clearanceReporting: leaf({
          fields: ["invoiceHash", "uuid", "invoice"],
          operations: ["clearance", "reporting"],
        }),
        renewal: leaf({
          fields: ["csr"],
          credentialContext: ["currentCSID"],
        }),
      },
      responseFields: {
        certificateIssue: leaf({
          fields: ["requestID", "dispositionMessage", "binarySecurityToken", "secret"],
          operations: ["complianceCsid", "productionCsid", "renewal"],
        }),
        invoiceValidation: leaf({
          complianceInvoice: [
            "validationResults",
            "reportingStatus",
            "clearanceStatus",
            "qrSellertStatus",
            "qrBuyertStatus",
          ],
          clearance: ["validationResults", "clearanceStatus", "clearedInvoice"],
          reporting: ["validationResults", "reportingStatus"],
        }),
      },
      statusCodes: {
        complianceCsid: leaf([200, 400, 406, 500]),
        complianceInvoice: leaf([200, 400, 401, 406, 500]),
        productionCsid: leaf([200, 400, 401, 406, 500]),
        clearance: leaf([200, 202, 208, 303, 400, 401, 500]),
        reporting: leaf([200, 202, 400, 401, 406, 409, 500]),
        renewal: leaf([200, 400, 401, 406, 428, 500]),
      },
      credentialProgression: {
        sequence: leaf([
          "fresh human-controlled OTP",
          "Compliance CSID and secret",
          "required compliance-document validations",
          "Simulation Production CSID and secret",
          "standard clearance or simplified reporting",
        ]),
      },
      otp: {
        format: leaf({ length: 6, characterSet: "ASCII_DIGITS_0_TO_9", pattern: "^[0-9]{6}$" }),
        validity: leaf({ duration: "PT1H", minutes: 60 }),
        entryPolicy: leaf({
          mode: "TTY_RAW_MODE_NON_ECHO",
          oneShot: true,
          persisted: false,
          acceptedFromArguments: false,
          acceptedFromEnvironment: false,
          acceptedFromFiles: false,
        }, "NOT_APPLICABLE"),
      },
      csr: {
        requestField: leaf({ name: "csr" }),
        requirements: leaf({
          curve: "secp256k1",
          digest: "SHA-256",
          signature: "ECDSA-SHA256",
          subjectFields: [
            "csr.common.name",
            "csr.serial.number",
            "csr.organization.identifier",
            "csr.organization.unit.name",
            "csr.organization.name",
            "csr.country.name",
            "csr.invoice.type",
            "csr.location.address",
            "csr.industry.business.category",
          ],
          templates: {
            simulation: "PREZATCA-Code-Signing",
            production: "ZATCA-Code-Signing",
          },
        }),
      },
      complianceMatrix: {
        requiredDocuments: leaf({
          "1000": ["standard invoice", "standard debit note", "standard credit note"],
          "0100": ["simplified invoice", "simplified debit note", "simplified credit note"],
          "1100": [
            "standard invoice",
            "standard debit note",
            "standard credit note",
            "simplified invoice",
            "simplified debit note",
            "simplified credit note",
          ],
        }),
      },
      retry: {
        automaticRetry: leaf({
          resendAfterFailureStatusCodes: [429, 500, 503, 504],
          retryWithSmallerPayloadStatusCodes: [413],
          correctRequestBeforeRetryStatusCodes: [400],
          correctAuthenticationBeforeRetryStatusCodes: [401],
        }),
        ambiguousTransmission: leaf({
          blindRetryAllowed: false,
          bounded: true,
          immutablePayloadRequired: true,
          requireOutcomeReconciliation: true,
          unresolvedOutcome: "UNCERTAIN",
          failClosed: true,
        }, "NOT_APPLICABLE"),
      },
      duplicates: {
        clearance208: leaf({ statusCode: 208, meaning: "invoice hash previously submitted", action: "reconcile duplicate" }),
        reporting409: leaf({ statusCode: 409, meaning: "invoice already reported successfully", action: "reconcile duplicate" }),
        clearance303: leaf({
          statusCode: 303,
          meaning: "clearance deactivated",
          action: "route explicitly to /invoices/reporting/single",
          genericRedirectAllowed: false,
        }),
      },
      unpublished: {
        rateLimit: blockedLeaf(sourceIds),
        retryAfter: blockedLeaf(sourceIds),
        backoff: blockedLeaf(sourceIds),
      },
      localPolicy: {
        targetAllowlist: leaf({
          exactBaseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
          productionBaseUrlAllowed: false,
          developerPortalBaseUrlAllowed: false,
          deriveTargetFromInput: false,
        }, "NOT_APPLICABLE"),
        redirects: leaf({
          followGenericRedirects: false,
          clearance303Action: "explicit reporting operation branch",
        }, "NOT_APPLICABLE"),
        responseHandling: leaf({
          retainResponseBodies: false,
          retainCredentials: false,
          retainOtp: false,
          failClosedOnUnexpectedStatus: true,
        }, "NOT_APPLICABLE"),
      },
    },
    nonNormativeNotes: ["Historical examples are excluded from the executable contract."],
    safety: {
      networkCallsMade: false,
      documentBodiesRetained: false,
      secretBodiesRetained: false,
      otpAvailable: false,
      approvalPresent: false,
      hostedResourcesTouched: false,
      rawOutputRetained: false,
      localPathsRetained: false,
    },
  };
  evidence.contractSha256 = canonicalSha256(evidence);
  const reviewedContractSha256 = evidence.contractSha256;
  if (options.mutate) options.mutate(evidence);
  if (options.resign) evidence.contractSha256 = canonicalSha256(evidence);
  writeEvidence(cwd, evidence);
  return { cwd, evidenceDirectory, evidence, reviewedContractSha256 };
}

function writeEvidence(cwd, evidence) {
  const target = path.join(cwd, "docs", "zatca", "evidence", "arc-07b", "official-sandbox-contracts.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function blockedLeaf(sourceIds) {
  const swaggerSourceIds = sourceIds.filter((sourceId) => sourceId.endsWith("-api"));
  return {
    value: "UNPUBLISHED",
    status: "BLOCKED_AUTHENTICATED_CONTRACT_EVIDENCE",
    sourceIds: swaggerSourceIds,
    sourcePages: swaggerSourceIds.map((sourceId) => `${sourceId}:p1`),
  };
}

function canonicalSha256(value) {
  const digestInput = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : value;
  if (digestInput && typeof digestInput === "object" && !Array.isArray(digestInput)) {
    delete digestInput.contractSha256;
  }
  return sha256(JSON.stringify(canonicalize(digestInput)));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, Object.create(null));
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
