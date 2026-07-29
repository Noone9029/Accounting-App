"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  computeContractSha256,
  parseJsonWithoutDuplicateMembers,
  validateOfficialSandboxContracts,
} = require("./zatca-official-sandbox-contracts.cjs");

const CONTRACT_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json";
const PACKET_PATH = "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md";
const EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json";
const CUSTODY_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/sandbox-local-dpapi-custody.json";
const CSR_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/sandbox-csr-readiness.json";
const SDK_CSR_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/sandbox-csr-sdk-oracle.json";
const OTP_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/secure-ephemeral-otp-input.json";
const STAGE_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/sandbox-stage-readiness.json";
const PREFLIGHT_EVIDENCE_PATH =
  "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json";

const EXECUTION_STAGES = Object.freeze([
  "COMPLIANCE_CSID_ONBOARDING",
  "COMPLIANCE_DOCUMENTS",
  "SANDBOX_PRODUCTION_CSID",
  "CLEARANCE",
  "REPORTING",
]);
const OTP_EVIDENCE_KEYS = Object.freeze([
  "approvalPresent",
  "arc",
  "argumentOtpAccepted",
  "bufferClearedAfterOperation",
  "callbackScopedBuffer",
  "command",
  "environmentOtpAccepted",
  "fileOtpAccepted",
  "hostedResourcesTouched",
  "networkCallsMade",
  "nonInteractiveInputAccepted",
  "officialOtpContract",
  "officialOtpFormatConfirmed",
  "oneShotOperation",
  "otpAvailable",
  "otpPersisted",
  "preflightReady",
  "secretBodiesRetained",
  "secureOtpInputReady",
  "status",
  "terminalInput",
]);
const CUSTODY_EVIDENCE_KEYS = Object.freeze([
  "actualDpapiUsed",
  "arc",
  "bodyReturned",
  "certificateReceiveCustodyReady",
  "certificateReceiveProofPassed",
  "childProcessEnvironmentScrubbed",
  "cleanupProofPassed",
  "ciphertextDiffersFromPlaintext",
  "deletionProofPassed",
  "disposableMetadataEmpty",
  "environmentGate",
  "hostedResourcesTouched",
  "importedEnvironment",
  "internalProviderEnvironment",
  "legacyPrismaPemFieldsUsed",
  "networkCallsMade",
  "networkIsolationProven",
  "productionCompliance",
  "productionCredentialReceiveCustodyReady",
  "proofCoverage",
  "provider",
  "remainingBlockers",
  "revocationProofPassed",
  "runtimeDefault",
  "scope",
  "secretReceiveProofPassed",
  "sensitiveBodiesRetained",
  "status",
  "storage",
  "syntheticMaterialOnly",
  "systemBinaryPathsPinned",
  "targetMappingVerified",
  "tokenReceiveProofPassed",
]);
const OTP_CONTRACT_KEYS = Object.freeze([
  "characterSet",
  "length",
  "pattern",
  "sourceIds",
  "sourcePages",
  "validity",
]);
const STAGE_EVIDENCE_KEYS = Object.freeze([
  "arc",
  "complianceCertificateKeyMatch",
  "complianceCertificatePresent",
  "complianceCertificateValid",
  "complianceDocumentMatrixComplete",
  "contractSha256",
  "credentialBodiesRetained",
  "credentialInspectionPerformed",
  "credentialInspectionSha256",
  "evidenceProducer",
  "hostedResourcesTouched",
  "networkCallsMade",
  "packetSha256",
  "persistentStateMutated",
  "productionCertificateKeyMatch",
  "productionCertificatePresent",
  "productionCertificateValid",
  "status",
  "syntheticDataOnly",
]);
const LOCAL_CSR_EVIDENCE_KEYS = Object.freeze([
  "algorithm",
  "arc",
  "csrBodyReturned",
  "csrBodyTracked",
  "csrPublicKeyMatchesCustody",
  "csrSignatureVerified",
  "hostedResourcesTouched",
  "legacyPrismaPemFieldsUsed",
  "networkCallsMade",
  "officialSdkTier2Blockers",
  "officialSdkTier2Executed",
  "privateKeyReturned",
  "productionCompliance",
  "status",
  "syntheticDataOnly",
]);
const SDK_CSR_EVIDENCE_KEYS = Object.freeze([
  "argumentAllowlistVerified",
  "arc",
  "cleanupComplete",
  "configFileRemoved",
  "csrAlgorithm",
  "csrAlgorithmVerified",
  "csrCurve",
  "csrCurveVerified",
  "csrFileRemoved",
  "csrSignatureVerified",
  "csrSubjectVerified",
  "csrTemplate",
  "csrTemplateVerified",
  "custodyPublicKeyMatchesCsr",
  "disposableCustodyMetadataEmpty",
  "jdkVersion",
  "jdkRuntimeChecksumsVerified",
  "launcherWorkspaceRemoved",
  "networkCallsMade",
  "networkGuardMarkersPresent",
  "networkIsolationVerified",
  "noNetworkArgumentVerified",
  "officialSdkTier2Executed",
  "otpUsed",
  "plaintextKeyRemovedBeforeCustodyVerification",
  "plaintextKeyFileRemoved",
  "privateKeyMatchesCsr",
  "productionExecution",
  "rawOutputRemoved",
  "requestedExtensionsVerified",
  "sdkChecksumMatch",
  "sdkConfigChecksumMatch",
  "sdkConfigFileRemoved",
  "sdkJarSha256",
  "sdkVersion",
  "sensitiveBodiesReturned",
  "simulationFlagVerified",
  "status",
  "csidRequested",
]);
const OFFICIAL_SDK_VERSION = "238-R3.4.8";
const OFFICIAL_SDK_JAR_SHA256 =
  "48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530";
const OFFICIAL_SDK_JAVA_VERSION = "11.0.26";

/** @typedef {(typeof EXECUTION_STAGES)[number]} ZatcaSandboxExecutionStage */

function buildSandboxExecutionPreflight(options = {}) {
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const executionStage = EXECUTION_STAGES.includes(options.executionStage)
    ? options.executionStage
    : null;

  const contractEvidence = readJsonMetadata(
    cwd,
    CONTRACT_EVIDENCE_PATH,
    1024 * 1024,
  );
  const contractValidation = validateOfficialSandboxContracts({ cwd });
  const computedContractSha256 = contractEvidence.ok
    ? computeContractSha256(contractEvidence.value)
    : "";
  const validatorContractHashMatches = timingSafeEqual(
    computedContractSha256,
    contractValidation.contractSha256,
  );
  const contractSha256 = validatorContractHashMatches
    ? computedContractSha256
    : "";

  const packet = readText(cwd, PACKET_PATH);
  const custodyEvidence = readJsonMetadata(cwd, CUSTODY_EVIDENCE_PATH);
  const csrEvidence = readJsonMetadata(cwd, CSR_EVIDENCE_PATH);
  const sdkCsrEvidence = readJsonMetadata(cwd, SDK_CSR_EVIDENCE_PATH);
  const otpEvidence = readJsonMetadata(cwd, OTP_EVIDENCE_PATH);
  const stageEvidence = readJsonMetadata(cwd, STAGE_EVIDENCE_PATH);
  const preflightEvidence = readJsonMetadata(cwd, PREFLIGHT_EVIDENCE_PATH);
  const lifecycleEvidence = readJsonMetadata(cwd, EVIDENCE_PATH);

  const packetSha256 = sha256(packet.value || "");
  const recordedPacketSha256 = preflightEvidence.value.packetSha256;
  const recordedPacketHashMatches = timingSafeEqual(
    packetSha256,
    recordedPacketSha256,
  );
  const callerPacketHashMatches =
    options.expectedPacketSha256 === undefined ||
    timingSafeEqual(packetSha256, options.expectedPacketSha256);
  const packetHashMatches =
    recordedPacketHashMatches && callerPacketHashMatches;
  const evidenceContractSha256 = preflightEvidence.value.contractSha256;
  const evidenceContractHashMatches = timingSafeEqual(
    contractSha256,
    evidenceContractSha256,
  );
  const contractHashMatches =
    validatorContractHashMatches && evidenceContractHashMatches;
  const officialContractComplete =
    contractValidation.officialContractComplete === true &&
    validatorContractHashMatches;

  const simulationBaseUrl = contractValidation.simulationBaseUrl || "";
  const productionBaseUrl = contractValidation.productionBaseUrl || "";
  const developerIntegrationSandboxBaseUrl =
    contractValidation.developerIntegrationSandboxBaseUrl || "";
  const configuredTarget = env.ZATCA_SANDBOX_BASE_URL;
  const selectedTarget =
    configuredTarget === undefined ? simulationBaseUrl : configuredTarget;
  const productionTargetDetected =
    selectedTarget === productionBaseUrl ||
    isProductionLookingTarget(selectedTarget);
  const developerPortalTargetDetected =
    selectedTarget === developerIntegrationSandboxBaseUrl ||
    isDeveloperPortalTarget(selectedTarget);
  const sandboxTargetVerified =
    officialContractComplete &&
    simulationBaseUrl.length > 0 &&
    selectedTarget === simulationBaseUrl &&
    !productionTargetDetected &&
    !developerPortalTargetDetected;

  const syntheticDataVerified =
    packet.ok && /Synthetic identifiers only/u.test(packet.value);
  const networkEnabled = options.noNetwork === false;
  const approvalPresent = options.standaloneApproval === true;
  const otpAvailable = options.safeOtpEntryAvailable === true;

  const credentialProviderReady =
    custodyEvidence.ok &&
    validateCustodyEvidence(custodyEvidence.value);
  const custodyTargetMappingReady =
    credentialProviderReady &&
    custodyEvidence.value.importedEnvironment === "FATOORA_SIMULATION" &&
    custodyEvidence.value.internalProviderEnvironment === "SANDBOX" &&
    custodyEvidence.value.targetMappingVerified === true;
  const custodyRoundTripReady =
    custodyTargetMappingReady &&
    custodyEvidence.value.tokenReceiveProofPassed === true &&
    custodyEvidence.value.secretReceiveProofPassed === true &&
    custodyEvidence.value.certificateReceiveProofPassed === true &&
    custodyEvidence.value.revocationProofPassed === true &&
    custodyEvidence.value.cleanupProofPassed === true &&
    custodyEvidence.value.disposableMetadataEmpty === true;
  const certificateReceiveCustodyReady =
    custodyRoundTripReady &&
    custodyEvidence.value.certificateReceiveCustodyReady === true;
  const productionCredentialReceiveCustodyReady =
    custodyRoundTripReady &&
    custodyEvidence.value.productionCredentialReceiveCustodyReady === true;

  const signingKeyReady =
    csrEvidence.ok &&
    validateLocalCsrEvidence(csrEvidence.value);
  const csrLocalProofReady =
    signingKeyReady &&
    typeof csrEvidence.value.status === "string" &&
    csrEvidence.value.status.startsWith("LOCAL_CRYPTOGRAPHIC_PROOF");
  const csrTier2SdkReady =
    sdkCsrEvidence.ok &&
    validateSdkCsrEvidence(sdkCsrEvidence.value);
  const csrReady = csrLocalProofReady && csrTier2SdkReady;

  const secureOtpInputReady =
    otpEvidence.ok && validateOtpEvidence(otpEvidence.value);
  const stageEvidenceSchemaReady =
    stageEvidence.ok &&
    validateStageEvidence(stageEvidence.value, {
      contractSha256,
      packetSha256,
    });
  const stageEvidenceReady =
    stageEvidenceSchemaReady &&
    stageEvidence.value.syntheticDataOnly === true &&
    stageEvidence.value.credentialBodiesRetained === false &&
    stageEvidence.value.persistentStateMutated === false &&
    stageEvidence.value.networkCallsMade === false &&
    stageEvidence.value.hostedResourcesTouched === false &&
    !containsUnsafeMetadata(stageEvidence.value);

  const complianceCertificatePresent =
    stageEvidenceReady &&
    stageEvidence.value.complianceCertificatePresent === true;
  const complianceCertificateValid =
    complianceCertificatePresent &&
    stageEvidence.value.complianceCertificateValid === true;
  const complianceCertificateKeyMatch =
    complianceCertificateValid &&
    stageEvidence.value.complianceCertificateKeyMatch === true;
  const complianceDocumentMatrixComplete =
    stageEvidenceReady &&
    stageEvidence.value.complianceDocumentMatrixComplete === true;
  const productionCertificatePresent =
    stageEvidenceReady &&
    stageEvidence.value.productionCertificatePresent === true;
  const productionCertificateValid =
    productionCertificatePresent &&
    stageEvidence.value.productionCertificateValid === true;
  const productionCertificateKeyMatch =
    productionCertificateValid &&
    stageEvidence.value.productionCertificateKeyMatch === true;

  const rollbackReady = packet.ok && /Rollback, cleanup/u.test(packet.value);
  const lifecycleEvidenceReady =
    lifecycleEvidence.ok &&
    lifecycleEvidence.value.externalDnsLookups === 0 &&
    lifecycleEvidence.value.externalSockets === 0 &&
    lifecycleEvidence.value.zatcaHostnameAttempts === 0 &&
    lifecycleEvidence.value.zatcaCalls === 0 &&
    lifecycleEvidence.value.proofRunRowsRemaining === 0 &&
    lifecycleEvidence.value.submissionRowsRemaining === 0 &&
    lifecycleEvidence.value.attemptRowsRemaining === 0 &&
    lifecycleEvidence.value.productionEgsChainMutations === 0 &&
    lifecycleEvidence.value.legacyCredentialFieldMutations === 0 &&
    lifecycleEvidence.value.serverPortClosed === true &&
    lifecycleEvidence.value.databasePortClosed === true &&
    lifecycleEvidence.value.containerRemoved === true &&
    lifecycleEvidence.value.volumeRemoved === true &&
    lifecycleEvidence.value.credentialMaterialRetained === false &&
    lifecycleEvidence.value.xmlRetained === false &&
    lifecycleEvidence.value.rawResponseRetained === false &&
    lifecycleEvidence.value.officialSandboxClaimed === false &&
    !containsUnsafeMetadata(lifecycleEvidence.value);
  const preflightEvidenceReady =
    preflightEvidence.ok &&
    isSha256(preflightEvidence.value.contractSha256) &&
    isSha256(preflightEvidence.value.packetSha256) &&
    preflightEvidence.value.networkCallsMade === false &&
    preflightEvidence.value.executionAllowed === false &&
    preflightEvidence.value.retainedSensitiveBodies === false &&
    !containsUnsafeMetadata(preflightEvidence.value);
  const evidenceReady = lifecycleEvidenceReady && preflightEvidenceReady;
  const cleanupReady = evidenceReady && rollbackReady;

  const sharedStaticReady =
    executionStage !== null &&
    officialContractComplete &&
    contractHashMatches &&
    packetHashMatches &&
    sandboxTargetVerified &&
    syntheticDataVerified &&
    credentialProviderReady &&
    custodyTargetMappingReady &&
    custodyRoundTripReady &&
    signingKeyReady &&
    stageEvidenceReady &&
    rollbackReady &&
    cleanupReady &&
    evidenceReady;
  const stageStaticReady = evaluateStageStaticReadiness(executionStage, {
    csrReady,
    secureOtpInputReady,
    certificateReceiveCustodyReady,
    complianceCertificatePresent,
    complianceCertificateValid,
    complianceCertificateKeyMatch,
    complianceDocumentMatrixComplete,
    productionCredentialReceiveCustodyReady,
    productionCertificatePresent,
    productionCertificateValid,
    productionCertificateKeyMatch,
  });
  const requestSequenceReady = sharedStaticReady && stageStaticReady;
  const stageRequiresOtp = executionStage === "COMPLIANCE_CSID_ONBOARDING";
  const executionAllowed =
    requestSequenceReady &&
    approvalPresent &&
    networkEnabled &&
    (!stageRequiresOtp || otpAvailable);

  const safeErrorCodes = [];
  const addSafeErrorCode = (code) => {
    if (!safeErrorCodes.includes(code)) safeErrorCodes.push(code);
  };

  for (const blocker of contractValidation.blockers || []) {
    if (typeof blocker === "string" && /^ZATCA_[A-Z0-9_]+$/u.test(blocker)) {
      addSafeErrorCode(blocker);
    }
  }
  if (!contractEvidence.ok) {
    addSafeErrorCode("ZATCA_EXECUTION_CONTRACT_EVIDENCE_MISSING");
  }
  if (!packet.ok) addSafeErrorCode("ZATCA_EXECUTION_PACKET_MISSING");
  if (!officialContractComplete) {
    addSafeErrorCode("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED");
  }
  if (!isSha256(evidenceContractSha256)) {
    addSafeErrorCode("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISSING");
  } else if (!evidenceContractHashMatches) {
    addSafeErrorCode("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISMATCH");
  }
  if (!syntheticDataVerified) {
    addSafeErrorCode("ZATCA_SYNTHETIC_DATA_UNVERIFIED");
  }
  if (productionTargetDetected) {
    addSafeErrorCode("ZATCA_PRODUCTION_TARGET_DETECTED");
  } else if (developerPortalTargetDetected) {
    addSafeErrorCode("ZATCA_DEVELOPER_PORTAL_TARGET_REJECTED");
  } else if (!sandboxTargetVerified) {
    addSafeErrorCode("ZATCA_SANDBOX_TARGET_MISMATCH");
  }
  if (!credentialProviderReady) {
    addSafeErrorCode("ZATCA_CREDENTIAL_PROVIDER_NOT_READY");
  }
  if (!custodyTargetMappingReady) {
    addSafeErrorCode("ZATCA_CUSTODY_TARGET_MAPPING_NOT_READY");
  }
  if (!signingKeyReady) addSafeErrorCode("ZATCA_SIGNING_KEY_NOT_READY");
  if (!stageEvidenceReady) {
    addSafeErrorCode("ZATCA_STAGE_EVIDENCE_NOT_READY");
  }
  if (!rollbackReady) addSafeErrorCode("ZATCA_ROLLBACK_NOT_READY");
  if (!cleanupReady) addSafeErrorCode("ZATCA_CLEANUP_NOT_READY");
  if (!evidenceReady) addSafeErrorCode("ZATCA_EVIDENCE_NOT_READY");
  if (!lifecycleEvidenceReady) {
    addSafeErrorCode("ZATCA_LIFECYCLE_EVIDENCE_NOT_READY");
  }
  if (!preflightEvidenceReady) {
    addSafeErrorCode("ZATCA_PREFLIGHT_EVIDENCE_NOT_READY");
  }
  if (!isSha256(recordedPacketSha256)) {
    addSafeErrorCode("ZATCA_EXECUTION_PACKET_HASH_MISSING");
  } else if (!recordedPacketHashMatches || !callerPacketHashMatches) {
    addSafeErrorCode("ZATCA_EXECUTION_PACKET_HASH_MISMATCH");
  }
  if (executionStage === null) {
    addSafeErrorCode(
      options.executionStage === undefined
        ? "ZATCA_EXECUTION_STAGE_REQUIRED"
        : "ZATCA_EXECUTION_STAGE_UNSUPPORTED",
    );
    if (!certificateReceiveCustodyReady) {
      addSafeErrorCode("ZATCA_CERTIFICATE_CUSTODY_NOT_READY");
    }
    if (!csrReady) addSafeErrorCode("ZATCA_CSR_NOT_READY");
    if (!secureOtpInputReady) {
      addSafeErrorCode("ZATCA_SECURE_OTP_INPUT_NOT_READY");
    }
  } else {
    addStageStaticErrorCodes(executionStage, {
      csrLocalProofReady,
      csrTier2SdkReady,
      secureOtpInputReady,
      certificateReceiveCustodyReady,
      complianceCertificatePresent,
      complianceCertificateValid,
      complianceCertificateKeyMatch,
      complianceDocumentMatrixComplete,
      productionCredentialReceiveCustodyReady,
      productionCertificatePresent,
      productionCertificateValid,
      productionCertificateKeyMatch,
    }, addSafeErrorCode);
  }
  if (!approvalPresent) {
    addSafeErrorCode("ZATCA_EXECUTION_APPROVAL_MISSING");
  }
  if (stageRequiresOtp && !otpAvailable) {
    addSafeErrorCode("ZATCA_OTP_UNAVAILABLE");
  }
  if (!networkEnabled) addSafeErrorCode("ZATCA_NETWORK_DISABLED");
  if (!requestSequenceReady) {
    addSafeErrorCode("ZATCA_REQUEST_SEQUENCE_NOT_READY");
  }

  const status = requestSequenceReady
    ? executionAllowed
      ? "EXECUTION_GATES_SATISFIED"
      : "STATIC_STAGE_READY_EXECUTION_BLOCKED"
    : "PREPARED_BLOCKED";

  return {
    status,
    safeErrorCodes,
    executionStage,
    contractSha256,
    contractHashMatches,
    packetSha256,
    packetHashMatches,
    networkEnabled,
    networkCallsMade: false,
    approvalPresent,
    sandboxTargetVerified,
    productionTargetDetected,
    developerPortalTargetDetected,
    syntheticDataVerified,
    officialContractComplete,
    credentialProviderReady,
    signingKeyReady,
    certificateCustodyReady: certificateReceiveCustodyReady,
    certificateReceiveCustodyReady,
    complianceCertificatePresent,
    complianceCertificateValid,
    complianceCertificateKeyMatch,
    complianceDocumentMatrixComplete,
    productionCredentialReceiveCustodyReady,
    productionCertificatePresent,
    productionCertificateValid,
    productionCertificateKeyMatch,
    csrLocalProofReady,
    csrTier2SdkReady,
    csrReady,
    secureOtpInputReady,
    otpAvailable,
    rollbackReady,
    cleanupReady,
    evidenceReady,
    requestSequenceReady,
    executionAllowed,
  };
}

function evaluateStageStaticReadiness(stage, checks) {
  switch (stage) {
    case "COMPLIANCE_CSID_ONBOARDING":
      return (
        checks.csrReady &&
        checks.secureOtpInputReady &&
        checks.certificateReceiveCustodyReady
      );
    case "COMPLIANCE_DOCUMENTS":
      return (
        checks.complianceCertificatePresent &&
        checks.complianceCertificateValid &&
        checks.complianceCertificateKeyMatch
      );
    case "SANDBOX_PRODUCTION_CSID":
      return (
        checks.complianceCertificatePresent &&
        checks.complianceCertificateValid &&
        checks.complianceCertificateKeyMatch &&
        checks.complianceDocumentMatrixComplete &&
        checks.productionCredentialReceiveCustodyReady
      );
    case "CLEARANCE":
    case "REPORTING":
      return (
        checks.productionCertificatePresent &&
        checks.productionCertificateValid &&
        checks.productionCertificateKeyMatch
      );
    default:
      return false;
  }
}

function addStageStaticErrorCodes(stage, checks, add) {
  if (stage === "COMPLIANCE_CSID_ONBOARDING") {
    if (!checks.csrLocalProofReady) add("ZATCA_CSR_LOCAL_PROOF_NOT_READY");
    if (!checks.csrTier2SdkReady) add("ZATCA_CSR_TIER2_SDK_NOT_READY");
    if (!checks.secureOtpInputReady) add("ZATCA_SECURE_OTP_INPUT_NOT_READY");
    if (!checks.certificateReceiveCustodyReady) {
      add("ZATCA_CERTIFICATE_RECEIVE_CUSTODY_NOT_READY");
      add("ZATCA_CERTIFICATE_CUSTODY_NOT_READY");
    }
    return;
  }

  if (
    stage === "COMPLIANCE_DOCUMENTS" ||
    stage === "SANDBOX_PRODUCTION_CSID"
  ) {
    addCredentialErrorCodes(
      "ZATCA_COMPLIANCE_CERTIFICATE",
      checks.complianceCertificatePresent,
      checks.complianceCertificateValid,
      checks.complianceCertificateKeyMatch,
      add,
    );
  }
  if (stage === "SANDBOX_PRODUCTION_CSID") {
    if (!checks.complianceDocumentMatrixComplete) {
      add("ZATCA_COMPLIANCE_DOCUMENT_MATRIX_INCOMPLETE");
    }
    if (!checks.productionCredentialReceiveCustodyReady) {
      add("ZATCA_PRODUCTION_CREDENTIAL_RECEIVE_CUSTODY_NOT_READY");
    }
  }
  if (stage === "CLEARANCE" || stage === "REPORTING") {
    addCredentialErrorCodes(
      "ZATCA_PRODUCTION_CERTIFICATE",
      checks.productionCertificatePresent,
      checks.productionCertificateValid,
      checks.productionCertificateKeyMatch,
      add,
    );
  }
}

function addCredentialErrorCodes(prefix, present, valid, keyMatch, add) {
  if (!present) add(`${prefix}_MISSING`);
  else if (!valid) add(`${prefix}_INVALID`);
  else if (!keyMatch) add(`${prefix}_KEY_MISMATCH`);
}

function validateLocalCsrEvidence(value) {
  return (
    hasExactKeys(value, LOCAL_CSR_EVIDENCE_KEYS) &&
    value.arc === "ARC-07B-06C" &&
    value.status === "LOCAL_CRYPTOGRAPHIC_PROOF_SDK_ORACLE_UNAVAILABLE" &&
    value.algorithm === "EC_SECP256K1" &&
    value.syntheticDataOnly === true &&
    value.csrSignatureVerified === true &&
    value.csrPublicKeyMatchesCustody === true &&
    value.privateKeyReturned === false &&
    value.csrBodyReturned === false &&
    value.legacyPrismaPemFieldsUsed === false &&
    value.csrBodyTracked === false &&
    value.networkCallsMade === false &&
    value.hostedResourcesTouched === false &&
    value.officialSdkTier2Executed === false &&
    isSafeStringArray(value.officialSdkTier2Blockers) &&
    value.officialSdkTier2Blockers.length > 0 &&
    value.productionCompliance === false &&
    !containsUnsafeMetadata(value)
  );
}

function validateSdkCsrEvidence(value) {
  return (
    hasExactKeys(value, SDK_CSR_EVIDENCE_KEYS) &&
    value.arc === "ARC-07B-06H" &&
    value.status === "PASSED" &&
    value.officialSdkTier2Executed === true &&
    value.jdkVersion === OFFICIAL_SDK_JAVA_VERSION &&
    value.sdkVersion === OFFICIAL_SDK_VERSION &&
    value.sdkJarSha256 === OFFICIAL_SDK_JAR_SHA256 &&
    value.sdkChecksumMatch === true &&
    value.sdkConfigChecksumMatch === true &&
    value.jdkRuntimeChecksumsVerified === true &&
    value.networkGuardMarkersPresent === true &&
    value.networkIsolationVerified === true &&
    value.simulationFlagVerified === true &&
    value.noNetworkArgumentVerified === true &&
    value.argumentAllowlistVerified === true &&
    value.csrSignatureVerified === true &&
    value.csrAlgorithm === "ECDSA_SHA256" &&
    value.csrAlgorithmVerified === true &&
    value.csrCurve === "secp256k1" &&
    value.csrCurveVerified === true &&
    value.csrSubjectVerified === true &&
    value.requestedExtensionsVerified === true &&
    value.csrTemplate === "PREZATCA-Code-Signing" &&
    value.csrTemplateVerified === true &&
    value.privateKeyMatchesCsr === true &&
    value.custodyPublicKeyMatchesCsr === true &&
    value.plaintextKeyRemovedBeforeCustodyVerification === true &&
    value.plaintextKeyFileRemoved === true &&
    value.csrFileRemoved === true &&
    value.configFileRemoved === true &&
    value.sdkConfigFileRemoved === true &&
    value.launcherWorkspaceRemoved === true &&
    value.rawOutputRemoved === true &&
    value.disposableCustodyMetadataEmpty === true &&
    value.cleanupComplete === true &&
    value.networkCallsMade === false &&
    value.otpUsed === false &&
    value.csidRequested === false &&
    value.sensitiveBodiesReturned === false &&
    value.productionExecution === false &&
    !containsUnsafeMetadata(value)
  );
}

function validateCustodyEvidence(value) {
  return (
    hasExactKeys(value, CUSTODY_EVIDENCE_KEYS) &&
    value.arc === "ARC-07B-06G" &&
    value.status === "LOCAL_PROVEN_NOT_NETWORK_READY" &&
    value.provider === "SANDBOX_LOCAL_DPAPI" &&
    value.runtimeDefault === "DISABLED" &&
    value.scope === "WINDOWS_CURRENT_USER_DPAPI" &&
    value.storage === "UNTRACKED_USER_LOCAL_CIPHERTEXT_ONLY" &&
    value.environmentGate === "LOCAL_TEST_PLUS_SANDBOX_ONLY" &&
    value.importedEnvironment === "FATOORA_SIMULATION" &&
    value.internalProviderEnvironment === "SANDBOX" &&
    value.targetMappingVerified === true &&
    value.productionCompliance === false &&
    value.syntheticMaterialOnly === true &&
    value.bodyReturned === false &&
    value.legacyPrismaPemFieldsUsed === false &&
    value.networkCallsMade === false &&
    value.networkIsolationProven === false &&
    value.ciphertextDiffersFromPlaintext === true &&
    value.systemBinaryPathsPinned === true &&
    value.childProcessEnvironmentScrubbed === true &&
    value.hostedResourcesTouched === false &&
    value.sensitiveBodiesRetained === false &&
    value.actualDpapiUsed === true &&
    value.tokenReceiveProofPassed === true &&
    value.secretReceiveProofPassed === true &&
    value.certificateReceiveProofPassed === true &&
    value.revocationProofPassed === true &&
    value.deletionProofPassed === true &&
    value.cleanupProofPassed === true &&
    value.disposableMetadataEmpty === true &&
    typeof value.certificateReceiveCustodyReady === "boolean" &&
    typeof value.productionCredentialReceiveCustodyReady === "boolean" &&
    isSafeStringArray(value.proofCoverage) &&
    isSafeStringArray(value.remainingBlockers) &&
    !containsUnsafeMetadata(value)
  );
}

function validateOtpEvidence(value) {
  if (
    !hasExactKeys(value, OTP_EVIDENCE_KEYS) ||
    value.arc !== "ARC-07B-06F" ||
    value.status !==
      "LOCAL_BOUNDARY_READY_OFFICIAL_FORMAT_CONFIRMED_NO_OTP_OR_APPROVAL" ||
    value.command !==
      "corepack pnpm zatca:sandbox-otp-input -- --stdin-secure" ||
    value.terminalInput !== "TTY_RAW_MODE_NON_ECHO" ||
    value.argumentOtpAccepted !== false ||
    value.environmentOtpAccepted !== false ||
    value.fileOtpAccepted !== false ||
    value.nonInteractiveInputAccepted !== false ||
    value.oneShotOperation !== true ||
    value.callbackScopedBuffer !== true ||
    value.bufferClearedAfterOperation !== true ||
    value.otpPersisted !== false ||
    value.otpAvailable !== false ||
    value.approvalPresent !== false ||
    value.preflightReady !== false ||
    value.officialOtpFormatConfirmed !== true ||
    value.secureOtpInputReady !== true ||
    value.networkCallsMade !== false ||
    value.hostedResourcesTouched !== false ||
    value.secretBodiesRetained !== false ||
    containsUnsafeMetadata(value)
  ) {
    return false;
  }

  const contract = value.officialOtpContract;
  return (
    hasExactKeys(contract, OTP_CONTRACT_KEYS) &&
    contract.length === 6 &&
    contract.characterSet === "ASCII_DIGITS_0_TO_9" &&
    contract.pattern === "^[0-9]{6}$" &&
    contract.validity === "PT1H" &&
    arraysEqual(contract.sourceIds, [
      "zatca-detailed-technical-guidelines",
      "zatca-fatoora-portal-manual",
    ]) &&
    arraysEqual(contract.sourcePages, [
      "zatca-detailed-technical-guidelines:p30",
      "zatca-fatoora-portal-manual:p7",
      "zatca-fatoora-portal-manual:p9",
      "zatca-fatoora-portal-manual:p20",
      "zatca-fatoora-portal-manual:p22",
    ])
  );
}

function validateStageEvidence(value, expected) {
  if (
    !hasExactKeys(value, STAGE_EVIDENCE_KEYS) ||
    value.arc !== "ARC-07B-06G" ||
    !timingSafeEqual(value.contractSha256, expected.contractSha256) ||
    !timingSafeEqual(value.packetSha256, expected.packetSha256) ||
    value.syntheticDataOnly !== true ||
    value.credentialBodiesRetained !== false ||
    value.persistentStateMutated !== false ||
    value.networkCallsMade !== false ||
    value.hostedResourcesTouched !== false ||
    containsUnsafeMetadata(value)
  ) {
    return false;
  }

  const booleanFields = [
    "credentialInspectionPerformed",
    "complianceCertificatePresent",
    "complianceCertificateValid",
    "complianceCertificateKeyMatch",
    "complianceDocumentMatrixComplete",
    "productionCertificatePresent",
    "productionCertificateValid",
    "productionCertificateKeyMatch",
  ];
  if (booleanFields.some((field) => typeof value[field] !== "boolean")) {
    return false;
  }
  if (
    (value.complianceCertificateValid &&
      !value.complianceCertificatePresent) ||
    (value.complianceCertificateKeyMatch &&
      !value.complianceCertificateValid) ||
    (value.productionCertificateValid &&
      !value.productionCertificatePresent) ||
    (value.productionCertificateKeyMatch &&
      !value.productionCertificateValid)
  ) {
    return false;
  }

  const hasCredentialClaim =
    value.complianceCertificatePresent ||
    value.complianceCertificateValid ||
    value.complianceCertificateKeyMatch ||
    value.complianceDocumentMatrixComplete ||
    value.productionCertificatePresent ||
    value.productionCertificateValid ||
    value.productionCertificateKeyMatch;

  if (!value.credentialInspectionPerformed) {
    return (
      !hasCredentialClaim &&
      value.status === "NO_SANDBOX_CREDENTIALS_OR_COMPLIANCE_DOCUMENTS" &&
      value.evidenceProducer === "LEDGERBYTE_NO_CREDENTIALS_ASSERTION_V1" &&
      value.credentialInspectionSha256 === null
    );
  }

  return (
    value.status === "LOCAL_CREDENTIAL_INSPECTION_EVIDENCE" &&
    value.evidenceProducer ===
      "LEDGERBYTE_BOUNDED_CREDENTIAL_INSPECTION_V1" &&
    isSha256(value.credentialInspectionSha256) &&
    timingSafeEqual(
      value.credentialInspectionSha256,
      computeCredentialInspectionSha256(value),
    )
  );
}

function computeCredentialInspectionSha256(value) {
  const inspected = {
    evidenceProducer: value.evidenceProducer,
    complianceCertificatePresent: value.complianceCertificatePresent,
    complianceCertificateValid: value.complianceCertificateValid,
    complianceCertificateKeyMatch: value.complianceCertificateKeyMatch,
    complianceDocumentMatrixComplete: value.complianceDocumentMatrixComplete,
    productionCertificatePresent: value.productionCertificatePresent,
    productionCertificateValid: value.productionCertificateValid,
    productionCertificateKeyMatch: value.productionCertificateKeyMatch,
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(inspected), "utf8")
    .digest("hex");
}

function hasExactKeys(value, expectedKeys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    arraysEqual(Object.keys(value).sort(), [...expectedKeys].sort())
  );
}

function arraysEqual(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((item, index) => item === expected[index])
  );
}

function isSafeStringArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 32 &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.length > 0 &&
        item.length <= 160 &&
        !containsUnsafeMetadata(item),
    )
  );
}

function containsUnsafeMetadata(value, key = "", depth = 0) {
  if (depth > 12) return true;
  const normalizedKey = String(key)
    .replace(/[^a-z0-9]/giu, "")
    .toLowerCase();
  const forbiddenKeys = new Set([
    "otp",
    "otpvalue",
    "privatekey",
    "privatekeypem",
    "csr",
    "csrpem",
    "certificate",
    "certificatepem",
    "token",
    "secret",
    "authorization",
    "cookie",
    "requestbody",
    "responsebody",
    "signedxml",
    "xml",
    "qrpayload",
  ]);
  if (forbiddenKeys.has(normalizedKey)) return true;

  if (typeof value === "string") {
    return (
      value.length > 4096 ||
      /-----BEGIN [A-Z ]+-----|<\?xml|<Invoice\b|Bearer\s+[A-Za-z0-9._-]+/iu.test(
        value,
      ) ||
      /^[A-Za-z]:[\\/]/u.test(value) ||
      /^\\\\/u.test(value) ||
      /^\/(?:home|Users|tmp|var)\//u.test(value)
    );
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return false;
  }
  if (typeof value === "number") return !Number.isFinite(value);
  if (Array.isArray(value)) {
    return (
      value.length > 1000 ||
      value.some((item) => containsUnsafeMetadata(item, key, depth + 1))
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return (
      entries.length > 100 ||
      entries.some(([childKey, childValue]) =>
        containsUnsafeMetadata(childValue, childKey, depth + 1),
      )
    );
  }
  return true;
}

function readJsonMetadata(cwd, relativePath, maxBytes = 65536) {
  const text = readText(cwd, relativePath);
  if (!text.ok || Buffer.byteLength(text.value, "utf8") > maxBytes) {
    return { ok: false, value: {} };
  }
  try {
    const value = parseJsonWithoutDuplicateMembers(text.value);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value }
      : { ok: false, value: {} };
  } catch {
    return { ok: false, value: {} };
  }
}

function readText(cwd, relativePath) {
  try {
    return {
      ok: true,
      value: fs.readFileSync(path.join(cwd, relativePath), "utf8"),
    };
  } catch {
    return { ok: false, value: "" };
  }
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value.replace(/\r\n?/gu, "\n"), "utf8")
    .digest("hex");
}

function timingSafeEqual(actual, expected) {
  if (!isSha256(actual) || !isSha256(expected)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(actual.toLowerCase(), "hex"),
    Buffer.from(expected.toLowerCase(), "hex"),
  );
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/iu.test(value);
}

function isProductionLookingTarget(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const parsed = new URL(value);
    return (
      /(^|[.-])(prod|production)([.-]|$)/iu.test(parsed.hostname) ||
      parsed.pathname === "/e-invoicing/core" ||
      parsed.pathname.startsWith("/e-invoicing/core/")
    );
  } catch {
    return false;
  }
}

function isDeveloperPortalTarget(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const pathname = new URL(value).pathname;
    return (
      pathname === "/e-invoicing/developer-portal" ||
      pathname.startsWith("/e-invoicing/developer-portal/")
    );
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const args = {
    ok: true,
    json: false,
    noNetwork: false,
    strict: false,
    executionStage: undefined,
    expectedPacketSha256: undefined,
    safeErrorCode: null,
  };
  let noNetworkSeen = false;
  let strictSeen = false;
  let jsonSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") continue;
    if (token === "--json" && !jsonSeen) {
      args.json = true;
      jsonSeen = true;
      continue;
    }
    if (token === "--no-network" && !noNetworkSeen) {
      args.noNetwork = true;
      noNetworkSeen = true;
      continue;
    }
    if (token === "--strict" && !strictSeen) {
      args.strict = true;
      strictSeen = true;
      continue;
    }
    if (
      token === "--execution-stage" &&
      args.executionStage === undefined &&
      typeof argv[index + 1] === "string" &&
      !argv[index + 1].startsWith("--")
    ) {
      args.executionStage = argv[index + 1];
      index += 1;
      continue;
    }
    if (
      token === "--expected-packet-sha256" &&
      args.expectedPacketSha256 === undefined &&
      isSha256(argv[index + 1])
    ) {
      args.expectedPacketSha256 = argv[index + 1].toLowerCase();
      index += 1;
      continue;
    }
    args.ok = false;
    args.safeErrorCode = "ZATCA_UNSAFE_INVOCATION";
  }

  if (args.executionStage === undefined) {
    args.ok = false;
    args.safeErrorCode ??= "ZATCA_EXECUTION_STAGE_REQUIRED";
  } else if (!EXECUTION_STAGES.includes(args.executionStage)) {
    args.ok = false;
    args.safeErrorCode ??= "ZATCA_EXECUTION_STAGE_UNSUPPORTED";
  }
  if (!args.strict) {
    args.ok = false;
    args.safeErrorCode ??= "ZATCA_STRICT_MODE_REQUIRED";
  }
  return args;
}

function runCli(argv = process.argv.slice(2), io = console) {
  const args = parseArgs(argv);
  if (!args.ok) {
    const refusal = {
      status: "BLOCKED_UNSAFE_INVOCATION",
      safeErrorCodes: [args.safeErrorCode || "ZATCA_UNSAFE_INVOCATION"],
      executionStage: null,
      networkCallsMade: false,
      executionAllowed: false,
    };
    (args.json ? io.error : io.log)(JSON.stringify(refusal));
    return 2;
  }
  if (!args.noNetwork) {
    const refusal = {
      status: "BLOCKED_NO_NETWORK_REQUIRED",
      safeErrorCodes: ["ZATCA_NO_NETWORK_REQUIRED"],
      executionStage: args.executionStage,
      networkCallsMade: false,
      executionAllowed: false,
    };
    (args.json ? io.error : io.log)(JSON.stringify(refusal));
    return 2;
  }

  const result = buildSandboxExecutionPreflight({
    executionStage: args.executionStage,
    expectedPacketSha256: args.expectedPacketSha256,
    noNetwork: true,
  });
  io.log(JSON.stringify(result));
  return result.requestSequenceReady ? 0 : 1;
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  EXECUTION_STAGES,
  buildSandboxExecutionPreflight,
  parseArgs,
  runCli,
};
