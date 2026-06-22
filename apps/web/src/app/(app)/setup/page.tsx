"use client";

import { useEffect, useState } from "react";
import { SetupWizardContent, SetupWizardFallback } from "@/components/onboarding/setup-wizard";
import { LedgerEmptyState, LedgerLoadingState, LedgerPage } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { setupWizardLoadFailureMessage } from "@/lib/dashboard";
import type { DashboardOnboardingChecklist } from "@/lib/types";

export default function SetupPage() {
  const organizationId = useActiveOrganizationId();
  const [checklist, setChecklist] = useState<DashboardOnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setChecklist(null);

    apiRequest<DashboardOnboardingChecklist>("/dashboard/onboarding-checklist")
      .then((result) => {
        if (!cancelled) {
          setChecklist(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (!organizationId) {
    return (
      <LedgerPage>
        <LedgerEmptyState title="Select an organization" description="Log in and select an organization to open guided setup." />
      </LedgerPage>
    );
  }

  if (loading) {
    return (
      <LedgerPage>
        <LedgerLoadingState title="Loading setup checklist" description="Checking live workspace setup evidence." />
      </LedgerPage>
    );
  }

  if (error) {
    return <SetupWizardFallback message={setupWizardLoadFailureMessage(error)} />;
  }

  if (!checklist) {
    return (
      <LedgerPage>
        <LedgerEmptyState title="Setup checklist has not loaded yet" description="Refresh the page after the workspace checklist is available." />
      </LedgerPage>
    );
  }

  return <SetupWizardContent checklist={checklist} />;
}
