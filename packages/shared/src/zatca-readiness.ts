export type ZatcaReadinessStatus = "READY" | "WARNINGS" | "BLOCKED";
export type ZatcaReadinessScope =
  | "SELLER_PROFILE"
  | "BUYER_CONTACT"
  | "INVOICE"
  | "EGS"
  | "XML"
  | "SIGNING"
  | "PHASE_2_QR"
  | "PDF_A3"
  | "KEY_CUSTODY"
  | "CSR";
export type ZatcaReadinessSeverity = "ERROR" | "WARNING" | "INFO";

export interface ZatcaReadinessCheck {
  code: string;
  severity: ZatcaReadinessSeverity;
  field: string;
  message: string;
  sourceRule?: string;
  fixHint: string;
}

export interface ZatcaReadinessSection {
  status: ZatcaReadinessStatus;
  scope: ZatcaReadinessScope;
  checks: ZatcaReadinessCheck[];
}

export function deriveZatcaReadinessStatus(checks: readonly ZatcaReadinessCheck[]): ZatcaReadinessStatus {
  if (checks.some((check) => check.severity === "ERROR")) {
    return "BLOCKED";
  }
  if (checks.some((check) => check.severity === "WARNING")) {
    return "WARNINGS";
  }
  return "READY";
}

export function createZatcaReadinessSection(scope: ZatcaReadinessScope, checks: readonly ZatcaReadinessCheck[]): ZatcaReadinessSection {
  return {
    scope,
    status: deriveZatcaReadinessStatus(checks),
    checks: [...checks],
  };
}

export function combineZatcaReadinessStatus(sections: readonly ZatcaReadinessSection[]): ZatcaReadinessStatus {
  if (sections.some((section) => section.status === "BLOCKED")) {
    return "BLOCKED";
  }
  if (sections.some((section) => section.status === "WARNINGS")) {
    return "WARNINGS";
  }
  return "READY";
}
