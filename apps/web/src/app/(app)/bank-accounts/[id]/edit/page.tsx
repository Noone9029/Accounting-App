"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { BankAccountProfileForm } from "@/components/forms/bank-account-profile-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerSummaryBand } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { BankAccountSummary } from "@/lib/types";

export default function EditBankAccountPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setProfile(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank account profile.");
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
  }, [organizationId, params.id]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Account profile"
        title="Edit bank account"
        description="Update manual bank/cash metadata. The linked chart account cannot be changed."
        actions={<LedgerButton href={profile ? `/bank-accounts/${profile.id}` : "/bank-accounts"}>Back</LedgerButton>}
      />
      <LedgerSummaryBand tone="warning">Opening balances and currency lock after posting activity. This edit page does not reverse journals, reconnect bank feeds, or alter reconciliation periods.</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit bank accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank account...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

        {profile ? <BankAccountProfileForm profile={profile} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
