"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
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
  const { tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc(kind === "customer" ? "Unable to load customer statement workspace." : "Unable to load supplier statement workspace."));
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
  }, [kind, organizationId, params.id, tc]);

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
      setStatementError(loadError instanceof Error ? loadError.message : tc(kind === "customer" ? "Unable to load customer statement." : "Unable to load supplier statement."));
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
      setStatementError(downloadError instanceof Error ? downloadError.message : tc(kind === "customer" ? "Unable to download customer statement PDF." : "Unable to download supplier statement PDF."));
    } finally {
      setStatementPdfLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc(kind === "customer" ? "Customer statement activity" : "Supplier statement activity")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            {tc(kind === "customer"
              ? "Review posted customer statement rows through the dedicated workspace route while keeping receivables follow-up anchored to the customer workspace."
              : "Review posted supplier statement rows through the dedicated workspace route while keeping payables follow-up anchored to the supplier workspace.")}
          </p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-steel">
            {tc("Controlled beta activity review only. This route does not add official, certified, bank-confirmed, VAT-filing, or ZATCA-compliance claims.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {backToWorkspaceHref ? (
            <Link href={backToWorkspaceHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc(kind === "customer" ? "Back to customer workspace" : "Back to supplier workspace")}
            </Link>
          ) : null}
          {sharedStatementHref ? (
            <Link href={sharedStatementHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Open shared contact ledger")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? (
          <StatusMessage type="info">{tc("Log in and select an organization to load this statement workspace.")}</StatusMessage>
        ) : null}
        {loading ? <StatusMessage type="loading">{tc("Loading statement workspace...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {detail ? (
        <div className="mt-5 space-y-4">
          <StatementRouteContext
            detail={detail}
            kind={kind}
            activityHref={activityHref}
            agingHref={agingHref}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <form onSubmit={loadStatement} className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("From")}</span>
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("To")}</span>
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </label>
              <button type="submit" disabled={statementLoading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {statementLoading
                  ? tc("Loading...")
                  : kind === "customer"
                    ? tc("Load customer statement")
                    : tc("Load supplier statement")}
              </button>
              <button type="button" onClick={() => void downloadStatementPdf()} disabled={!fromDate || !toDate || statementPdfLoading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {statementPdfLoading
                  ? tc("Preparing...")
                  : kind === "customer"
                    ? tc("Download customer statement PDF")
                    : tc("Download supplier statement PDF")}
              </button>
            </form>
            {kind === "customer" ? <CustomerStatementDocumentGuidance /> : <SupplierStatementDocumentGuidance />}
            {statementError ? (
              <div className="mt-3">
                <StatusMessage type="error">{statementError}</StatusMessage>
              </div>
            ) : null}
          </div>

          {statement ? (
            <>
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                  <Summary label={tc("Period from")} value={statement.periodFrom ?? "-"} />
                  <Summary label={tc("Period to")} value={statement.periodTo ?? "-"} />
                  <Summary
                    label={tc(kind === "customer" ? "Opening customer balance" : "Opening payable")}
                    value={formatLedgerBalance(statement.openingBalance)}
                  />
                  <Summary
                    label={tc(kind === "customer" ? "Closing customer balance" : "Closing payable")}
                    value={formatLedgerBalance(statement.closingBalance)}
                  />
                </div>
              </div>
              <LedgerTable
                rows={statement.rows}
                emptyMessage={tc(kind === "customer" ? "No customer statement activity was found for this period." : "No supplier statement activity was found for this period.")}
                ledgerKind={kind}
                contactId={statement.contact.id}
                returnToHref={statementReturnHref}
              />
            </>
          ) : (
            <StatusMessage type="info">
              {tc(kind === "customer"
                ? "Choose a period to review posted customer activity, then load or download the statement."
                : "Choose a period to review posted supplier activity, then load or download the statement.")}
            </StatusMessage>
          )}
        </div>
      ) : null}
    </section>
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
  const { tc } = useAppLocale();

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc(kind === "customer" ? "Customer statement activity" : "Supplier statement activity")}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            {tc(kind === "customer"
              ? "Use this route for dedicated statement review, then move into AR activity or aging without losing the customer statement return path."
              : "Use this route for dedicated statement review, then move into AP activity or aging without losing the supplier statement return path.")}
          </p>
          <p className="mt-2 text-xs leading-5 text-steel">{detail.contact.displayName ?? detail.contact.name}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {activityHref ? (
          <Link href={activityHref} className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
            {tc(kind === "customer" ? "View AR activity" : "View AP activity")}
          </Link>
        ) : null}
        {agingHref ? (
          <Link href={agingHref} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc(kind === "customer" ? "Aged receivables" : "Aged payables")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
