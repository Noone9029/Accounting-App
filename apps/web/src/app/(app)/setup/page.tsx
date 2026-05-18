"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SetupWizardContent, SetupWizardFallback } from "@/components/onboarding/setup-wizard";
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
    return <StatusMessage type="info">Log in and select an organization to open guided setup.</StatusMessage>;
  }

  if (loading) {
    return <StatusMessage type="loading">Loading setup checklist...</StatusMessage>;
  }

  if (error) {
    return <SetupWizardFallback message={setupWizardLoadFailureMessage(error)} />;
  }

  if (!checklist) {
    return <StatusMessage type="empty">Setup checklist has not loaded yet.</StatusMessage>;
  }

  return <SetupWizardContent checklist={checklist} />;
}
