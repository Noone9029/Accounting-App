const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-execution-preflight.cjs");
const CONTRACT_VALIDATOR_PATH = path.join(__dirname, "zatca-official-sandbox-contracts.cjs");
const CONTRACT_FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "docs",
  "zatca",
  "evidence",
  "arc-07b",
  "official-sandbox-contracts.json",
);
const { computeContractSha256 } = require(CONTRACT_VALIDATOR_PATH);
const EXECUTION_STAGES = Object.freeze([
  "COMPLIANCE_CSID_ONBOARDING",
  "COMPLIANCE_DOCUMENTS",
  "SANDBOX_PRODUCTION_CSID",
  "CLEARANCE",
  "REPORTING",
]);

const READY_STAGE_CASES = Object.freeze([
  {
    stage: "COMPLIANCE_CSID_ONBOARDING",
    stageEvidence: createStageEvidence(),
    otpReady: true,
    sdkReady: true,
  },
  {
    stage: "COMPLIANCE_DOCUMENTS",
    stageEvidence: createStageEvidence({
      complianceCertificatePresent: true,
      complianceCertificateValid: true,
      complianceCertificateKeyMatch: true,
    }),
  },
  {
    stage: "SANDBOX_PRODUCTION_CSID",
    stageEvidence: createStageEvidence({
      complianceCertificatePresent: true,
      complianceCertificateValid: true,
      complianceCertificateKeyMatch: true,
      complianceDocumentMatrixComplete: true,
    }),
  },
  {
    stage: "CLEARANCE",
    stageEvidence: createStageEvidence({
      productionCertificatePresent: true,
      productionCertificateValid: true,
      productionCertificateKeyMatch: true,
    }),
  },
  {
    stage: "REPORTING",
    stageEvidence: createStageEvidence({
      productionCertificatePresent: true,
      productionCertificateValid: true,
      productionCertificateKeyMatch: true,
    }),
  },
]);

test("centralized execution-stage table evaluates static readiness independently", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();

  for (const row of READY_STAGE_CASES) {
    await t.test(row.stage, () => {
      const result = buildSandboxExecutionPreflight({
        cwd: createReadyRepo(row),
        executionStage: row.stage,
      });

      assert.equal(result.executionStage, row.stage);
      assert.equal(result.requestSequenceReady, true);
      assert.equal(result.executionAllowed, false);
      assert.equal(result.networkEnabled, false);
      assert.equal(result.approvalPresent, false);
      assert.equal(result.certificateReceiveCustodyReady, true);
      assert.equal(result.productionCredentialReceiveCustodyReady, true);
      assert.equal(result.networkCallsMade, false);
      assert.equal(result.status, "STATIC_STAGE_READY_EXECUTION_BLOCKED");
    });
  }
});

test("compliance onboarding is statically ready without an existing certificate", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createReadyRepo(READY_STAGE_CASES[0]),
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
  });

  assert.equal(result.complianceCertificatePresent, false);
  assert.equal(result.complianceCertificateValid, false);
  assert.equal(result.complianceCertificateKeyMatch, false);
  assert.equal(result.requestSequenceReady, true);
  assert.ok(!result.safeErrorCodes.includes("ZATCA_COMPLIANCE_CERTIFICATE_MISSING"));
});

test("approval, OTP availability, and network enablement never change static stage readiness", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cwd = createReadyRepo(READY_STAGE_CASES[0]);
  const combinations = [
    { standaloneApproval: false, safeOtpEntryAvailable: false, noNetwork: true },
    { standaloneApproval: true, safeOtpEntryAvailable: false, noNetwork: true },
    { standaloneApproval: false, safeOtpEntryAvailable: true, noNetwork: false },
    { standaloneApproval: true, safeOtpEntryAvailable: true, noNetwork: false },
  ];

  for (const dynamic of combinations) {
    const result = buildSandboxExecutionPreflight({
      cwd,
      executionStage: "COMPLIANCE_CSID_ONBOARDING",
      ...dynamic,
    });
    assert.equal(result.requestSequenceReady, true);
    assert.equal(
      result.executionAllowed,
      dynamic.standaloneApproval && dynamic.safeOtpEntryAvailable && !dynamic.noNetwork,
    );
  }
});

test("each stage rejects its independently missing static requirement with an exact safe code", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    {
      name: "onboarding receive custody",
      stage: "COMPLIANCE_CSID_ONBOARDING",
      row: READY_STAGE_CASES[0],
      mutate: ({ custodyEvidence }) => { custodyEvidence.certificateReceiveCustodyReady = false; },
      code: "ZATCA_CERTIFICATE_RECEIVE_CUSTODY_NOT_READY",
      field: "certificateReceiveCustodyReady",
    },
    {
      name: "onboarding Tier-2 CSR oracle",
      stage: "COMPLIANCE_CSID_ONBOARDING",
      row: READY_STAGE_CASES[0],
      mutate: ({ sdkEvidence }) => { sdkEvidence.status = "SKIPPED_EXTERNAL_ORACLE"; },
      code: "ZATCA_CSR_TIER2_SDK_NOT_READY",
      field: "csrTier2SdkReady",
    },
    ...credentialFailureCases(
      "COMPLIANCE_DOCUMENTS",
      "compliance",
      READY_STAGE_CASES[1],
    ),
    ...credentialFailureCases(
      "SANDBOX_PRODUCTION_CSID",
      "compliance",
      READY_STAGE_CASES[2],
    ),
    {
      name: "production CSID compliance matrix",
      stage: "SANDBOX_PRODUCTION_CSID",
      row: READY_STAGE_CASES[2],
      mutate: ({ stageEvidence }) => { stageEvidence.complianceDocumentMatrixComplete = false; },
      code: "ZATCA_COMPLIANCE_DOCUMENT_MATRIX_INCOMPLETE",
      field: "complianceDocumentMatrixComplete",
    },
    {
      name: "production credential receive custody",
      stage: "SANDBOX_PRODUCTION_CSID",
      row: READY_STAGE_CASES[2],
      mutate: ({ custodyEvidence }) => { custodyEvidence.productionCredentialReceiveCustodyReady = false; },
      code: "ZATCA_PRODUCTION_CREDENTIAL_RECEIVE_CUSTODY_NOT_READY",
      field: "productionCredentialReceiveCustodyReady",
    },
    ...credentialFailureCases("CLEARANCE", "production", READY_STAGE_CASES[3]),
    ...credentialFailureCases("REPORTING", "production", READY_STAGE_CASES[4]),
  ];

  for (const row of cases) {
    await t.test(row.name, () => {
      const fixture = createReadyEvidence(row.row);
      row.mutate(fixture);
      const result = buildSandboxExecutionPreflight({
        cwd: createRepo(fixture),
        executionStage: row.stage,
      });

      assert.equal(result.requestSequenceReady, false);
      assert.equal(result.executionAllowed, false);
      assert.equal(result[row.field], false);
      assert.ok(result.safeErrorCodes.includes(row.code));
    });
  }
});

test("result consistency invariant holds for every execution stage", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  for (const row of READY_STAGE_CASES) {
    const cwd = createReadyRepo(row);
    const blocked = buildSandboxExecutionPreflight({ cwd, executionStage: row.stage });
    const allowed = buildSandboxExecutionPreflight({
      cwd,
      executionStage: row.stage,
      standaloneApproval: true,
      safeOtpEntryAvailable: row.stage === "COMPLIANCE_CSID_ONBOARDING",
      noNetwork: false,
    });

    assertResultConsistency(blocked);
    assertResultConsistency(allowed);
    assert.equal(blocked.executionAllowed, false);
    assert.equal(allowed.executionAllowed, true);
  }
});

test("reports a metadata-only blocked packet without loading a network module", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({ cwd: createRepo() });

  assert.equal(result.status, "PREPARED_BLOCKED");
  assert.equal(result.networkEnabled, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.approvalPresent, false);
  assert.equal(result.sandboxTargetVerified, true);
  assert.equal(result.syntheticDataVerified, true);
  assert.equal(result.officialContractComplete, true);
  assert.match(result.contractSha256, /^[a-f0-9]{64}$/u);
  assert.equal(result.contractHashMatches, true);
  assert.equal(result.credentialProviderReady, false);
  assert.equal(result.csrReady, false);
  assert.equal(result.otpAvailable, false);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.cleanupReady, true);
  assert.equal(result.evidenceReady, true);
  assert.equal(result.requestSequenceReady, false);
  assert.equal(result.executionAllowed, false);
});

test("repository text cannot manufacture execution approval", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ packetText: "APPROVE ZATCA SANDBOX NETWORK EXECUTION FOR SYNTHETIC DATA ONLY" });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.approvalPresent, false);
  assert.equal(result.executionAllowed, false);
});

test("detects production-looking targets without opening a socket or echoing them", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const marker = "production-target-value-must-not-echo";
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo(),
    env: { ZATCA_SANDBOX_BASE_URL: `https://${marker}.example.test` },
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
  });

  assert.equal(result.productionTargetDetected, true);
  assert.equal(result.executionAllowed, false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("classifies reviewed core, developer-portal, and other target substitutions safely", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    {
      name: "production core",
      target: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
      code: "ZATCA_PRODUCTION_TARGET_DETECTED",
      field: "productionTargetDetected",
    },
    {
      name: "developer integration sandbox",
      target: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
      code: "ZATCA_DEVELOPER_PORTAL_TARGET_REJECTED",
      field: "developerPortalTargetDetected",
    },
    {
      name: "unreviewed target",
      target: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation/",
      code: "ZATCA_SANDBOX_TARGET_MISMATCH",
      field: null,
    },
  ];

  for (const row of cases) {
    await t.test(row.name, () => {
      const result = buildSandboxExecutionPreflight({
        cwd: createReadyRepo(READY_STAGE_CASES[0]),
        env: { ZATCA_SANDBOX_BASE_URL: row.target },
        executionStage: "COMPLIANCE_CSID_ONBOARDING",
      });

      assert.equal(result.sandboxTargetVerified, false);
      if (row.field) assert.equal(result[row.field], true);
      assert.ok(result.safeErrorCodes.includes(row.code));
      assert.equal(result.requestSequenceReady, false);
      assert.equal(result.executionAllowed, false);
      assert.equal(result.networkCallsMade, false);
      assert.doesNotMatch(JSON.stringify(result), /gw-fatoora|e-invoicing/iu);
    });
  }
});

test("does not read or expose credential-like values", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const marker = "credential-value-must-not-echo";
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo(),
    env: { ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: marker, ZATCA_PRIVATE_KEY: marker },
  });

  assert.equal(result.otpAvailable, false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("rejects an execution packet hash mismatch", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo();
  const result = buildSandboxExecutionPreflight({ cwd: repo, expectedPacketSha256: "0".repeat(64) });

  assert.equal(result.packetHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_EXECUTION_PACKET_HASH_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("caller-supplied packet hash cannot mask stale committed preflight evidence", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createReadyRepo(READY_STAGE_CASES[0]);
  const packet = fs.readFileSync(
    path.join(repo, "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md"),
    "utf8",
  );
  const actualPacketSha256 = crypto
    .createHash("sha256")
    .update(packet.replace(/\r\n?/g, "\n"), "utf8")
    .digest("hex");
  const evidencePath = path.join(
    repo,
    "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json",
  );
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  evidence.packetSha256 = "0".repeat(64);
  fs.writeFileSync(evidencePath, JSON.stringify(evidence), "utf8");

  const result = buildSandboxExecutionPreflight({
    cwd: repo,
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
    expectedPacketSha256: actualPacketSha256,
  });

  assert.equal(result.packetHashMatches, false);
  assert.equal(result.requestSequenceReady, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_EXECUTION_PACKET_HASH_MISMATCH"));
});

test("fails closed when the structured contract drifts from its canonical digest", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    mutateContractEvidence: (evidence) => {
      evidence.contract.operations.clearance.value.path = "/drifted-clearance-path";
    },
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.officialContractComplete, false);
  assert.equal(result.contractHashMatches, false);
  assert.equal(result.sandboxTargetVerified, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_DIGEST_MISMATCH"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
  assert.equal(result.executionAllowed, false);
});

test("rejects a re-signed but invalid schema-v2 contract", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    mutateContractEvidence: (evidence) => {
      evidence.contract.operations.clearance.value.method = "GET";
    },
    resignContractEvidence: true,
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.contractHashMatches, true);
  assert.equal(result.officialContractComplete, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
  assert.equal(result.executionAllowed, false);
});

test("does not derive contract truth from the Markdown packet", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({ packetContractSha256: "0".repeat(64) }),
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, true);
  assert.ok(!result.safeErrorCodes.includes("ZATCA_CONTRACT_PACKET_DIGEST_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("rejects a preflight evidence contract digest mismatch", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({ evidenceContractSha256: "0".repeat(64) }),
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("fails closed when structured preflight contract evidence is missing", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({
      omitPacketContractDigest: true,
      omitEvidenceContractDigest: true,
    }),
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.contractHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISSING"));
  assert.equal(result.executionAllowed, false);
});

test("rejects duplicate members in stage and preflight evidence before gate evaluation", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    {
      name: "stage evidence",
      relativePath: "docs/zatca/evidence/arc-07b/sandbox-stage-readiness.json",
      duplicate: '"syntheticDataOnly":false,',
      code: "ZATCA_STAGE_EVIDENCE_NOT_READY",
    },
    {
      name: "preflight evidence",
      relativePath:
        "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json",
      duplicate: '"contractSha256":"' + "0".repeat(64) + '",',
      code: "ZATCA_CONTRACT_EVIDENCE_DIGEST_MISSING",
    },
  ];

  for (const row of cases) {
    await t.test(row.name, () => {
      const repo = createReadyRepo(READY_STAGE_CASES[0]);
      prependJsonMember(repo, row.relativePath, row.duplicate);
      const result = buildSandboxExecutionPreflight({
        cwd: repo,
        executionStage: "COMPLIANCE_CSID_ONBOARDING",
      });

      assert.equal(result.requestSequenceReady, false);
      assert.equal(result.executionAllowed, false);
      assert.ok(result.safeErrorCodes.includes(row.code));
      assert.equal(result.networkCallsMade, false);
    });
  }
});

test("rejects incomplete lifecycle cleanup evidence before static readiness", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const fixture = createReadyEvidence(READY_STAGE_CASES[0]);
  fixture.lifecycleEvidence.productionEgsChainMutations = 1;
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo(fixture),
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
  });

  assert.equal(result.evidenceReady, false);
  assert.equal(result.cleanupReady, false);
  assert.equal(result.requestSequenceReady, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_LIFECYCLE_EVIDENCE_NOT_READY"));
  assert.equal(result.executionAllowed, false);
  assert.equal(result.networkCallsMade, false);
});

test("receive custody requires hardened actual DPAPI, distinct ciphertext, and non-production proof", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    ["actual DPAPI", "actualDpapiUsed", false],
    ["deletion proof", "deletionProofPassed", false],
    ["network isolation overclaim", "networkIsolationProven", true],
    ["distinct ciphertext", "ciphertextDiffersFromPlaintext", false],
    ["pinned system binaries", "systemBinaryPathsPinned", false],
    ["scrubbed child environment", "childProcessEnvironmentScrubbed", false],
    ["no network calls", "networkCallsMade", true],
    ["no hosted mutation", "hostedResourcesTouched", true],
    ["non-production classification", "productionCompliance", true],
    ["extra evidence field", "opaque", "safe-looking"],
  ];

  for (const [name, field, value] of cases) {
    await t.test(name, () => {
      const fixture = createReadyEvidence(READY_STAGE_CASES[0]);
      fixture.custodyEvidence[field] = value;
      const result = buildSandboxExecutionPreflight({
        cwd: createRepo(fixture),
        executionStage: "COMPLIANCE_CSID_ONBOARDING",
      });

      assert.equal(result.certificateReceiveCustodyReady, false);
      assert.equal(result.requestSequenceReady, false);
      assert.ok(result.safeErrorCodes.includes("ZATCA_CREDENTIAL_PROVIDER_NOT_READY"));
    });
  }
});

test("OTP readiness rejects extra fields and contract drift", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    {
      name: "extra opaque field",
      mutate: (evidence) => { evidence.opaque = "safe-looking"; },
    },
    {
      name: "authorization field",
      mutate: (evidence) => { evidence.authorization = "discarded"; },
    },
    {
      name: "format drift",
      mutate: (evidence) => { evidence.officialOtpContract.pattern = "^[0-9]+$"; },
    },
    {
      name: "validity drift",
      mutate: (evidence) => { evidence.officialOtpContract.validity = "PT2H"; },
    },
  ];

  for (const row of cases) {
    await t.test(row.name, () => {
      const fixture = createReadyEvidence(READY_STAGE_CASES[0]);
      row.mutate(fixture.otpEvidence);
      const result = buildSandboxExecutionPreflight({
        cwd: createRepo(fixture),
        executionStage: "COMPLIANCE_CSID_ONBOARDING",
      });

      assert.equal(result.secureOtpInputReady, false);
      assert.equal(result.requestSequenceReady, false);
      assert.ok(result.safeErrorCodes.includes("ZATCA_SECURE_OTP_INPUT_NOT_READY"));
    });
  }
});

test("stage evidence requires exact schema, packet binding, and credential-inspection lineage", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    {
      name: "extra field",
      stage: "COMPLIANCE_CSID_ONBOARDING",
      row: READY_STAGE_CASES[0],
      mutate: (evidence) => { evidence.opaque = true; },
    },
    {
      name: "packet drift",
      stage: "COMPLIANCE_CSID_ONBOARDING",
      row: READY_STAGE_CASES[0],
      mutate: (evidence) => { evidence.packetSha256 = "0".repeat(64); },
    },
    {
      name: "positive credential claim without inspection",
      stage: "COMPLIANCE_DOCUMENTS",
      row: READY_STAGE_CASES[1],
      mutate: (evidence) => {
        evidence.credentialInspectionPerformed = false;
        evidence.credentialInspectionSha256 = null;
      },
    },
    {
      name: "inspection digest drift",
      stage: "COMPLIANCE_DOCUMENTS",
      row: READY_STAGE_CASES[1],
      mutate: (evidence) => { evidence.credentialInspectionSha256 = "f".repeat(64); },
    },
  ];

  for (const row of cases) {
    await t.test(row.name, () => {
      const fixture = createReadyEvidence(row.row);
      row.mutate(fixture.stageEvidence);
      const result = buildSandboxExecutionPreflight({
        cwd: createRepo(fixture),
        executionStage: row.stage,
      });

      assert.equal(result.requestSequenceReady, false);
      assert.ok(result.safeErrorCodes.includes("ZATCA_STAGE_EVIDENCE_NOT_READY"));
    });
  }
});

test("local and SDK CSR evidence require exact pinned schemas and fail closed on unsafe claims", async (t) => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const cases = [
    ["local wrong algorithm", "local", "algorithm", "RSA"],
    ["local network use", "local", "networkCallsMade", true],
    ["local private key returned", "local", "privateKeyReturned", true],
    ["local production claim", "local", "productionCompliance", true],
    ["local extra field", "local", "opaque", true],
    ["SDK wrong Java", "sdk", "jdkVersion", "17.0.1"],
    ["SDK wrong version", "sdk", "sdkVersion", "unreviewed"],
    ["SDK checksum drift", "sdk", "sdkChecksumMatch", false],
    ["SDK production execution", "sdk", "productionExecution", true],
    ["SDK incomplete cleanup", "sdk", "plaintextKeyFileRemoved", false],
    ["SDK extra field", "sdk", "opaque", true],
  ];

  for (const [name, lane, field, value] of cases) {
    await t.test(name, () => {
      const fixture = createReadyEvidence(READY_STAGE_CASES[0]);
      if (lane === "local") fixture.csrEvidence[field] = value;
      else fixture.sdkEvidence[field] = value;
      const result = buildSandboxExecutionPreflight({
        cwd: createRepo(fixture),
        executionStage: "COMPLIANCE_CSID_ONBOARDING",
      });

      if (lane === "local") {
        assert.equal(result.signingKeyReady, false);
        assert.equal(result.csrLocalProofReady, false);
      } else {
        assert.equal(result.csrTier2SdkReady, false);
      }
      assert.equal(result.requestSequenceReady, false);
      assert.equal(result.executionAllowed, false);
    });
  }

  await t.test("minimal self-asserted local and SDK objects cannot manufacture readiness", () => {
    const fixture = createReadyEvidence(READY_STAGE_CASES[0]);
    fixture.csrEvidence = {
      status: "LOCAL_CRYPTOGRAPHIC_PROOF_FORGED",
      algorithm: "RSA",
      csrSignatureVerified: true,
      csrPublicKeyMatchesCustody: true,
      networkCallsMade: true,
      privateKeyReturned: true,
      productionCompliance: true,
    };
    fixture.sdkEvidence = {
      status: "PASSED",
      officialSdkTier2Executed: true,
      sdkChecksumMatch: true,
      simulationFlagVerified: true,
      csrSignatureVerified: true,
      csrAlgorithmVerified: true,
      csrCurveVerified: true,
      csrSubjectVerified: true,
      csrTemplateVerified: true,
      privateKeyMatchesCsr: true,
      custodyPublicKeyMatchesCsr: true,
      cleanupComplete: true,
      networkCallsMade: false,
      otpUsed: false,
      csidRequested: false,
      sensitiveBodiesReturned: false,
    };
    const result = buildSandboxExecutionPreflight({
      cwd: createRepo(fixture),
      executionStage: "COMPLIANCE_CSID_ONBOARDING",
    });

    assert.equal(result.signingKeyReady, false);
    assert.equal(result.csrLocalProofReady, false);
    assert.equal(result.csrTier2SdkReady, false);
    assert.equal(result.requestSequenceReady, false);
    assert.equal(result.executionAllowed, false);
  });
});

test("uses the recorded metadata packet hash when a caller does not supply one", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ evidencePacketHash: "0".repeat(64) });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.packetHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_EXECUTION_PACKET_HASH_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("normalizes packet line endings before comparing the recorded hash", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ packetLineEnding: "\r\n" });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, true);
});

test("derives all local readiness fields from metadata-only evidence and fails closed for unresolved execution gates", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    custodyEvidence: createCustodyEvidence({
      certificateReceiveCustodyReady: false,
      productionCredentialReceiveCustodyReady: false,
    }),
    csrEvidence: createLocalCsrEvidence(),
    otpEvidence: {
      status: "LOCAL_BOUNDARY_IMPLEMENTED_OFFICIAL_FORMAT_UNCONFIRMED",
      secureOtpInputReady: false,
      officialOtpFormatConfirmed: false,
      otpAvailable: false,
      otpPersisted: false,
    },
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.credentialProviderReady, true);
  assert.equal(result.signingKeyReady, true);
  assert.equal(result.certificateCustodyReady, false);
  assert.equal(result.csrLocalProofReady, true);
  assert.equal(result.csrReady, false);
  assert.equal(result.secureOtpInputReady, false);
  assert.equal(result.otpAvailable, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CERTIFICATE_CUSTODY_NOT_READY"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_CSR_NOT_READY"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_SECURE_OTP_INPUT_NOT_READY"));
  assert.equal(result.executionAllowed, false);
});

test("any incomplete gate leaves execution disallowed", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({ cwd: createRepo() });

  assert.ok(Object.entries(result).some(([key, value]) => key !== "executionAllowed" && value === false));
  assert.equal(result.executionAllowed, false);
});

test("strict no-network CLI validates the safe blocked disposition", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--strict",
      "--no-network",
      "--json",
      "--execution-stage",
      "COMPLIANCE_CSID_ONBOARDING",
    ],
    {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "PREPARED_BLOCKED");
  assert.equal(payload.executionStage, "COMPLIANCE_CSID_ONBOARDING");
  assert.equal(payload.executionAllowed, false);
  assert.equal(payload.networkCallsMade, false);
});

test("strict no-network CLI returns zero for static readiness without dynamic approval", () => {
  const repo = createReadyRepo(READY_STAGE_CASES[0]);
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--strict",
      "--no-network",
      "--json",
      "--execution-stage",
      "COMPLIANCE_CSID_ONBOARDING",
    ],
    {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "STATIC_STAGE_READY_EXECUTION_BLOCKED");
  assert.equal(payload.requestSequenceReady, true);
  assert.equal(payload.executionAllowed, false);
  assert.equal(payload.approvalPresent, false);
  assert.equal(payload.otpAvailable, false);
  assert.equal(payload.networkEnabled, false);
  assert.equal(payload.networkCallsMade, false);
});

test("CLI rejects missing and unsupported stages before preflight execution", () => {
  const repo = createReadyRepo(READY_STAGE_CASES[0]);
  const cases = [
    {
      args: ["--strict", "--no-network", "--json"],
      code: "ZATCA_EXECUTION_STAGE_REQUIRED",
    },
    {
      args: [
        "--strict",
        "--no-network",
        "--json",
        "--execution-stage",
        "UNKNOWN",
      ],
      code: "ZATCA_EXECUTION_STAGE_UNSUPPORTED",
    },
  ];

  for (const row of cases) {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, ...row.args], {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    });
    assert.equal(result.status, 2);
    const payload = JSON.parse(result.stderr);
    assert.deepEqual(payload.safeErrorCodes, [row.code]);
    assert.equal(payload.executionAllowed, false);
    assert.equal(payload.networkCallsMade, false);
  }
});

test("CLI requires explicit no-network mode", () => {
  const repo = createReadyRepo(READY_STAGE_CASES[0]);
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--strict",
      "--json",
      "--execution-stage",
      "COMPLIANCE_CSID_ONBOARDING",
    ],
    {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.deepEqual(payload.safeErrorCodes, ["ZATCA_NO_NETWORK_REQUIRED"]);
  assert.equal(payload.executionAllowed, false);
  assert.equal(payload.networkCallsMade, false);
});

test("CLI requires explicit strict mode", () => {
  const repo = createReadyRepo(READY_STAGE_CASES[0]);
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--no-network",
      "--json",
      "--execution-stage",
      "COMPLIANCE_CSID_ONBOARDING",
    ],
    {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.deepEqual(payload.safeErrorCodes, ["ZATCA_STRICT_MODE_REQUIRED"]);
  assert.equal(payload.executionAllowed, false);
  assert.equal(payload.networkCallsMade, false);
});

test("stage preflight and custody proof are not reachable from API runtime modules", () => {
  const repositoryRoot = path.join(__dirname, "..");
  const preflightSource = fs.readFileSync(SCRIPT_PATH, "utf8");
  assert.doesNotMatch(
    preflightSource,
    /@prisma\/client|node:(?:http|https|net|tls|dns|child_process)|future-official-zatca-sandbox|compliance-csid-secret-custody\.provider/iu,
  );

  const runtimeFiles = [
    "apps/api/src/zatca/zatca.module.ts",
    "apps/api/src/zatca/zatca.controller.ts",
    "apps/api/src/zatca/zatca.service.ts",
  ];
  for (const relativePath of runtimeFiles) {
    const source = fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
    assert.doesNotMatch(
      source,
      /zatca-sandbox-execution-preflight|sandbox-dpapi-receive-readiness|sandbox-stage-readiness/iu,
    );
  }
});

function loadWithNetworkTrap() {
  const networkModules = new Set([
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "node:dns",
    "node:child_process",
    "http",
    "https",
    "net",
    "tls",
    "dns",
    "child_process",
    "@prisma/client",
  ]);
  const originalLoad = Module._load;
  delete require.cache[require.resolve(SCRIPT_PATH)];
  delete require.cache[require.resolve(CONTRACT_VALIDATOR_PATH)];
  Module._load = function guardedLoad(request, parent, isMain) {
    if (
      networkModules.has(request) ||
      /future-official-zatca-sandbox|compliance-csid-secret-custody|sandbox-dpapi-receive-readiness|zatca-sdk/iu.test(
        request,
      )
    ) {
      throw new Error(`blocked runtime module requested: ${request}`);
    }
    return originalLoad.apply(this, arguments);
  };
  try { return require(SCRIPT_PATH); } finally { Module._load = originalLoad; }
}

function createStageEvidence(overrides = {}) {
  const evidence = {
    arc: "ARC-07B-06G",
    status: "NO_SANDBOX_CREDENTIALS_OR_COMPLIANCE_DOCUMENTS",
    contractSha256: null,
    packetSha256: null,
    evidenceProducer: "LEDGERBYTE_NO_CREDENTIALS_ASSERTION_V1",
    credentialInspectionPerformed: false,
    credentialInspectionSha256: null,
    syntheticDataOnly: true,
    complianceCertificatePresent: false,
    complianceCertificateValid: false,
    complianceCertificateKeyMatch: false,
    complianceDocumentMatrixComplete: false,
    productionCertificatePresent: false,
    productionCertificateValid: false,
    productionCertificateKeyMatch: false,
    credentialBodiesRetained: false,
    persistentStateMutated: false,
    networkCallsMade: false,
    hostedResourcesTouched: false,
    ...overrides,
  };
  const credentialInspectionPerformed =
    evidence.complianceCertificatePresent === true ||
    evidence.complianceCertificateValid === true ||
    evidence.complianceCertificateKeyMatch === true ||
    evidence.complianceDocumentMatrixComplete === true ||
    evidence.productionCertificatePresent === true ||
    evidence.productionCertificateValid === true ||
    evidence.productionCertificateKeyMatch === true;
  if (credentialInspectionPerformed) {
    evidence.status = "LOCAL_CREDENTIAL_INSPECTION_EVIDENCE";
    evidence.evidenceProducer = "LEDGERBYTE_BOUNDED_CREDENTIAL_INSPECTION_V1";
    evidence.credentialInspectionPerformed = true;
    evidence.credentialInspectionSha256 = "__AUTO__";
  }
  return evidence;
}

function createCustodyEvidence(overrides = {}) {
  return {
    arc: "ARC-07B-06G",
    status: "LOCAL_PROVEN_NOT_NETWORK_READY",
    provider: "SANDBOX_LOCAL_DPAPI",
    runtimeDefault: "DISABLED",
    scope: "WINDOWS_CURRENT_USER_DPAPI",
    storage: "UNTRACKED_USER_LOCAL_CIPHERTEXT_ONLY",
    environmentGate: "LOCAL_TEST_PLUS_SANDBOX_ONLY",
    syntheticMaterialOnly: true,
    sensitiveBodiesRetained: false,
    importedEnvironment: "FATOORA_SIMULATION",
    internalProviderEnvironment: "SANDBOX",
    targetMappingVerified: true,
    bodyReturned: false,
    legacyPrismaPemFieldsUsed: false,
    tokenReceiveProofPassed: true,
    secretReceiveProofPassed: true,
    certificateReceiveProofPassed: true,
    revocationProofPassed: true,
    cleanupProofPassed: true,
    disposableMetadataEmpty: true,
    certificateReceiveCustodyReady: true,
    productionCredentialReceiveCustodyReady: true,
    actualDpapiUsed: true,
    deletionProofPassed: true,
    ciphertextDiffersFromPlaintext: true,
    systemBinaryPathsPinned: true,
    childProcessEnvironmentScrubbed: true,
    networkIsolationProven: false,
    networkCallsMade: false,
    hostedResourcesTouched: false,
    productionCompliance: false,
    proofCoverage: ["bounded synthetic proof"],
    remainingBlockers: ["official SDK Simulation CSR oracle"],
    ...overrides,
  };
}

function createLocalCsrEvidence(overrides = {}) {
  return {
    arc: "ARC-07B-06C",
    status: "LOCAL_CRYPTOGRAPHIC_PROOF_SDK_ORACLE_UNAVAILABLE",
    algorithm: "EC_SECP256K1",
    syntheticDataOnly: true,
    csrSignatureVerified: true,
    csrPublicKeyMatchesCustody: true,
    privateKeyReturned: false,
    csrBodyReturned: false,
    legacyPrismaPemFieldsUsed: false,
    csrBodyTracked: false,
    networkCallsMade: false,
    hostedResourcesTouched: false,
    officialSdkTier2Executed: false,
    officialSdkTier2Blockers: [
      "ZATCA_SDK_ROOT unavailable in current process",
      "compatible JDK 11 unavailable in current process",
    ],
    productionCompliance: false,
    ...overrides,
  };
}

function createSdkEvidence(overrides = {}) {
  return {
    arc: "ARC-07B-06H",
    status: "PASSED",
    officialSdkTier2Executed: true,
    jdkVersion: "11.0.26",
    sdkVersion: "238-R3.4.8",
    sdkJarSha256:
      "48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530",
    sdkChecksumMatch: true,
    simulationFlagVerified: true,
    noNetworkArgumentVerified: true,
    argumentAllowlistVerified: true,
    csrSignatureVerified: true,
    csrAlgorithm: "ECDSA_SHA256",
    csrAlgorithmVerified: true,
    csrCurve: "secp256k1",
    csrCurveVerified: true,
    csrSubjectVerified: true,
    requestedExtensionsVerified: true,
    csrTemplate: "PREZATCA-Code-Signing",
    csrTemplateVerified: true,
    privateKeyMatchesCsr: true,
    custodyPublicKeyMatchesCsr: true,
    plaintextKeyFileRemoved: true,
    csrFileRemoved: true,
    configFileRemoved: true,
    launcherWorkspaceRemoved: true,
    rawOutputRemoved: true,
    disposableCustodyMetadataEmpty: true,
    cleanupComplete: true,
    networkCallsMade: false,
    otpUsed: false,
    csidRequested: false,
    sensitiveBodiesReturned: false,
    productionExecution: false,
    ...overrides,
  };
}

function createOtpEvidence(ready) {
  return {
    arc: "ARC-07B-06F",
    status: ready
      ? "LOCAL_BOUNDARY_READY_OFFICIAL_FORMAT_CONFIRMED_NO_OTP_OR_APPROVAL"
      : "LOCAL_BOUNDARY_IMPLEMENTED_OFFICIAL_FORMAT_UNCONFIRMED",
    command: "corepack pnpm zatca:sandbox-otp-input -- --stdin-secure",
    terminalInput: "TTY_RAW_MODE_NON_ECHO",
    argumentOtpAccepted: false,
    environmentOtpAccepted: false,
    fileOtpAccepted: false,
    nonInteractiveInputAccepted: false,
    oneShotOperation: true,
    callbackScopedBuffer: true,
    bufferClearedAfterOperation: true,
    secureOtpInputReady: ready,
    officialOtpFormatConfirmed: ready,
    otpAvailable: false,
    otpPersisted: false,
    approvalPresent: false,
    preflightReady: false,
    officialOtpContract: {
      length: 6,
      characterSet: "ASCII_DIGITS_0_TO_9",
      pattern: "^[0-9]{6}$",
      validity: "PT1H",
      sourceIds: [
        "zatca-detailed-technical-guidelines",
        "zatca-fatoora-portal-manual",
      ],
      sourcePages: [
        "zatca-detailed-technical-guidelines:p30",
        "zatca-fatoora-portal-manual:p7",
        "zatca-fatoora-portal-manual:p9",
        "zatca-fatoora-portal-manual:p20",
        "zatca-fatoora-portal-manual:p22",
      ],
    },
    networkCallsMade: false,
    hostedResourcesTouched: false,
    secretBodiesRetained: false,
  };
}

function createReadyEvidence(row) {
  return {
    custodyEvidence: createCustodyEvidence(),
    csrEvidence: createLocalCsrEvidence(),
    sdkEvidence: createSdkEvidence(
      row.sdkReady === true
        ? {}
        : { status: "SKIPPED_EXTERNAL_ORACLE", officialSdkTier2Executed: false },
    ),
    otpEvidence: createOtpEvidence(row.otpReady === true),
    stageEvidence: createStageEvidence(row.stageEvidence),
    lifecycleEvidence: createLifecycleEvidence(),
  };
}

function createLifecycleEvidence(overrides = {}) {
  return {
    externalDnsLookups: 0,
    externalSockets: 0,
    zatcaHostnameAttempts: 0,
    zatcaCalls: 0,
    proofRunRowsRemaining: 0,
    submissionRowsRemaining: 0,
    attemptRowsRemaining: 0,
    productionEgsChainMutations: 0,
    legacyCredentialFieldMutations: 0,
    serverPortClosed: true,
    databasePortClosed: true,
    containerRemoved: true,
    volumeRemoved: true,
    credentialMaterialRetained: false,
    xmlRetained: false,
    rawResponseRetained: false,
    officialSandboxClaimed: false,
    ...overrides,
  };
}

function createReadyRepo(row) {
  return createRepo(createReadyEvidence(row));
}

function credentialFailureCases(stage, credential, row) {
  const prefix = credential === "compliance" ? "complianceCertificate" : "productionCertificate";
  const codePrefix = credential === "compliance"
    ? "ZATCA_COMPLIANCE_CERTIFICATE"
    : "ZATCA_PRODUCTION_CERTIFICATE";
  return [
    {
      name: `${stage} missing ${credential} credential`,
      stage,
      row,
      mutate: ({ stageEvidence }) => {
        stageEvidence[`${prefix}Present`] = false;
        stageEvidence[`${prefix}Valid`] = false;
        stageEvidence[`${prefix}KeyMatch`] = false;
      },
      code: `${codePrefix}_MISSING`,
      field: `${prefix}Present`,
    },
    {
      name: `${stage} invalid ${credential} credential`,
      stage,
      row,
      mutate: ({ stageEvidence }) => {
        stageEvidence[`${prefix}Valid`] = false;
        stageEvidence[`${prefix}KeyMatch`] = false;
      },
      code: `${codePrefix}_INVALID`,
      field: `${prefix}Valid`,
    },
    {
      name: `${stage} key-mismatched ${credential} credential`,
      stage,
      row,
      mutate: ({ stageEvidence }) => {
        stageEvidence[`${prefix}KeyMatch`] = false;
      },
      code: `${codePrefix}_KEY_MISMATCH`,
      field: `${prefix}KeyMatch`,
    },
  ];
}

function assertResultConsistency(result) {
  assert.ok(EXECUTION_STAGES.includes(result.executionStage));
  if (result.complianceCertificateValid) assert.equal(result.complianceCertificatePresent, true);
  if (result.complianceCertificateKeyMatch) {
    assert.equal(result.complianceCertificatePresent, true);
    assert.equal(result.complianceCertificateValid, true);
  }
  if (result.productionCertificateValid) assert.equal(result.productionCertificatePresent, true);
  if (result.productionCertificateKeyMatch) {
    assert.equal(result.productionCertificatePresent, true);
    assert.equal(result.productionCertificateValid, true);
  }
  if (result.executionAllowed) {
    assert.equal(result.requestSequenceReady, true);
    assert.equal(result.networkEnabled, true);
    assert.equal(result.approvalPresent, true);
    if (result.executionStage === "COMPLIANCE_CSID_ONBOARDING") {
      assert.equal(result.otpAvailable, true);
    }
  }
  if (result.status === "STATIC_STAGE_READY_EXECUTION_BLOCKED") {
    assert.equal(result.requestSequenceReady, true);
    assert.equal(result.executionAllowed, false);
  }
}

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-execution-preflight-"));
  const contractEvidence = createContractFixture();
  if (options.mutateContractEvidence) {
    options.mutateContractEvidence(contractEvidence);
  }
  if (options.resignContractEvidence) {
    contractEvidence.contractSha256 = computeContractSha256(contractEvidence);
  }
  const packetContractSha256 =
    options.packetContractSha256 ?? contractEvidence.contractSha256;
  const packet = Object.hasOwn(options, "packetText")
    ? options.packetText
    : buildPacket(
      packetContractSha256,
      options.packetLineEnding || "\n",
      options.omitPacketContractDigest !== true,
    );
  const preflightEvidence = {
    packetSha256:
      options.evidencePacketHash ??
      crypto
        .createHash("sha256")
        .update(`${packet}\n`.replace(/\r\n?/g, "\n"), "utf8")
        .digest("hex"),
    networkCallsMade: false,
    executionAllowed: false,
    retainedSensitiveBodies: false,
  };
  if (!options.omitEvidenceContractDigest) {
    preflightEvidence.contractSha256 =
      options.evidenceContractSha256 ?? contractEvidence.contractSha256;
  }
  const stageEvidence = options.stageEvidence
    ? JSON.parse(JSON.stringify(options.stageEvidence))
    : null;
  if (stageEvidence) {
    stageEvidence.contractSha256 ??= contractEvidence.contractSha256;
    stageEvidence.packetSha256 ??= preflightEvidence.packetSha256;
    if (stageEvidence.credentialInspectionSha256 === "__AUTO__") {
      stageEvidence.credentialInspectionSha256 =
        computeCredentialInspectionSha256(stageEvidence);
    }
  }

  writeText(
    repo,
    "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json",
    JSON.stringify(contractEvidence),
  );
  writeText(repo, "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md", packet);
  writeText(
    repo,
    "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json",
    JSON.stringify(preflightEvidence),
  );
  writeText(
    repo,
    "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json",
    JSON.stringify(options.lifecycleEvidence ?? createLifecycleEvidence()),
  );
  if (options.custodyEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-local-dpapi-custody.json", JSON.stringify(options.custodyEvidence));
  if (options.csrEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-csr-readiness.json", JSON.stringify(options.csrEvidence));
  if (options.sdkEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-csr-sdk-oracle.json", JSON.stringify(options.sdkEvidence));
  if (options.otpEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/secure-ephemeral-otp-input.json", JSON.stringify(options.otpEvidence));
  if (stageEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-stage-readiness.json", JSON.stringify(stageEvidence));
  return repo;
}

function computeCredentialInspectionSha256(evidence) {
  const inspected = {
    evidenceProducer: evidence.evidenceProducer,
    complianceCertificatePresent: evidence.complianceCertificatePresent,
    complianceCertificateValid: evidence.complianceCertificateValid,
    complianceCertificateKeyMatch: evidence.complianceCertificateKeyMatch,
    complianceDocumentMatrixComplete: evidence.complianceDocumentMatrixComplete,
    productionCertificatePresent: evidence.productionCertificatePresent,
    productionCertificateValid: evidence.productionCertificateValid,
    productionCertificateKeyMatch: evidence.productionCertificateKeyMatch,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(inspected), "utf8")
    .digest("hex");
}

function createContractFixture() {
  const evidence = JSON.parse(fs.readFileSync(CONTRACT_FIXTURE_PATH, "utf8"));
  evidence.contractSha256 = computeContractSha256(evidence);
  return evidence;
}

function buildPacket(contractSha256, lineEnding, includeContractDigest) {
  return [
    "# packet",
    ...(includeContractDigest
      ? [`- Contract SHA-256: \`${contractSha256}\`.`]
      : []),
    "Synthetic identifiers only: `ARC07B-SYNTHETIC-001`.",
    "## Rollback, cleanup, and non-claims",
    "No network, OTP, CSID, clearance, reporting, credential, or request body is present.",
  ].join(lineEnding);
}

function writeText(repo, relativePath, value) {
  const target = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${value}\n`);
}

function prependJsonMember(repo, relativePath, member) {
  const target = path.join(repo, ...relativePath.split("/"));
  const original = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, original.replace("{", `{${member}`), "utf8");
}
