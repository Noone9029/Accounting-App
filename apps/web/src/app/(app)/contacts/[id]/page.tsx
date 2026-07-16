"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { ComplianceNote } from "@/components/documents/document-guidance";
import { CustomerDocumentEmailDelivery } from "@/components/email/customer-document-email-delivery";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerErrorState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  buttonClassName,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { contactIdentificationOptions, formatContactIdentificationType, getContactIdentificationOption } from "@/lib/contact-identification";
import { formatOptionalDate } from "@/lib/invoice-display";
import { defaultStatementFromDate, defaultStatementToDate, formatLedgerBalance } from "@/lib/ledger-display";
import { formatMoneyAmount } from "@/lib/money";
import { buildPartyTransactionHref, partyDetailHref, partyStatementHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadPdf, statementPdfPath, supplierStatementPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { buildContactBuyerAddressReadiness, zatcaReadinessStatusBadgeClass, zatcaReadinessStatusLabel } from "@/lib/zatca";
import type { Contact, CustomerLedger, CustomerLedgerRow, CustomerStatement, SupplierLedger, SupplierLedgerRow, SupplierStatement, ZatcaReadinessSection } from "@/lib/types";

type ActiveSection = "overview" | "ledger" | "statement" | "supplier-ledger" | "supplier-statement";
type LedgerKind = "customer" | "supplier";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
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
  const [initialSectionApplied, setInitialSectionApplied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statementError, setStatementError] = useState("");
  const ledgerAvailable = contact?.type === "CUSTOMER" || contact?.type === "BOTH";
  const supplierLedgerAvailable = contact?.type === "SUPPLIER" || contact?.type === "BOTH";
  const profile = contact ?? ledger?.contact ?? supplierLedger?.contact ?? null;
  const canManageContacts = can(PERMISSIONS.contacts.manage);
  const buyerReadiness = contact && (contact.type === "CUSTOMER" || contact.type === "BOTH") ? buildContactBuyerAddressReadiness(contact) : null;
  const identificationOption = getContactIdentificationOption(identificationTypeDraft);
  const workspaceReturnTo = safeReturnToFromSearch(searchParams.toString());
  const requestedSection = parseActiveSection(searchParams.get("section"));
  const customerWorkspaceHref = profile ? partyDetailHref("customer", profile.id) : "";
  const supplierWorkspaceHref = profile ? partyDetailHref("supplier", profile.id) : "";
  const customerStatementWorkspaceHref = profile ? partyStatementHref("customer", profile.id, customerWorkspaceHref) : "";
  const supplierStatementWorkspaceHref = profile ? partyStatementHref("supplier", profile.id, supplierWorkspaceHref) : "";
  const customerStatementReturnHref = profile ? buildContactSectionHref(profile.id, "statement", workspaceReturnTo) : "";
  const supplierStatementReturnHref = profile ? buildContactSectionHref(profile.id, "supplier-statement", workspaceReturnTo) : "";

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
    setInitialSectionApplied(false);
  }, [params.id, requestedSection]);

  useEffect(() => {
    if (!contact || initialSectionApplied) {
      return;
    }

    if (requestedSection && isActiveSectionAvailable(requestedSection, ledgerAvailable, supplierLedgerAvailable)) {
      setActiveSection(requestedSection);
    } else if (!isActiveSectionAvailable(activeSection, ledgerAvailable, supplierLedgerAvailable)) {
      setActiveSection("overview");
    }

    setInitialSectionApplied(true);
  }, [activeSection, contact, initialSectionApplied, ledgerAvailable, requestedSection, supplierLedgerAvailable]);

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

  async function downloadSupplierStatementPdf() {
    if (!params.id || !fromDate || !toDate) {
      return;
    }

    setStatementError("");
    setStatementPdfLoading(true);

    try {
      await downloadPdf(
        supplierStatementPdfPath(params.id, fromDate, toDate),
        `supplier-statement-${profile?.displayName ?? profile?.name ?? params.id}.pdf`,
      );
    } catch (downloadError) {
      setStatementError(downloadError instanceof Error ? downloadError.message : "Unable to download supplier statement PDF.");
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
          legalName: String(formData.get("legalName") || "") || undefined,
          uaeTrn: String(formData.get("uaeTrn") || "") || undefined,
          uaeTin: String(formData.get("uaeTin") || "") || undefined,
          uaeVatRegistrationStatus: String(formData.get("uaeVatRegistrationStatus") || "") || undefined,
          uaeAddressLine1: String(formData.get("uaeAddressLine1") || "") || undefined,
          uaeAddressLine2: String(formData.get("uaeAddressLine2") || "") || undefined,
          uaeEmirate: String(formData.get("uaeEmirate") || "") || undefined,
          peppolParticipantId: String(formData.get("peppolParticipantId") || "") || undefined,
          peppolEndpointStatus: String(formData.get("peppolEndpointStatus") || "") || undefined,
          preferredEinvoiceDeliveryMethod: String(formData.get("preferredEinvoiceDeliveryMethod") || "") || undefined,
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Contacts / Shared ledger"
        title={profile?.displayName ?? profile?.name ?? "Contact"}
        description={
          <>
            <span className="block">Review the contact profile, ledger trail, statements, and next accounting actions from one place.</span>
            {profile?.type === "BOTH" ? (
              <span className="mt-1 block text-xs leading-5">
                This contact appears in both customer and supplier workspaces. Use the workspace buttons to switch between receivables and payables context.
              </span>
            ) : null}
          </>
        }
        actions={
          <>
          {workspaceReturnTo ? (
            <LedgerButton href={workspaceReturnTo}>
              Back to workspace
            </LedgerButton>
          ) : null}
          {profile
            ? contactWorkspaceActions(profile).map((action) => (
                <LedgerButton key={action.href} href={action.href}>
                  {action.label}
                </LedgerButton>
              ))
            : null}
          <LedgerButton href="/contacts">
            Back to contacts
          </LedgerButton>
          </>
        }
      />

      <div className="space-y-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load contacts.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading contact ledger" /> : null}
        {error ? <LedgerErrorState title="Unable to load contact" description={error} /> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
      </div>

      {profile ? (
        <LedgerPageBody>
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
              <LedgerPanel>
                <h2 className="text-base font-semibold text-ink">Profile</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <Summary label="Name" value={profile.name} />
                  <Summary label="Display name" value={profile.displayName ?? "-"} />
                  <Summary label="Type" value={profile.type} />
                  <Summary label="Email" value={profile.email ?? "-"} />
                  <Summary label="Phone" value={profile.phone ?? "-"} />
                  <Summary label="VAT number" value={profile.taxNumber ?? "-"} />
                  <Summary label="Legal name" value={contact?.legalName ?? "-"} />
                  <Summary label="TRN/TIN" value={[contact?.uaeTrn, contact?.uaeTin].filter(Boolean).join(" / ") || "-"} />
                  <Summary label="Peppol participant ID" value={contact?.peppolParticipantId ?? "-"} />
                  <Summary label="VAT category" value={contact?.uaeVatRegistrationStatus ?? "-"} />
                  <Summary label="Endpoint status" value={contact?.peppolEndpointStatus ?? "-"} />
                  <Summary label="Preferred eInvoice delivery" value={contact?.preferredEinvoiceDeliveryMethod ?? "-"} />
                  <Summary label="UAE address" value={[contact?.uaeAddressLine1, contact?.uaeAddressLine2, contact?.uaeEmirate].filter(Boolean).join(", ") || "-"} />
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
                        ID type and ID number support buyer identification when VAT is not available. UAE fields support Peppol/PINT-AE readiness checks without blocking normal bookkeeping contact updates.
                      </p>
                    </div>
                    <LedgerInput name="legalName" defaultValue={contact.legalName ?? ""} placeholder="Legal name" />
                    <LedgerInput name="uaeTrn" defaultValue={contact.uaeTrn ?? ""} placeholder="TRN" inputMode="numeric" pattern="[0-9]{15}" minLength={15} maxLength={15} />
                    <LedgerInput name="uaeTin" defaultValue={contact.uaeTin ?? ""} placeholder="TIN" inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} />
                    <LedgerInput name="peppolParticipantId" defaultValue={contact.peppolParticipantId ?? ""} placeholder="Peppol participant ID" />
                    <LedgerInput name="uaeVatRegistrationStatus" defaultValue={contact.uaeVatRegistrationStatus ?? ""} placeholder="VAT category/status" />
                    <LedgerInput name="peppolEndpointStatus" defaultValue={contact.peppolEndpointStatus ?? ""} placeholder="Endpoint status" />
                    <LedgerInput name="preferredEinvoiceDeliveryMethod" defaultValue={contact.preferredEinvoiceDeliveryMethod ?? ""} placeholder="Preferred eInvoice delivery" />
                    <LedgerInput name="uaeAddressLine1" defaultValue={contact.uaeAddressLine1 ?? ""} placeholder="UAE address" />
                    <LedgerInput name="uaeAddressLine2" defaultValue={contact.uaeAddressLine2 ?? ""} placeholder="UAE address line 2" />
                    <LedgerInput name="uaeEmirate" defaultValue={contact.uaeEmirate ?? ""} placeholder="Emirate" />
                    <LedgerFieldLabel>
                      <LedgerFieldText>ID Type</LedgerFieldText>
                      <LedgerSelect
                        name="identificationType"
                        value={identificationTypeDraft}
                        onChange={(event) => setIdentificationTypeDraft(event.target.value)}
                      >
                        <option value="">ID Type</option>
                        {contactIdentificationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </LedgerSelect>
                      <LedgerFieldHelp>Choose the contact ID type.</LedgerFieldHelp>
                    </LedgerFieldLabel>
                    <LedgerFieldLabel>
                      <LedgerFieldText>ID number</LedgerFieldText>
                      <LedgerInput
                        name="identificationNumber"
                        defaultValue={contact.identificationNumber ?? ""}
                        placeholder="ID number"
                        disabled={!identificationOption}
                        required={Boolean(identificationOption)}
                        inputMode={identificationOption?.inputMode ?? "text"}
                        pattern={identificationOption?.pattern}
                        maxLength={identificationOption?.maxLength}
                        title={identificationOption ? `${identificationOption.label}: ${identificationOption.hint}` : "Choose an ID type first."}
                        className="uppercase"
                      />
                      <LedgerFieldHelp>{identificationOption?.hint ?? "Choose an ID type first."}</LedgerFieldHelp>
                    </LedgerFieldLabel>
                    <div />
                    <LedgerInput name="addressLine1" defaultValue={contact.addressLine1 ?? ""} placeholder="Street name" />
                    <LedgerInput name="addressLine2" defaultValue={contact.addressLine2 ?? ""} placeholder="Additional street" />
                    <LedgerInput name="buildingNumber" defaultValue={contact.buildingNumber ?? ""} placeholder="Building number" />
                    <LedgerInput name="district" defaultValue={contact.district ?? ""} placeholder="District" />
                    <LedgerInput name="city" defaultValue={contact.city ?? ""} placeholder="City" />
                    <LedgerInput name="postalCode" defaultValue={contact.postalCode ?? ""} placeholder="Postal code" />
                    <LedgerInput name="countryCode" defaultValue={contact.countryCode ?? "SA"} placeholder="Country code" />
                    <LedgerButton type="submit" disabled={addressSaving} variant="primary">
                      {addressSaving ? "Saving..." : "Save address"}
                    </LedgerButton>
                  </form>
                ) : null}
              </LedgerPanel>
              <LedgerPanel>
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
                    <LedgerAlert tone="info">Ledger and statements are available for customer and supplier contacts.</LedgerAlert>
                  </div>
                )}
              </LedgerPanel>
            </div>
          ) : null}

          {activeSection === "ledger" && ledger ? (
            <div className="space-y-4">
              <CustomerLedgerGuidance contactId={ledger.contact.id} closingBalance={ledger.closingBalance} rowCount={ledger.rows.length} />
              <LedgerPanel>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-steel">Opening balance: {formatLedgerBalance(ledger.openingBalance)}</span>
                  <span className="font-semibold text-ink">Closing balance: {formatLedgerBalance(ledger.closingBalance)}</span>
                </div>
              </LedgerPanel>
              <LedgerTable rows={ledger.rows} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId={ledger.contact.id} />
            </div>
          ) : null}

          {activeSection === "statement" && ledger ? (
            <div className="space-y-4">
              <StatementWorkspaceContext
                description="Customer statement activity still runs through this shared contact surface. Use the customer workspace for receivables context and the existing AR screens below for follow-on review."
                workspaceHref={customerWorkspaceHref}
                workspaceLabel="Open customer workspace"
                statementHref={customerStatementWorkspaceHref}
                statementLabel="Customer statement activity"
                activityHref={buildPartyTransactionHref("/sales/customer-payments", "customer", ledger.contact.id, {}, customerStatementWorkspaceHref)}
                activityLabel="View AR activity"
                agingHref={`/reports/aged-receivables?returnTo=${encodeURIComponent(customerStatementWorkspaceHref)}`}
                agingLabel="Aged receivables"
              />
              <LedgerSection title="Statement period" description="Choose the date range for posted customer statement rows.">
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
                    {statementLoading ? "Loading..." : "Load customer statement"}
                  </LedgerButton>
                  <LedgerButton type="button" onClick={() => void downloadStatementPdf()} disabled={!fromDate || !toDate || statementPdfLoading}>
                    {statementPdfLoading ? "Preparing..." : "Download customer statement PDF"}
                  </LedgerButton>
                  </LedgerFilterBar>
                </form>
                <CustomerStatementDocumentGuidance />
                {statementError ? (
                  <div className="mt-3">
                    <LedgerErrorState title="Unable to load customer statement" description={statementError} />
                  </div>
                ) : null}
              </LedgerSection>

              {statement ? (
                <>
                  <LedgerMetricGrid className="md:grid-cols-4">
                    <LedgerStatCard label="Period from" value={statement.periodFrom ?? "-"} />
                    <LedgerStatCard label="Period to" value={statement.periodTo ?? "-"} />
                    <LedgerStatCard label="Opening customer balance" value={formatLedgerBalance(statement.openingBalance)} />
                    <LedgerStatCard label="Closing customer balance" value={formatLedgerBalance(statement.closingBalance)} />
                  </LedgerMetricGrid>
                  <LedgerTable
                    rows={statement.rows}
                    emptyMessage="No customer statement activity was found for this period."
                    ledgerKind="customer"
                    contactId={statement.contact.id}
                    returnToHref={customerStatementReturnHref}
                  />
                </>
              ) : (
                <LedgerSummaryBand tone="info">Choose a period to review posted customer activity, then load or download the statement.</LedgerSummaryBand>
              )}
              <CustomerDocumentEmailDelivery
                sourceId={params.id}
                organizationId={organizationId}
                canSend={can(PERMISSIONS.contacts.sendCustomerStatements)}
                eligible={ledgerAvailable}
                sourceLabel="customer statement"
                documentFilename={`statement-${profile?.displayName ?? profile?.name ?? params.id}-${fromDate || "start"}-to-${toDate || "end"}.pdf`}
                recipientEmail={profile?.email ?? ""}
                defaultSubject={`Customer statement from ${profile?.displayName ?? profile?.name ?? "LedgerByte"}`}
                defaultMessage="Please find the customer statement snapshot attached for review."
                ineligibleMessage="Only customer and BOTH contacts can be queued for customer statement email delivery."
                noPermissionMessage="You do not have permission to send customer statements by email."
                successMessage="Customer statement queued for email delivery."
                emptyHistoryMessage="No customer statement email deliveries queued yet."
                endpoint={`/contacts/${params.id}/email-deliveries`}
              />
            </div>
          ) : null}

          {activeSection === "supplier-ledger" && supplierLedger ? (
            <div className="space-y-4">
              <SupplierLedgerGuidance contactId={supplierLedger.contact.id} closingBalance={supplierLedger.closingBalance} rowCount={supplierLedger.rows.length} />
              <LedgerPanel>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-steel">Opening payable: {formatLedgerBalance(supplierLedger.openingBalance)}</span>
                  <span className="font-semibold text-ink">Closing payable: {formatLedgerBalance(supplierLedger.closingBalance)}</span>
                </div>
              </LedgerPanel>
              <LedgerTable rows={supplierLedger.rows} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId={supplierLedger.contact.id} />
            </div>
          ) : null}

          {activeSection === "supplier-statement" && supplierLedger ? (
            <div className="space-y-4">
              <StatementWorkspaceContext
                description="Supplier statement activity still runs through this shared contact surface. Use the supplier workspace for payables context and the existing AP screens below for follow-on review."
                workspaceHref={supplierWorkspaceHref}
                workspaceLabel="Open supplier workspace"
                statementHref={supplierStatementWorkspaceHref}
                statementLabel="Supplier statement activity"
                activityHref={buildPartyTransactionHref("/purchases/supplier-payments", "supplier", supplierLedger.contact.id, {}, supplierStatementWorkspaceHref)}
                activityLabel="View AP activity"
                agingHref={`/reports/aged-payables?returnTo=${encodeURIComponent(supplierStatementWorkspaceHref)}`}
                agingLabel="Aged payables"
              />
              <LedgerSection title="Statement period" description="Choose the date range for posted supplier statement rows.">
                <form onSubmit={loadSupplierStatement}>
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
                    {statementLoading ? "Loading..." : "Load supplier statement"}
                  </LedgerButton>
                  <LedgerButton type="button" onClick={() => void downloadSupplierStatementPdf()} disabled={!fromDate || !toDate || statementPdfLoading}>
                    {statementPdfLoading ? "Preparing..." : "Download supplier statement PDF"}
                  </LedgerButton>
                  </LedgerFilterBar>
                </form>
                <SupplierStatementDocumentGuidance />
                {statementError ? (
                  <div className="mt-3">
                    <LedgerErrorState title="Unable to load supplier statement" description={statementError} />
                  </div>
                ) : null}
              </LedgerSection>

              {supplierStatement ? (
                <>
                  <LedgerMetricGrid className="md:grid-cols-4">
                    <LedgerStatCard label="Period from" value={supplierStatement.periodFrom ?? "-"} />
                    <LedgerStatCard label="Period to" value={supplierStatement.periodTo ?? "-"} />
                    <LedgerStatCard label="Opening payable" value={formatLedgerBalance(supplierStatement.openingBalance)} />
                    <LedgerStatCard label="Closing payable" value={formatLedgerBalance(supplierStatement.closingBalance)} />
                  </LedgerMetricGrid>
                  <LedgerTable
                    rows={supplierStatement.rows}
                    emptyMessage="No supplier statement activity was found for this period."
                    ledgerKind="supplier"
                    contactId={supplierStatement.contact.id}
                    returnToHref={supplierStatementReturnHref}
                  />
                </>
              ) : (
                <LedgerSummaryBand tone="info">Choose a period to review posted supplier activity, then load or download the statement.</LedgerSummaryBand>
              )}
            </div>
          ) : null}
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
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

function contactWorkspaceActions(contact: Pick<Contact, "id" | "type">): Array<{ href: string; label: string }> {
  const actions: Array<{ href: string; label: string }> = [];
  if (contact.type === "CUSTOMER" || contact.type === "BOTH") {
    actions.push({ href: partyDetailHref("customer", contact.id), label: "Customer workspace" });
  }
  if (contact.type === "SUPPLIER" || contact.type === "BOTH") {
    actions.push({ href: partyDetailHref("supplier", contact.id), label: "Supplier workspace" });
  }
  return actions;
}

export function CustomerLedgerGuidance({ contactId, closingBalance, rowCount }: { contactId: string; closingBalance: string; rowCount: number }) {
  return (
    <LedgerPanel className="grid grid-cols-1 gap-4 border-emerald-200 bg-emerald-50 p-5 lg:grid-cols-[1.25fr_0.75fr]">
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
        <div className="rounded-md bg-panel px-4 py-3 text-sm">
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
    </LedgerPanel>
  );
}

export function SupplierLedgerGuidance({ contactId, closingBalance, rowCount }: { contactId: string; closingBalance: string; rowCount: number }) {
  return (
    <LedgerPanel className="grid grid-cols-1 gap-4 border-emerald-200 bg-emerald-50 p-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div>
        <h2 className="text-base font-semibold text-ink">What changed after supplier payment?</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          The supplier ledger is the running payable trail for this supplier. Finalized purchase bills increase what you owe. Supplier payments, debit notes, refunds, and reversals reduce or adjust the running balance.
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-900">
          Use the row links to jump back to the source bill, payment, or debit note, then use Aged Payables to see open supplier balances across the business.
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-md bg-panel px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-emerald-800">Current supplier payable</div>
          <div className="mt-1 font-mono font-semibold text-ink">{formatLedgerBalance(closingBalance)}</div>
          <div className="mt-1 text-xs text-steel">{rowCount} ledger {rowCount === 1 ? "row" : "rows"} posted for this supplier.</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionLink href={`/purchases/bills/new?supplierId=${contactId}`} tone="primary">
            Create bill
          </ActionLink>
          <ActionLink href={`/purchases/supplier-payments/new?supplierId=${contactId}`}>Record supplier payment</ActionLink>
          <ActionLink href="/reports/aged-payables">AP report</ActionLink>
          <ActionLink href="/dashboard">Dashboard</ActionLink>
        </div>
      </div>
    </LedgerPanel>
  );
}

export function LedgerTable({
  rows,
  emptyMessage,
  ledgerKind = "customer",
  contactId,
  returnToHref,
}: {
  rows: Array<CustomerLedgerRow | SupplierLedgerRow>;
  emptyMessage: string;
  ledgerKind?: LedgerKind;
  contactId?: string;
  returnToHref?: string;
}) {
  if (rows.length === 0) {
    return (
      <LedgerEmptyState
        title={emptyMessage}
        description={
          ledgerKind === "customer"
            ? "Create and finalize an invoice, then record a payment to see invoice, allocation, payment, and balance rows here."
            : "Post a supplier bill or supplier payment to start building the supplier payable trail."
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
              <ActionLink href={contactId ? `/purchases/bills/new?supplierId=${contactId}` : "/purchases/bills/new"} tone="primary">
                Create bill
              </ActionLink>
              <ActionLink href={contactId ? `/purchases/supplier-payments/new?supplierId=${contactId}` : "/purchases/supplier-payments/new"}>
                Record supplier payment
              </ActionLink>
              <ActionLink href="/reports/aged-payables">Open AP report</ActionLink>
            </>
          )}
          <ActionLink href="/dashboard">Dashboard</ActionLink>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <LedgerSummaryBand>
        <span className="font-semibold text-ink">How to read this ledger:</span>{" "}
        {ledgerKind === "customer"
          ? "Debit adds to the customer balance, credit reduces it, and balance is the running amount after that row."
          : "Debit, credit, and balance follow the posted supplier ledger rows exactly. Use debit and credit to see each AP movement, then balance to see the running payable after that row."}
      </LedgerSummaryBand>
      <LedgerDataTable minWidth="1120px">
          <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
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
                  <LedgerStatusBadge tone={ledgerStatusTone(row.status)}>{formatStatusLabel(row.status)}</LedgerStatusBadge>
                </td>
                <td className="px-4 py-3">{renderRowLink(row, returnToHref)}</td>
              </tr>
            ))}
          </tbody>
      </LedgerDataTable>
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

function ledgerStatusTone(status: string): LedgerStatusTone {
  const normalized = status.toUpperCase();
  if (normalized.includes("VOID") || normalized.includes("REVERSE") || normalized.includes("CANCEL")) {
    return "danger";
  }
  if (normalized.includes("DRAFT") || normalized.includes("PENDING") || normalized.includes("PARTIAL")) {
    return "warning";
  }
  if (normalized.includes("POST") || normalized.includes("FINAL") || normalized.includes("PAID") || normalized.includes("APPROVED")) {
    return "success";
  }
  return "neutral";
}

function ActionLink({ href, children, tone = "secondary" }: { href: string; children: ReactNode; tone?: "primary" | "secondary" }) {
  return (
    <LedgerButton href={href} variant={tone === "primary" ? "primary" : "secondary"}>
      {children}
    </LedgerButton>
  );
}

function renderRowLink(row: CustomerLedgerRow | SupplierLedgerRow, returnToHref?: string) {
  if (row.sourceType === "SalesInvoice") {
    return (
      <Link href={appendReturnTo(`/sales/invoices/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View invoice
      </Link>
    );
  }

  if (row.sourceType === "CustomerPayment") {
    return (
      <Link href={appendReturnTo(`/sales/customer-payments/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    );
  }

  if (row.sourceType === "CreditNote") {
    return (
      <Link href={appendReturnTo(`/sales/credit-notes/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View credit note
      </Link>
    );
  }

  if (row.sourceType === "CreditNoteAllocation") {
    const creditNoteId = typeof row.metadata.creditNoteId === "string" ? row.metadata.creditNoteId : "";
    return creditNoteId ? (
      <Link href={appendReturnTo(`/sales/credit-notes/${creditNoteId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View credit note
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "CustomerRefund") {
    return (
      <Link href={appendReturnTo(`/sales/customer-refunds/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View refund
      </Link>
    );
  }

  if (row.sourceType === "CustomerPaymentUnappliedAllocation") {
    const paymentId = typeof row.metadata.paymentId === "string" ? row.metadata.paymentId : "";
    return paymentId ? (
      <Link href={appendReturnTo(`/sales/customer-payments/${paymentId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "PurchaseBill") {
    return (
      <Link href={appendReturnTo(`/purchases/bills/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View bill
      </Link>
    );
  }

  if (row.sourceType === "SupplierPayment") {
    return (
      <Link href={appendReturnTo(`/purchases/supplier-payments/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    );
  }

  if (row.sourceType === "SupplierPaymentUnappliedAllocation") {
    const paymentId = typeof row.metadata.paymentId === "string" ? row.metadata.paymentId : "";
    return paymentId ? (
      <Link href={appendReturnTo(`/purchases/supplier-payments/${paymentId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View payment
      </Link>
    ) : (
      "-"
    );
  }

  if (row.sourceType === "SupplierRefund") {
    return (
      <Link href={appendReturnTo(`/purchases/supplier-refunds/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View refund
      </Link>
    );
  }

  if (row.sourceType === "CashExpense") {
    return (
      <Link href={appendReturnTo(`/purchases/cash-expenses/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View expense
      </Link>
    );
  }

  if (row.sourceType === "PurchaseDebitNote") {
    return (
      <Link href={appendReturnTo(`/purchases/debit-notes/${row.sourceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View debit note
      </Link>
    );
  }

  if (row.sourceType === "PurchaseDebitNoteAllocation") {
    const debitNoteId = typeof row.metadata.debitNoteId === "string" ? row.metadata.debitNoteId : "";
    return debitNoteId ? (
      <Link href={appendReturnTo(`/purchases/debit-notes/${debitNoteId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        View debit note
      </Link>
    ) : (
      "-"
    );
  }

  const invoiceId = typeof row.metadata.invoiceId === "string" ? row.metadata.invoiceId : "";
  return invoiceId ? (
    <Link href={appendReturnTo(`/sales/invoices/${invoiceId}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
      View invoice
    </Link>
  ) : (
    "-"
  );
}

function StatementWorkspaceContext({
  description,
  workspaceHref,
  workspaceLabel,
  statementHref,
  statementLabel,
  activityHref,
  activityLabel,
  agingHref,
  agingLabel,
}: {
  description: string;
  workspaceHref: string;
  workspaceLabel: string;
  statementHref?: string;
  statementLabel?: string;
  activityHref: string;
  activityLabel: string;
  agingHref: string;
  agingLabel: string;
}) {
  return (
    <LedgerSummaryBand>
      <p>{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionLink href={workspaceHref}>{workspaceLabel}</ActionLink>
        {statementHref && statementLabel ? <ActionLink href={statementHref}>{statementLabel}</ActionLink> : null}
        <ActionLink href={activityHref}>{activityLabel}</ActionLink>
        <ActionLink href={agingHref}>{agingLabel}</ActionLink>
      </div>
    </LedgerSummaryBand>
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

function parseActiveSection(section: string | null): ActiveSection | null {
  return section === "ledger" || section === "statement" || section === "supplier-ledger" || section === "supplier-statement" || section === "overview"
    ? section
    : null;
}

function isActiveSectionAvailable(section: ActiveSection, ledgerAvailable: boolean, supplierLedgerAvailable: boolean): boolean {
  return (
    section === "overview" ||
    ((section === "ledger" || section === "statement") && ledgerAvailable) ||
    ((section === "supplier-ledger" || section === "supplier-statement") && supplierLedgerAvailable)
  );
}

function buildContactSectionHref(contactId: string, section: ActiveSection, returnTo?: string): string {
  const params = new URLSearchParams();
  params.set("section", section);
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  return `/contacts/${encodeURIComponent(contactId)}?${params.toString()}`;
}

function appendReturnTo(href: string, returnToHref?: string): string {
  if (!returnToHref) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnToHref)}`;
}

export function CustomerStatementDocumentGuidance() {
  return (
    <div className="mt-3 rounded-md border border-line bg-mist p-3 text-xs leading-5 text-steel">
      <p>
        <span className="font-medium text-ink">Customer statement:</span> Customer statements show invoices that
        increase what customers owe you, plus payments, credit notes, refunds, and reversals that reduce or adjust that
        balance.
      </p>
      <p className="mt-2">
        <span className="font-medium text-ink">Document archive:</span> PDF downloads from source records are archived
        automatically so the same generated output can be reviewed later.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/documents" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Open archive
        </Link>
        <Link href="/settings/documents" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Document settings
        </Link>
        <Link href="/settings/number-sequences" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Number sequences
        </Link>
      </div>
      <ComplianceNote className="mt-3" />
    </div>
  );
}

export function SupplierStatementDocumentGuidance() {
  return (
    <div className="mt-3 rounded-md border border-line bg-mist p-3 text-xs leading-5 text-steel">
      <p>
        <span className="font-medium text-ink">Supplier statement:</span> Supplier statements show purchase bills that
        increase what you owe suppliers, while supplier payments and debit notes reduce or adjust that payable balance.
      </p>
      <p className="mt-2">
        <span className="font-medium text-ink">Document archive:</span> Supplier statement PDF downloads are archived
        automatically from the same AP ledger rows shown on screen, so the generated output can be reviewed later.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/documents" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Open archive
        </Link>
        <Link href="/settings/documents" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Document settings
        </Link>
        <Link href="/settings/number-sequences" className={buttonClassName({ variant: "secondary", size: "sm" })}>
          Number sequences
        </Link>
      </div>
      <ComplianceNote className="mt-3" />
    </div>
  );
}

function ContactZatcaReadinessCard({ section }: { section: ZatcaReadinessSection }) {
  const visibleChecks = section.checks.slice(0, 5);

  return (
    <div className="mt-5 rounded-md border border-line bg-mist p-4">
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
