export type IntegrationReadinessSurface = "bank-feed" | "email" | "payment" | "storage" | "tax-network" | "ai-assistant";
export type IntegrationReadinessMode = "manual-only" | "local-fixture" | "external-provider";
export type IntegrationReadinessStatus = "LOCAL_FIXTURE" | "BLOCKED" | "DEGRADED" | "OPERATOR_REVIEW";

export interface IntegrationReadinessInput {
  surface: IntegrationReadinessSurface;
  mode: IntegrationReadinessMode;
  configPresent?: boolean | null;
  localFixtureAvailable?: boolean | null;
  evidenceReviewed?: boolean | null;
  signedWebhookVerified?: boolean | null;
  monitoringReviewed?: boolean | null;
  externalCallsRequested?: boolean | null;
  hostedMutationApproved?: boolean | null;
}

export interface IntegrationReadinessBoundary {
  externalCallEnabled: false;
  hostedMutationEnabled: false;
  financialPostingEnabled: false;
  customerMessageEnabled: false;
  storageObjectMutationEnabled: false;
  complianceNetworkSubmissionEnabled: false;
  aiAutonomyEnabled: false;
}

export interface IntegrationReadinessPolicy {
  surface: IntegrationReadinessSurface;
  mode: IntegrationReadinessMode;
  status: IntegrationReadinessStatus;
  label: string;
  operatorAction: string;
  blockers: string[];
  warnings: string[];
  evidence: {
    configPresent: boolean;
    localFixtureAvailable: boolean;
    evidenceReviewed: boolean;
    signedWebhookVerified: boolean;
    monitoringReviewed: boolean;
  };
  boundary: IntegrationReadinessBoundary;
}

export const INTEGRATION_READINESS_BOUNDARY: IntegrationReadinessBoundary = {
  externalCallEnabled: false,
  hostedMutationEnabled: false,
  financialPostingEnabled: false,
  customerMessageEnabled: false,
  storageObjectMutationEnabled: false,
  complianceNetworkSubmissionEnabled: false,
  aiAutonomyEnabled: false,
};

const SURFACES: IntegrationReadinessSurface[] = ["bank-feed", "email", "payment", "storage", "tax-network", "ai-assistant"];
const MODES: IntegrationReadinessMode[] = ["manual-only", "local-fixture", "external-provider"];

export function buildIntegrationReadinessPolicy(input: IntegrationReadinessInput): IntegrationReadinessPolicy {
  const surface = supportedSurface(input.surface);
  const mode = supportedMode(input.mode);
  const evidence = {
    configPresent: Boolean(input.configPresent),
    localFixtureAvailable: Boolean(input.localFixtureAvailable),
    evidenceReviewed: Boolean(input.evidenceReviewed),
    signedWebhookVerified: Boolean(input.signedWebhookVerified),
    monitoringReviewed: Boolean(input.monitoringReviewed),
  };
  const blockers = integrationBlockers(input, evidence);
  const warnings = integrationWarnings(mode, evidence);
  const status = integrationStatus(mode, blockers, warnings, evidence);

  return {
    surface,
    mode,
    status,
    label: statusLabel(status),
    operatorAction: operatorAction(status),
    blockers,
    warnings,
    evidence,
    boundary: INTEGRATION_READINESS_BOUNDARY,
  };
}

function integrationBlockers(input: IntegrationReadinessInput, evidence: IntegrationReadinessPolicy["evidence"]): string[] {
  const blockers: string[] = [];
  if (input.externalCallsRequested && !input.hostedMutationApproved) {
    blockers.push("External calls require explicit hosted-mutation approval for this surface.");
  }
  if (input.mode === "external-provider" && !evidence.configPresent) {
    blockers.push("External provider configuration is required before this surface can leave local/manual mode.");
  }
  if (input.mode === "local-fixture" && !evidence.localFixtureAvailable) {
    blockers.push("Local fixture mode requires a local fixture or manual fallback.");
  }
  return blockers;
}

function integrationWarnings(mode: IntegrationReadinessMode, evidence: IntegrationReadinessPolicy["evidence"]): string[] {
  const warnings: string[] = [];
  if (!evidence.configPresent) {
    warnings.push("External configuration is not present.");
  }
  if (mode === "external-provider") {
    if (!evidence.evidenceReviewed) {
      warnings.push("External evidence has not been reviewed.");
    }
    if (!evidence.signedWebhookVerified) {
      warnings.push("Signed webhook verification has not been reviewed.");
    }
    if (!evidence.monitoringReviewed) {
      warnings.push("Monitoring evidence has not been reviewed.");
    }
  }
  return warnings;
}

function integrationStatus(
  mode: IntegrationReadinessMode,
  blockers: string[],
  warnings: string[],
  evidence: IntegrationReadinessPolicy["evidence"],
): IntegrationReadinessStatus {
  if (blockers.length > 0) {
    return "BLOCKED";
  }
  if (mode === "local-fixture" || mode === "manual-only") {
    return "LOCAL_FIXTURE";
  }
  if (evidence.configPresent && evidence.evidenceReviewed && evidence.signedWebhookVerified && evidence.monitoringReviewed && warnings.length === 0) {
    return "OPERATOR_REVIEW";
  }
  return "DEGRADED";
}

function statusLabel(status: IntegrationReadinessStatus): string {
  if (status === "LOCAL_FIXTURE") {
    return "Local fixture";
  }
  if (status === "BLOCKED") {
    return "Blocked";
  }
  if (status === "OPERATOR_REVIEW") {
    return "Evidence ready for operator review";
  }
  return "Configured, evidence incomplete";
}

function operatorAction(status: IntegrationReadinessStatus): string {
  if (status === "LOCAL_FIXTURE") {
    return "Use local fixtures or manual workflow until external evidence is reviewed.";
  }
  if (status === "BLOCKED") {
    return "Resolve blockers before exposing or executing any external workflow.";
  }
  if (status === "OPERATOR_REVIEW") {
    return "Review evidence, approvals, and rollback plan before enabling any external workflow in a separate change.";
  }
  return "Keep the workflow degraded and show missing evidence to operators.";
}

function supportedSurface(value: IntegrationReadinessSurface): IntegrationReadinessSurface {
  if (!SURFACES.includes(value)) {
    throw new Error(`Unsupported integration readiness surface: ${value}`);
  }
  return value;
}

function supportedMode(value: IntegrationReadinessMode): IntegrationReadinessMode {
  if (!MODES.includes(value)) {
    throw new Error(`Unsupported integration readiness mode: ${value}`);
  }
  return value;
}
