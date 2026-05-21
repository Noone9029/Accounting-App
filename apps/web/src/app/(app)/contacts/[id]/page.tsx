"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { contactIdentificationOptions, formatContactIdentificationType, getContactIdentificationOption } from "@/lib/contact-identification";
import { formatOptionalDate } from "@/lib/invoice-display";
import { defaultStatementFromDate, defaultStatementToDate, formatLedgerBalance } from "@/lib/ledger-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, statementPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { buildContactBuyerAddressReadiness, zatcaReadinessStatusBadgeClass, zatcaReadinessStatusLabel } from "@/lib/zatca";
import type { Contact, CustomerLedger, CustomerLedgerRow, CustomerStatement, SupplierLedger, SupplierLedgerRow, SupplierStatement, ZatcaReadinessSection } from "@/lib/types";

type ActiveSection = "overview" | "ledger" | "statement" | "supplier-ledger" | "supplier-statement";
type LedgerKind = "customer" | "supplier";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
  const [addressSaving, setAddressSaving] = useState(false);
  const [identificationTypeDraft, setIdentificationTypeDraft] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statementError, setStatementError] = useState("");
  const ledgerAvailable = contact?.type === "CUSTOMER" || contact?.type === "BOTH";
  const supplierLedgerAvailable = contact?.type === "SUPPLIER" || contact?.type === "BOTH";
  const profile = contact ?? ledger?.contact ?? supplierLedger?.contact ?? null;
  const canManageContacts = can(PERMISSIONS.contacts.manage);
  const buyerReadiness = contact && (contact.type === "CUSTOMER" || contact.type === "BOTH") ? buildContactBuyerAddressReadiness(contact) : null;
  const identificationOption = getContactIdentificationOption(identificationTypeDraft);

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

  useEffect(() => {
    setIdentificationTypeDraft(contact?.identificationType ?? "");
  }, [contact?.identificationType]);

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

  async function updateAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contact) {
      return;
    }

    setError("");
    setSuccess("");
    setAddressSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      const identificationType = String(formData.get("identificationType") || "").trim();
      const identificationNumber = String(formData.get("identificationNumber") || "").trim().toUpperCase();
      const updated = await apiRequest<Contact>(`/contacts/${contact.id}`, {
        method: "PATCH",
        body: {
          identificationType: identificationType || undefined,
          identificationNumber: identificationNumber || undefined,
          addressLine1: String(formData.get("addressLine1") || "") || undefined,
          addressLine2: String(formData.get("addressLine2") || "") || undefined,
          buildingNumber: String(formData.get("buildingNumber") || "") || undefined,
          district: String(formData.get("district") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          postalCode: String(formData.get("postalCode") || "") || undefined,
          countryCode: String(formData.get("countryCode") || "SA"),
        },
      });
      setContact(updated);
      setSuccess("Updated contact address fields.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update contact address.");
    } finally {
      setAddressSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{profile?.displayName ?? profile?.name ?? "Contact"}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Review the contact profile, ledger trail, statements, and next accounting actions from one place.
          </p>
        </div>
        <Link href="/contacts" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load contacts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading contact ledger...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
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
                className={`border-b-2 px-3 py-2 text-sm font-medium ${activeSection === section ? "border-palm text-ink" : "border-transparent text-steel hover:text-ink"}`}
              >
                {sectionLabel(section)}
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
                  <Summary label="ID Type" value={formatContactIdentificationType(contact?.identificationType)} />
                  <Summary label="ID Number" value={contact?.identificationNumber ?? "-"} />
                  <Summary label="Street" value={contact?.addressLine1 ?? "-"} />
                  <Summary label="Additional street" value={contact?.addressLine2 ?? "-"} />
                  <Summary label="Building number" value={contact?.buildingNumber ?? "-"} />
                  <Summary label="District" value={contact?.district ?? "-"} />
                  <Summary label="City" value={contact?.city ?? "-"} />
                  <Summary label="Postal code" value={contact?.postalCode ?? "-"} />
                  <Summary label="Country" value={contact?.countryCode ?? "-"} />
                </div>
                {buyerReadiness ? <ContactZatcaReadinessCard section={buyerReadiness} /> : null}
                {canManageContacts && contact ? (
                  <form onSubmit={updateAddress} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
                    <div className="md:col-span-3">
                      <h3 className="text-sm font-semibold text-ink">Edit identification and address fields</h3>
                      <p className="mt-1 text-xs text-steel">
                        ID type and ID number support buyer identification when VAT is not available. Address fields are required for clean Saudi ZATCA buyer address validation where applicable.
                      </p>
                    </div>
                    <div>
                      <select
                        name="identificationType"
                        value={identificationTypeDraft}
                        onChange={(event) => setIdentificationTypeDraft(event.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
                      >
                        <option value="">ID Type</option>
                        {contactIdentificationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-steel">Choose the contact ID type.</p>
                    </div>
                    <div>
                      <input
                        name="identificationNumber"
                        defaultValue={contact.identificationNumber ?? ""}
                        placeholder="ID number"
                        disabled={!identificationOption}
                        required={Boolean(identificationOption)}
                        inputMode={identificationOption?.inputMode ?? "text"}
                        pattern={identificationOption?.pattern}
                        maxLength={identificationOption?.maxLength}
                        title={identificationOption ? `${identificationOption.label}: ${identificationOption.hint}` : "Choose an ID type first."}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-palm disabled:bg-slate-100"
                      />
                      <p className="mt-1 text-[11px] text-steel">{identificationOption?.hint ?? "Choose an ID type first."}</p>
                    </div>
                    <div />
                    <input name="addressLine1" defaultValue={contact.addressLine1 ?? ""} placeholder="Street name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="addressLine2" defaultValue={contact.addressLine2 ?? ""} placeholder="Additional street" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="buildingNumber" defaultValue={contact.buildingNumber ?? ""} placeholder="Building number" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="district" defaultValue={contact.district ?? ""} placeholder="District" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="city" defaultValue={contact.city ?? ""} placeholder="City" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="postalCode" defaultValue={contact.postalCode ?? ""} placeholder="Postal code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <input name="countryCode" defaultValue={contact.countryCode ?? "SA"} placeholder="Country code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                    <button type="submit" disabled={addressSaving} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                      {addressSaving ? "Saving..." : "Save address"}
                    </button>
                  </form>
                ) : null}
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
              <CustomerLedgerGuidance contactId={ledger.contact.id} closingBalance={ledger.closingBalance} rowCount={ledger.rows.length} />
              <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-steel">Opening balance: {formatLedgerBalance(ledger.openingBalance)}</span>
                  <span className="font-semibold text-ink">Closing balance: {formatLedgerBalance(ledger.closingBalance)}</span>
                </div>
              </div>
              <LedgerTable rows={ledger.rows} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId={ledger.contact.id} />
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
                  <LedgerTable rows={statement.rows} emptyMessage="No statement rows found for this period." ledgerKind="customer" contactId={statement.contact.id} />
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
              <LedgerTable rows={supplierLedger.rows} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId={supplierLedger.contact.id} />
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
                  <LedgerTable rows={supplierStatement.rows} emptyMessage="No supplier statement rows found for this period." ledgerKind="supplier" contactId={supplierStatement.contact.id} />
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

function sectionLabel(section: ActiveSection): string {
  switch (section) {
    case "overview":
      return "Overview";
    case "ledger":
      return "Customer ledger";
    case "statement":
      return "Customer statement";
    case "supplier-ledger":
      return "Supplier ledger";
    case "supplier-statement":
      return "Supplier statement";
  }
}

export function CustomerLedgerGuidance({ contactId, closingBalance, rowCount }: { contactId: string; closingBalance: string; rowCount: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-emerald-200 bg-emerald-50 p-5 shadow-panel lg:grid-cols-[1.25fr_0.75fr]">
      <div>
        <h2 className="text-base font-semibold text-ink">What changed after payment?</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          The customer ledger is the customer&apos;s running receivables trail. Finalized invoices increase the amount owed. Posted payments, credit notes, and refunds reduce or reverse it.
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Use the row links to jump back to the source invoice or payment, then use Aged Receivables to see what is still open across customers.
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-emerald-800">Current customer balance</div>
          <div className="mt-1 font-mono font-semibold text-ink">{formatLedgerBalance(closingBalance)}</div>
          <div className="mt-1 text-xs text-steel">{rowCount} ledger {rowCount === 1 ? "row" : "rows"} posted for this customer.</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionLink href={`/sales/invoices/new?customerId=${contactId}`} tone="primary">
            Create invoice
          </ActionLink>
          <ActionLink href={`/sales/customer-payments/new?customerId=${contactId}`}>Record payment</ActionLink>
          <ActionLink href="/reports/aged-receivables">AR report</ActionLink>
          <ActionLink href="/dashboard">Dashboard</ActionLink>
        </div>
      </div>
    </div>
  );
}

export function LedgerTable({
  rows,
  emptyMessage,
  ledgerKind = "customer",
  contactId,
}: {
  rows: Array<CustomerLedgerRow | SupplierLedgerRow>;
  emptyMessage: string;
  ledgerKind?: LedgerKind;
  contactId?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
        <h2 className="font-semibold text-ink">{emptyMessage}</h2>
        <p className="mt-2 max-w-3xl leading-6 text-steel">
          {ledgerKind === "customer"
            ? "Create and finalize an invoice, then record a payment to see invoice, allocation, payment, and balance rows here."
            : "Post a supplier bill or supplier payment to start building the supplier payable trail."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {ledgerKind === "customer" ? (
            <>
              <ActionLink href={contactId ? `/sales/invoices/new?customerId=${contactId}` : "/sales/invoices/new"} tone="primary">
                Create invoice
              </ActionLink>
              <ActionLink href={contactId ? `/sales/customer-payments/new?customerId=${contactId}` : "/sales/customer-payments/new"}>
                Record payment
              </ActionLink>
              <ActionLink href="/reports/aged-receivables">Open AR report</ActionLink>
            </>
          ) : (
            <>
              <ActionLink href="/purchases/bills/new" tone="primary">
                Create bill
              </ActionLink>
              <ActionLink href="/reports/aged-payables">Open AP report</ActionLink>
            </>
          )}
          <ActionLink href="/dashboard">Dashboard</ActionLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
        <span className="font-semibold text-ink">How to read this ledger:</span> Debit adds to the customer balance or supplier payable. Credit reduces it. Balance is the running amount after that row.
      </div>
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
                <td className="px-4 py-3 text-steel">{ledgerRowTypeLabel(row.type)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.number}</td>
                <td className="px-4 py-3 font-medium text-ink">{row.description}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.debit)}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.credit)}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatLedgerBalance(row.balance)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${ledgerStatusBadgeClass(row.status)}`}>
                    {formatStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3">{renderRowLink(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ledgerRowTypeLabel(type: CustomerLedgerRow["type"] | SupplierLedgerRow["type"]): string {
  const labels: Record<string, string> = {
    INVOICE: "Invoice",
    CREDIT_NOTE: "Credit note",
    VOID_CREDIT_NOTE: "Voided credit note",
    CREDIT_NOTE_ALLOCATION: "Credit note allocation",
    CREDIT_NOTE_ALLOCATION_REVERSAL: "Credit note allocation reversal",
    PAYMENT: "Payment",
    PAYMENT_ALLOCATION: "Payment allocation",
    CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION: "Unapplied payment allocation",
    CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL: "Unapplied payment reversal",
    VOID_PAYMENT: "Voided payment",
    CUSTOMER_REFUND: "Customer refund",
    VOID_CUSTOMER_REFUND: "Voided customer refund",
    VOID_INVOICE: "Voided invoice",
    PURCHASE_BILL: "Purchase bill",
    PURCHASE_DEBIT_NOTE: "Purchase debit note",
    VOID_PURCHASE_DEBIT_NOTE: "Voided purchase debit note",
    PURCHASE_DEBIT_NOTE_ALLOCATION: "Debit note allocation",
    PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL: "Debit note allocation reversal",
    SUPPLIER_PAYMENT: "Supplier payment",
    SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION: "Unapplied supplier payment",
    SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL: "Unapplied supplier payment reversal",
    SUPPLIER_REFUND: "Supplier refund",
    VOID_SUPPLIER_REFUND: "Voided supplier refund",
    CASH_EXPENSE: "Cash expense",
    VOID_SUPPLIER_PAYMENT: "Voided supplier payment",
    VOID_PURCHASE_BILL: "Voided purchase bill",
  };
  return labels[type] ?? formatStatusLabel(type);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function ledgerStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized.includes("VOID") || normalized.includes("REVERSE") || normalized.includes("CANCEL")) {
    return "bg-rose-50 text-rosewood";
  }
  if (normalized.includes("DRAFT") || normalized.includes("PENDING") || normalized.includes("PARTIAL")) {
    return "bg-amber-50 text-amber-800";
  }
  if (normalized.includes("POST") || normalized.includes("FINAL") || normalized.includes("PAID") || normalized.includes("APPROVED")) {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-slate-100 text-slate-700";
}

function ActionLink({ href, children, tone = "secondary" }: { href: string; children: ReactNode; tone?: "primary" | "secondary" }) {
  const className =
    tone === "primary"
      ? "rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark"
      : "rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
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

  if (row.sourceType === "CashExpense") {
    return (
      <Link href={`/purchases/cash-expenses/${row.sourceId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View expense
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

function ContactZatcaReadinessCard({ section }: { section: ZatcaReadinessSection }) {
  const visibleChecks = section.checks.slice(0, 5);

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">ZATCA buyer address readiness</h3>
          <p className="mt-1 text-xs text-steel">Saudi standard invoice buyer postal-address checks only. Simplified invoice buyer address rules are invoice-specific.</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${zatcaReadinessStatusBadgeClass(section.status)}`}>
          {zatcaReadinessStatusLabel(section.status)}
        </span>
      </div>
      {visibleChecks.length ? (
        <ul className="mt-3 space-y-2 text-xs text-steel">
          {visibleChecks.map((check) => (
            <li key={`${check.code}-${check.field}`}>
              <span className="font-medium text-ink">{check.field}</span>: {check.message}
              {check.sourceRule ? <span className="ml-1 text-slate-500">({check.sourceRule})</span> : null}
              <div className="mt-1 text-slate-500">{check.fixHint}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-emerald-700">Ready for Saudi standard invoice buyer address generation.</p>
      )}
      <p className="mt-3 text-xs text-amber-700">Local-only readiness. This does not sign, submit, clear, report, or certify the invoice.</p>
    </div>
  );
}
