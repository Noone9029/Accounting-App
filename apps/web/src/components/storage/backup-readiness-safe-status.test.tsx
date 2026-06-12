import { render, screen } from "@testing-library/react";
import { BackupReadinessSafeStatus } from "./backup-readiness-safe-status";
import type { BackupReadinessResponse, RestoreDrillPlanResponse } from "@/lib/types";

const backupReadiness: BackupReadinessResponse = {
  readOnly: true,
  noMutation: true,
  noBackupExecuted: true,
  noRestoreExecuted: true,
  noSecretsReturned: true,
  productionReady: false,
  databaseBackupConfigured: false,
  pointInTimeRecoveryConfigured: false,
  migrationHistoryAvailable: false,
  objectStorageBackupConfigured: false,
  generatedDocumentBackupConfigured: false,
  attachmentBackupConfigured: false,
  restoreDrillVerified: false,
  restoreVerificationVerified: false,
  rpoRtoReviewed: false,
  evidenceRequired: true,
  requiredEvidenceTypes: [
    "DATABASE_BACKUP",
    "POINT_IN_TIME_RECOVERY",
    "MIGRATION_HISTORY",
    "OBJECT_STORAGE_BACKUP",
    "GENERATED_DOCUMENT_BACKUP",
    "ATTACHMENT_BACKUP",
    "RESTORE_DRILL",
    "RESTORE_VERIFICATION",
    "RPO_RTO_REVIEW",
  ],
  verifiedEvidenceTypes: [],
  missingEvidenceTypes: ["DATABASE_BACKUP", "RESTORE_DRILL", "RPO_RTO_REVIEW"],
  blockers: ["Verified database backup evidence is required."],
  warnings: ["RPO/RTO targets require business review."],
  recommendedNextSteps: ["Capture metadata-only backup evidence."],
};

const restorePlan: RestoreDrillPlanResponse = {
  readOnly: true,
  noMutation: true,
  noRestoreExecuted: true,
  noCustomerDataExported: true,
  noSecretsReturned: true,
  productionReady: false,
  plannedSteps: ["select snapshot", "restore into isolated environment", "verify email sending disabled"],
  blockers: ["Restore drill has not been verified."],
  warnings: ["No restore is executed by this plan."],
  recommendedNextSteps: ["Run a supervised non-production restore drill."],
};

describe("BackupReadinessSafeStatus", () => {
  it("renders safe backup blockers and never renders secret-like values", () => {
    render(<BackupReadinessSafeStatus readiness={backupReadiness} restorePlan={restorePlan} />);

    expect(screen.getByText("Backup metadata review incomplete")).toBeTruthy();
    expect(screen.getByText("No backup executed")).toBeTruthy();
    expect(screen.getByText("No restore executed")).toBeTruthy();
    expect(screen.getByText("RPO/RTO review required")).toBeTruthy();
    expect(screen.getByText("Restore drill unverified")).toBeTruthy();
    expect(screen.getByText(/Verified database backup evidence is required/)).toBeTruthy();
    expect(screen.getByText(/restore into isolated environment/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("postgresql://");
    expect(document.body.textContent).not.toContain("service_role");
    expect(document.body.textContent).not.toContain("S3_SECRET_ACCESS_KEY");
    expect(document.body.textContent).not.toContain("<Invoice");
  });
});
