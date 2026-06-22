"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import { buildReportQuery, monthStartDateInput, todayDateInput } from "@/lib/reports";
import type { VatReturnReport } from "@/lib/types";

export default function TaxPage() {
  const organizationId = useActiveOrganizationId();
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [report, setReport] = useState<VatReturnReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadReport(from, to);
  }, [organizationId]);

  async function loadReport(nextFrom: string, nextTo: string) {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      setReport(await apiRequest<VatReturnReport>(`/reports/vat-return${buildReportQuery({ from: nextFrom, to: nextTo })}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tax summary.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReport(from, to);
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Reports / Tax"
        title="Tax"
        description="Operational VAT summary for accountant review. This controlled-beta workspace does not submit returns and is not an official VAT filing workflow."
        actions={<LedgerButton href="/reports/vat-summary">VAT Summary</LedgerButton>}
      />

      <LedgerPageBody>
        <form onSubmit={onSubmit}>
          <LedgerPanel>
          <LedgerFilterBar>
            <LedgerFieldLabel>
              <LedgerFieldText>From</LedgerFieldText>
              <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>To</LedgerFieldText>
              <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerButton type="submit" disabled={loading || !organizationId} variant="primary">
              {loading ? "Calculating..." : "Run tax summary"}
            </LedgerButton>
          </LedgerFilterBar>
          <p className="mt-3 text-xs leading-5 text-steel">Uses existing operational VAT Summary and draft VAT Return report logic from posted LedgerByte records.</p>
          </LedgerPanel>
        </form>

        <div className="space-y-3">
          {!organizationId ? <StatusMessage type="info">Log in and select an organization to load tax calculations.</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">Loading tax calculations...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        </div>

        {report ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TaxMetric label="Sales tax collected" value={report.outputVat} />
              <TaxMetric label="Purchase tax paid" value={report.inputVat} />
              <TaxMetric
                label={Number.parseFloat(report.netVatRefundable) > 0 ? "Net refundable" : "Net payable"}
                value={Number.parseFloat(report.netVatRefundable) > 0 ? report.netVatRefundable : report.netVatPayable}
              />
            </div>
            <LedgerAlert tone="warning">
              Draft VAT view only. Review with an accountant before any filing decision; LedgerByte does not perform tax authority submission here.
            </LedgerAlert>
            <LedgerPanel>
              <h2 className="text-base font-semibold text-ink">Drill-down</h2>
              <LedgerActionBar className="mt-3">
                <LedgerButton href={`/reports/vat-summary${buildReportQuery({ from, to })}`}>Operational VAT Summary</LedgerButton>
                <LedgerButton href={`/reports/vat-return${buildReportQuery({ from, to })}`}>VAT Return</LedgerButton>
                <LedgerButton href="/tax-rates">Tax rates</LedgerButton>
              </LedgerActionBar>
            </LedgerPanel>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TaxMetric({ label, value }: { label: string; value: string }) {
  return (
    <LedgerStatCard label={label} value={<LedgerMoney>{formatMoneyAmount(value)}</LedgerMoney>} />
  );
}
