"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerLoadingState, LedgerPage, LedgerPageBody } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { PERMISSIONS } from "@/lib/permissions";
import { getRecurringTemplate, type RecurringTemplate } from "@/lib/recurring-transactions";
import { RecurringTemplateEditor } from "../../new/page";

export default function EditRecurringTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.recurringTransactions.manage);
  const [template, setTemplate] = useState<RecurringTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTemplate(null); setError("");
    if (!organizationId || !id || !canManage) return;
    let cancelled = false;
    setLoading(true);
    getRecurringTemplate(id).then((result) => {
      if (!cancelled) setTemplate(result);
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load recurring template.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canManage, id, organizationId]);

  if (template) return <RecurringTemplateEditor initialTemplate={template} />;
  return <LedgerPage><LedgerPageBody>
    {!organizationId ? <LedgerAlert tone="info">Select an organization to edit this template.</LedgerAlert> : null}
    {organizationId && !canManage ? <LedgerAlert tone="warning">Recurring transaction manage permission is required.</LedgerAlert> : null}
    {loading ? <LedgerLoadingState title="Loading recurring template editor" /> : null}
    {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
  </LedgerPageBody></LedgerPage>;
}
