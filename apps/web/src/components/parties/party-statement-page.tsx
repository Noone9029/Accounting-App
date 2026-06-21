"use client";

import { useParams, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { defaultStatementFromDate, defaultStatementToDate, formatLedgerBalance } from "@/lib/ledger-display";
import {
  buildPartyTransactionHref,
  getCustomer,
  getSupplier,
  partyDetailHref,
  partyStatementHref,
  safeReturnToFromSearch,
  type PartyKind,
} from "@/lib/parties";
import { downloadPdf, statementPdfPath, supplierStatementPdfPath } from "@/lib/pdf-download";
import type { CustomerPartyDetail, CustomerStatement, SupplierPartyDetail, SupplierStatement } from "@/lib/types";
import {
  CustomerStatementDocumentGuidance,
  LedgerTable,
  SupplierStatementDocumentGuidance,
} from "@/app/(app)/contacts/[id]/page";

type PartyDetail = CustomerPartyDetail | SupplierPartyDetail;
type PartyStatement = CustomerStatement | SupplierStatement;

export function PartyStatementPage({ kind }: { kind: PartyKind }) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const [detail, setDetail] = useState<PartyDetail | null>(null);
  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [fromDate, setFromDate] = useState(defaultStatementFromDate());
  const [toDate, setToDate] = useState(defaultStatementToDate());
  const [loading, setLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementPdfLoading, setStatementPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [statementError, setStatementError] = useState("");

  const workspaceHref = params.id ? partyDetailHref(kind, params.id) : "";
  const workspaceReturnTo = safeReturnToFromSearch(searchParams.toString());
  const backToWorkspaceHref = workspaceReturnTo || workspaceHref;
  const statementReturnHref = params.id ? partyStatementHref(kind, params.id, backToWorkspaceHref) : "";
  const sharedStatementHref = params.id
    ? `/contacts/${encodeURIComponent(params.id)}?section=${kind === "customer" ? "statement" : "supplier-statement"}&returnTo=${encodeURIComponent(backToWorkspaceHref)}`
    : "";
  const activityHref =
    params.id && statementReturnHref
      ? buildPartyTransactionHref(
          kind === "customer" ? "/sales/customer-payments" : "/purchases/supplier-payments",
          kind,
          params.id,
          {},
          statementReturnHref,
        )
      : "";
  const agingHref =
    statementReturnHref && kind === "customer"
      ? `/reports/aged-receivables?returnTo=${encodeURIComponent(statementReturnHref)}`
      : statementReturnHref
        ? `/reports/aged-payables?returnTo=${encodeURIComponent(statementReturnHref)}`
        : "";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const load = kind === "customer" ? getCustomer : getSupplier;
    load(params.id)
      .then((result) => {
        if (!cancelled) {
          setDetail(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : `Unable to load ${kind} statement workspace.`);
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
  }, [kind, organizationId, params.id]);

  async function loadStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!params.id) {
      return;
    }

    setStatementError("");
    setStatementLoading(true);

    try {
      const query = new URLSearchParams();
      if (fromDate) {
        query.set("from", fromDate);
      }
      if (toDate) {
        query.set("to", toDate);
      }

      const path = kind === "customer" ? `/contacts/${params.id}/statement?${query.toString()}` : `/contacts/${params.id}/supplier-statement?${query.toString()}`;
      setStatement(await apiRequest<PartyStatement>(path));
    } catch (loadError) {
      setStatementError(loadError instanceof Error ? loadError.message : `Unable to load ${kind} statement.`);
    } finally {
      setStatementLoading(false);
    }
  }

  async function downloadStatementPdf() {
    if (!params.id || !fromDate || !toDate) {
      return;
    }

    setStatementError("");
    setStatementPdfLoading(true);

    try {
      const filenamePrefix = kind === "customer" ? "statement" : "supplier-statement";
      const filenameName = detail?.contact.displayName ?? detail?.contact.name ?? params.id;
      if (kind === "customer") {
        await downloadPdf(statementPdfPath(params.id, fromDate, toDate), `${filenamePrefix}-${filenameName}.pdf`);
      } else {
        await downloadPdf(supplierStatementPdfPath(params.id, fromDate, toDate), `${filenamePrefix}-${filenameName}.pdf`);
      }
    } catch (downloadError) {
      setStatementError(downloadError instanceof Error ? downloadError.message : `Unable to download ${kind} statement PDF.`);
    } finally {
      setStatementPdfLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow={kind === "customer" ? "Receivables" : "Payables"}
        title={kind === "customer" ? "Customer statement activity" : "Supplier statement activity"}
        description={
          <>
            <span className="block">
            {kind === "customer"
              ? "Review posted customer statement rows through the dedicated workspace route while keeping receivables follow-up anchored to the customer workspace."
              : "Review posted supplier statement rows through the dedicated workspace route while keeping payables follow-up anchored to the supplier workspace."}
            </span>
            <span className="mt-1 block text-xs leading-5">
              Controlled beta activity review only. This route does not add official, certified, bank-confirmed, VAT-filing, or ZATCA-compliance claims.
            </span>
          </>
        }
        actions={
          <>
          {backToWorkspaceHref ? (
            <LedgerButton href={backToWorkspaceHref}>
              {kind === "customer" ? "Back to customer workspace" : "Back to supplier workspace"}
            </LedgerButton>
          ) : null}
          {sharedStatementHref ? (
            <LedgerButton href={sharedStatementHref}>
              Open shared contact ledger
            </LedgerButton>
          ) : null}
          </>
        }
      />

      <div className="space-y-3">
        {!organizationId ? (
          <StatusMessage type="info">Log in and select an organization to load this statement workspace.</StatusMessage>
        ) : null}
        {loading ? <StatusMessage type="loading">Loading statement workspace...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {detail ? (
        <LedgerPageBody>
          <StatementRouteContext
            detail={detail}
            kind={kind}
            activityHref={activityHref}
            agingHref={agingHref}
          />

          <LedgerSection title="Statement period" description="Choose the date range for the posted statement rows.">
            <form onSubmit={loadStatement}>
              <LedgerFilterBar>
              <LedgerFieldLabel>
                <LedgerFieldText>From</LedgerFieldText>
                <LedgerInput type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>To</LedgerFieldText>
                <LedgerInput type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerButton type="submit" disabled={statementLoading} variant="primary">
                {statementLoading
                  ? "Loading..."
                  : kind === "customer"
                    ? "Load customer statement"
                    : "Load supplier statement"}
              </LedgerButton>
              <LedgerButton type="button" onClick={() => void downloadStatementPdf()} disabled={!fromDate || !toDate || statementPdfLoading}>
                {statementPdfLoading
                  ? "Preparing..."
                  : kind === "customer"
                    ? "Download customer statement PDF"
                    : "Download supplier statement PDF"}
              </LedgerButton>
              </LedgerFilterBar>
            </form>
            {kind === "customer" ? <CustomerStatementDocumentGuidance /> : <SupplierStatementDocumentGuidance />}
            {statementError ? (
              <div className="mt-3">
                <StatusMessage type="error">{statementError}</StatusMessage>
              </div>
            ) : null}
          </LedgerSection>

          {statement ? (
            <>
              <LedgerPanel>
                <LedgerMetricGrid className="md:grid-cols-4">
                  <LedgerStatCard label="Period from" value={statement.periodFrom ?? "-"} />
                  <LedgerStatCard label="Period to" value={statement.periodTo ?? "-"} />
                  <LedgerStatCard label={kind === "customer" ? "Opening customer balance" : "Opening payable"} value={formatLedgerBalance(statement.openingBalance)} />
                  <LedgerStatCard label={kind === "customer" ? "Closing customer balance" : "Closing payable"} value={formatLedgerBalance(statement.closingBalance)} />
                </LedgerMetricGrid>
              </LedgerPanel>
              <LedgerTable
                rows={statement.rows}
                emptyMessage={kind === "customer" ? "No customer statement activity was found for this period." : "No supplier statement activity was found for this period."}
                ledgerKind={kind}
                contactId={statement.contact.id}
                returnToHref={statementReturnHref}
              />
            </>
          ) : (
            <LedgerSummaryBand tone="info">
              {kind === "customer"
                ? "Choose a period to review posted customer activity, then load or download the statement."
                : "Choose a period to review posted supplier activity, then load or download the statement."}
            </LedgerSummaryBand>
          )}
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
  );
}

function StatementRouteContext({
  detail,
  kind,
  activityHref,
  agingHref,
}: {
  detail: PartyDetail;
  kind: PartyKind;
  activityHref: string;
  agingHref: string;
}) {
  return (
    <LedgerSection
      title={kind === "customer" ? "Customer statement activity" : "Supplier statement activity"}
      description={
        <>
          <span className="block">
            {kind === "customer"
              ? "Use this route for dedicated statement review, then move into AR activity or aging without losing the customer statement return path."
              : "Use this route for dedicated statement review, then move into AP activity or aging without losing the supplier statement return path."}
          </span>
          <span className="mt-2 block text-xs leading-5">{detail.contact.displayName ?? detail.contact.name}</span>
        </>
      }
    >
      <LedgerFilterBar>
        {activityHref ? (
          <LedgerButton href={activityHref} variant="primary">
            {kind === "customer" ? "View AR activity" : "View AP activity"}
          </LedgerButton>
        ) : null}
        {agingHref ? (
          <LedgerButton href={agingHref}>
            {kind === "customer" ? "Aged receivables" : "Aged payables"}
          </LedgerButton>
        ) : null}
      </LedgerFilterBar>
    </LedgerSection>
  );
}
