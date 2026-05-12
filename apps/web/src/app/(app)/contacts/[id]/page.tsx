"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { defaultStatementFromDate, defaultStatementToDate, formatLedgerBalance } from "@/lib/ledger-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, statementPdfPath } from "@/lib/pdf-download";
import type { Contact, CustomerLedger, CustomerLedgerRow, CustomerStatement, SupplierLedger, SupplierLedgerRow, SupplierStatement } from "@/lib/types";

type ActiveSection = "overview" | "ledger" | "statement" | "supplier-ledger" | "supplier-statement";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [contact, setContact] = useState<Contact | null>(null);
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [supplierLedger, setSupplierLedger] = useState<SupplierLedger | null>(null);
  const [supplierStatement, setSupplierStatement] = useState<SupplierStatement | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const [fromDate, setFromDate] = useState(defaultStatementFromDate());
  const [toDate, setToDate] = useState(defaultStatementToDate());
  const [loading, setLoading] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementPdfLoading, setStatementPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [statementError, setStatementError] = useState("");
  const ledgerAvailable = contact?.type === "CUSTOMER" || contact?.type === "BOTH";
  const supplierLedgerAvailable = contact?.type === "SUPPLIER" || contact?.type === "BOTH";
  const profile = contact ?? ledger?.contact ?? supplierLedger?.contact ?? null;

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Contact>(`/contacts/${params.id}`)
      .then(async (contactResult) => {
        if (cancelled) {
          return;
        }

        setContact(contactResult);
        setLedger(null);
        setStatement(null);
        setSupplierLedger(null);
        setSupplierStatement(null);

        if (contactResult.type === "CUSTOMER" || contactResult.type === "BOTH") {
          const ledgerResult = await apiRequest<CustomerLedger>(`/contacts/${params.id}/ledger`);
          if (!cancelled) {
            setLedger(ledgerResult);
          }
        }

        if (contactResult.type === "SUPPLIER" || contactResult.type === "BOTH") {
          const supplierLedgerResult = await apiRequest<SupplierLedger>(`/contacts/${params.id}/supplier-ledger`);
          if (!cancelled) {
            setSupplierLedger(supplierLedgerResult);
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load contact.");
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

  useEffect(() => {
    const valid =
      activeSection === "overview" ||
      ((activeSection === "ledger" || activeSection === "statement") && ledgerAvailable) ||
      ((activeSection === "supplier-ledger" || activeSection === "supplier-statement") && supplierLedgerAvailable);
    if (contact && !valid) {
      setActiveSection("overview");
    }
  }, [activeSection, contact, ledgerAvailable, supplierLedgerAvailable]);

  async function loadStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      const result = await apiRequest<CustomerStatement>(`/contacts/${params.id}/statement?${query.toString()}`);
      setStatement(result);
    } catch (loadError) {
      setStatementError(loadError instanceof Error ? loadError.message : "Unable to load customer statement.");
    } finally {
      setStatementLoading(false);
    }
  }

  async function loadSupplierStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

      const result = await apiRequest<SupplierStatement>(`/contacts/${params.id}/supplier-statement?${query.toString()}`);
      setSupplierStatement(result);
    } catch (loadError) {
      setStatementError(loadError instanceof Error ? loadError.message : "Unable to load supplier statement.");
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
      await downloadPdf(statementPdfPath(params.id, fromDate, toDate), `statement-${profile?.displayName ?? profile?.name ?? params.id}.pdf`);
    } catch (downloadError) {
      setStatementError(downloadError instanceof Error ? downloadError.message : "Unable to download statement PDF.");
    } finally {
      setStatementPdfLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{profile?.displayName ?? profile?.name ?? "Contact"}</h1>
          <p className="mt-1 text-sm text-steel">Contact profile, customer AR ledger, and supplier AP ledger groundwork.</p>
        </div>
        <Link href="/contacts" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load contacts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading contact ledger...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {profile ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {([
              "overview",
              ...(ledgerAvailable ? ["ledger", "statement"] : []),
              ...(supplierLedgerAvailable ? ["supplier-ledger", "supplier-statement"] : []),
            ] as ActiveSection[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${activeSection === section ? "border-palm text-ink" : "border-transparent text-steel hover:text-ink"}`}
              >
                {section.replace("-", " ")}
              </button>
            ))}
          </div>

          {activeSection === "overview" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold text-ink">Profile</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <Summary label="Name" value={profile.name} />
                  <Summary label="Display name" value={profile.displayName ?? "-"} />
                  <Summary label="Type" value={profile.type} />
                  <Summary label="Email" value={profile.email ?? "-"} />
                  <Summary label="Phone" value={profile.phone ?? "-"} />
                  <Summary label="VAT number" value={profile.taxNumber ?? "-"} />
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold text-ink">Balance</h2>
                {ledger || supplierLedger ? (
                  <div className="mt-4 space-y-3 text-sm">
                    {ledger ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <span className="text-steel">Customer AR</span>
                          <span className="font-mono">{formatLedgerBalance(ledger.closingBalance)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-steel">Customer rows</span>
                          <span className="font-mono">{ledger.rows.length}</span>
                        </div>
                      </>
                    ) : null}
                    {supplierLedger ? (
                      <>
                        <div className="flex justify-between gap-3">
                          <span className="text-steel">Supplier AP</span>
                          <span className="font-mono">{formatLedgerBalance(supplierLedger.closingBalance)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-steel">Supplier rows</span>
                          <span className="font-mono">{supplierLedger.rows.length}</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4">
                    <StatusMessage type="info">Ledger and statements are available for customer and supplier contacts.</StatusMessage>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeSection === "ledger" && ledger ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-steel">Opening balance: {formatLedgerBalance(ledger.openingBalance)}</span>
                  <span className="font-semibold text-ink">Closing balance: {formatLedgerBalance(ledger.closingBalance)}</span>
                </div>
              </div>
              <LedgerTable rows={ledger.rows} emptyMessage="No ledger activity found for this customer." />
            </div>
          ) : null}

          {activeSection === "statement" && ledger ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <form onSubmit={loadStatement} className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
                    <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={statementLoading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {statementLoading ? "Loading..." : "Load statement"}
                  </button>
                  <button type="button" onClick={() => void downloadStatementPdf()} disabled={!fromDate || !toDate || statementPdfLoading} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {statementPdfLoading ? "Preparing..." : "Download statement PDF"}
                  </button>
                </form>
                <p className="mt-3 text-xs text-steel">Downloads are archived automatically.</p>
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
                      <Summary label="Period from" value={statement.periodFrom ?? "-"} />
                      <Summary label="Period to" value={statement.periodTo ?? "-"} />
                      <Summary label="Opening balance" value={formatLedgerBalance(statement.openingBalance)} />
                      <Summary label="Closing balance" value={formatLedgerBalance(statement.closingBalance)} />
                    </div>
                  </div>
                  <LedgerTable rows={statement.rows} emptyMessage="No statement rows found for this period." />
                </>
              ) : (
                <StatusMessage type="info">Choose a period and load a statement.</StatusMessage>
              )}
            </div>
          ) : null}

          {activeSection === "supplier-ledger" && supplierLedger ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-steel">Opening payable: {formatLedgerBalance(supplierLedger.openingBalance)}</span>
                  <span className="font-semibold text-ink">Closing payable: {formatLedgerBalance(supplierLedger.closingBalance)}</span>
                </div>
              </div>
              <LedgerTable rows={supplierLedger.rows} emptyMessage="No supplier ledger activity found." />
            </div>
          ) : null}

          {activeSection === "supplier-statement" && supplierLedger ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <form onSubmit={loadSupplierStatement} className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
                    <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={statementLoading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {statementLoading ? "Loading..." : "Load supplier statement"}
                  </button>
                </form>
                {statementError ? (
                  <div className="mt-3">
                    <StatusMessage type="error">{statementError}</StatusMessage>
                  </div>
                ) : null}
              </div>

              {supplierStatement ? (
                <>
                  <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                      <Summary label="Period from" value={supplierStatement.periodFrom ?? "-"} />
                      <Summary label="Period to" value={supplierStatement.periodTo ?? "-"} />
                      <Summary label="Opening payable" value={formatLedgerBalance(supplierStatement.openingBalance)} />
                      <Summary label="Closing payable" value={formatLedgerBalance(supplierStatement.closingBalance)} />
                    </div>
                  </div>
                  <LedgerTable rows={supplierStatement.rows} emptyMessage="No supplier statement rows found for this period." />
                </>
              ) : (
                <StatusMessage type="info">Choose a period and load a supplier statement.</StatusMessage>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function LedgerTable({ rows, emptyMessage }: { rows: Array<CustomerLedgerRow | SupplierLedgerRow>; emptyMessage: string }) {
  if (rows.length === 0) {
    return <StatusMessage type="empty">{emptyMessage}</StatusMessage>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Number</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Debit</th>
            <th className="px-4 py-3">Credit</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(row.date, "-")}</td>
              <td className="px-4 py-3 text-steel">{row.type.replaceAll("_", " ")}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.number}</td>
              <td className="px-4 py-3 font-medium text-ink">{row.description}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.debit)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.credit)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatLedgerBalance(row.balance)}</td>
              <td className="px-4 py-3 text-steel">{row.status}</td>
              <td className="px-4 py-3">{renderRowLink(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderRowLink(row: CustomerLedgerRow | SupplierLedgerRow) {
  if (row.sourceType === "SalesInvoice") {
    return (
      <Link href={`/sales/invoices/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View invoice
      </Link>
    );
  }

  if (row.sourceType === "CustomerPayment") {
    return (
      <Link href={`/sales/customer-payments/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    );
  }

  if (row.sourceType === "CreditNote") {
    return (
      <Link href={`/sales/credit-notes/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View credit note
      </Link>
    );
  }

  if (row.sourceType === "CreditNoteAllocation") {
    const creditNoteId = typeof row.metadata.creditNoteId === "string" ? row.metadata.creditNoteId : "";
    return creditNoteId ? (
      <Link href={`/sales/credit-notes/${creditNoteId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View credit note
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "CustomerRefund") {
    return (
      <Link href={`/sales/customer-refunds/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View refund
      </Link>
    );
  }

  if (row.sourceType === "CustomerPaymentUnappliedAllocation") {
    const paymentId = typeof row.metadata.paymentId === "string" ? row.metadata.paymentId : "";
    return paymentId ? (
      <Link href={`/sales/customer-payments/${paymentId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "PurchaseBill") {
    return (
      <Link href={`/purchases/bills/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View bill
      </Link>
    );
  }

  if (row.sourceType === "SupplierPayment") {
    return (
      <Link href={`/purchases/supplier-payments/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    );
  }

  if (row.sourceType === "SupplierPaymentUnappliedAllocation") {
    const paymentId = typeof row.metadata.paymentId === "string" ? row.metadata.paymentId : "";
    return paymentId ? (
      <Link href={`/purchases/supplier-payments/${paymentId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "SupplierRefund") {
    return (
      <Link href={`/purchases/supplier-refunds/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View refund
      </Link>
    );
  }

  if (row.sourceType === "PurchaseDebitNote") {
    return (
      <Link href={`/purchases/debit-notes/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View debit note
      </Link>
    );
  }

  if (row.sourceType === "PurchaseDebitNoteAllocation") {
    const debitNoteId = typeof row.metadata.debitNoteId === "string" ? row.metadata.debitNoteId : "";
    return debitNoteId ? (
      <Link href={`/purchases/debit-notes/${debitNoteId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View debit note
      </Link>
    ) : (
      "-"
    );
  }

  const invoiceId = typeof row.metadata.invoiceId === "string" ? row.metadata.invoiceId : "";
  return invoiceId ? (
    <Link href={`/sales/invoices/${invoiceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
      View invoice
    </Link>
  ) : (
    "-"
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
