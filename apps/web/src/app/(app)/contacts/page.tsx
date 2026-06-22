"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useEffect, useState } from "react";
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
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { contactIdentificationOptions, formatContactIdentificationType, getContactIdentificationOption } from "@/lib/contact-identification";
import { PERMISSIONS } from "@/lib/permissions";
import type { Contact, ContactType } from "@/lib/types";

const contactTypes: ContactType[] = ["CUSTOMER", "SUPPLIER", "BOTH"];

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createIdentificationType, setCreateIdentificationType] = useState("");
  const canManageContacts = can(PERMISSIONS.contacts.manage);
  const createIdentificationOption = getContactIdentificationOption(createIdentificationType);
  const initialContactType = contactTypeFromQuery(searchParams.get("type"));

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Contact[]>("/contacts")
      .then((result) => {
        if (!cancelled) {
          setContacts(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load contacts.");
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

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const taxNumber = String(formData.get("taxNumber") || "").trim();
      const identificationType = String(formData.get("identificationType") || "").trim();
      const identificationNumber = String(formData.get("identificationNumber") || "").trim().toUpperCase();
      const created = await apiRequest<Contact>("/contacts", {
        method: "POST",
        body: {
          type: String(formData.get("type")) as ContactType,
          name: String(formData.get("name")),
          email: String(formData.get("email") || "") || undefined,
          phone: String(formData.get("phone") || "") || undefined,
          taxNumber: taxNumber || undefined,
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
      setContacts((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created contact ${created.name}.`);
      form.reset();
      setCreateIdentificationType("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create contact.");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Contacts / Customer and supplier profiles"
        title="Contacts"
        description="Start with one customer or supplier. VAT, ID, and address fields can be added now or reviewed later before local customer-invoice ZATCA rehearsal work."
        actions={
          <LedgerButton href="/setup" icon={ArrowRight}>
          Guided setup
          </LedgerButton>
        }
      />

      <LedgerSummaryBand tone="info">
        Contacts are local customer and supplier profiles. Adding readiness fields does not send eInvoices, validate Peppol endpoints, submit ZATCA data, or contact external providers.
      </LedgerSummaryBand>

      {canManageContacts ? (
        <LedgerPanel>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-ink">Add a customer or supplier</h2>
            <p className="text-sm leading-6 text-steel">
              For the first invoice, choose Customer or Both, then add a name. Address and ID fields improve later VAT/ZATCA checks but do not send anything externally.
            </p>
          </div>
          <form onSubmit={createContact} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <ContactSelect
              label="Type"
              key={initialContactType}
              name="type"
              required
              defaultValue={initialContactType}
            >
              {contactTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </ContactSelect>
            <ContactField label="Name" name="name" required placeholder="Name" />
            <ContactField label="Email" name="email" type="email" placeholder="Email" />
            <ContactField label="Phone" name="phone" placeholder="Phone" />
            <ContactField label="VAT number" name="taxNumber" placeholder="VAT number" inputMode="numeric" pattern="[0-9]{15}" minLength={15} maxLength={15} title="VAT number must be exactly 15 digits." help="Exactly 15 digits." />
            <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-steel md:col-span-4">UAE eInvoicing readiness fields</div>
            <ContactField label="Legal name" name="legalName" placeholder="Legal name" />
            <ContactField label="TRN" name="uaeTrn" placeholder="TRN" inputMode="numeric" pattern="[0-9]{15}" minLength={15} maxLength={15} title="TRN must be exactly 15 digits." />
            <ContactField label="TIN" name="uaeTin" placeholder="TIN" inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} title="TIN must be exactly 10 digits." />
            <ContactField label="Peppol participant ID" name="peppolParticipantId" placeholder="Peppol participant ID" />
            <ContactField label="UAE address" name="uaeAddressLine1" placeholder="UAE address" />
            <ContactField label="UAE address line 2" name="uaeAddressLine2" placeholder="UAE address line 2" />
            <ContactField label="Emirate" name="uaeEmirate" placeholder="Emirate" />
            <ContactField label="VAT category/status" name="uaeVatRegistrationStatus" placeholder="VAT category/status" />
            <ContactField label="Endpoint status" name="peppolEndpointStatus" placeholder="Endpoint status" />
            <ContactField label="Preferred eInvoice delivery" name="preferredEinvoiceDeliveryMethod" placeholder="Preferred eInvoice delivery" />
            <ContactSelect
              label="ID Type"
              name="identificationType"
              value={createIdentificationType}
              onChange={(event) => setCreateIdentificationType(event.target.value)}
              help="Used for buyer identification when VAT is not available."
            >
                <option value="">ID Type</option>
                {contactIdentificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </ContactSelect>
            <ContactField
              label="ID number"
              name="identificationNumber"
              placeholder="ID number"
              disabled={!createIdentificationOption}
              required={Boolean(createIdentificationOption)}
              inputMode={createIdentificationOption?.inputMode ?? "text"}
              pattern={createIdentificationOption?.pattern}
              maxLength={createIdentificationOption?.maxLength}
              title={createIdentificationOption ? `${createIdentificationOption.label}: ${createIdentificationOption.hint}` : "Choose an ID type first."}
              className="uppercase"
              help={createIdentificationOption?.hint ?? "Choose an ID type first."}
            />
            <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-steel md:col-span-4">Address and ZATCA buyer fields</div>
            <ContactField label="Street name" name="addressLine1" placeholder="Street name" />
            <ContactField label="Additional street" name="addressLine2" placeholder="Additional street" />
            <ContactField label="Building number" name="buildingNumber" placeholder="Building number" help="Usually 4 digits for Saudi national address." />
            <ContactField label="District" name="district" placeholder="District" help="Required for clean Saudi ZATCA buyer address validation where applicable." />
            <ContactField label="City" name="city" placeholder="City" />
            <ContactField label="Postal code" name="postalCode" placeholder="Postal code" />
            <ContactField label="Country" name="countryCode" defaultValue="SA" placeholder="Country" />
            <LedgerButton type="submit" variant="primary" disabled={!organizationId} className="md:self-start">
              Add contact
            </LedgerButton>
          </form>
        </LedgerPanel>
      ) : null}

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load contacts.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading contacts" /> : null}
        {error ? <LedgerErrorState title="Unable to load contacts" description={error} /> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && contacts.length === 0 ? (
          <LedgerEmptyState
            title="No contacts yet"
            description={canManageContacts ? <ContactsEmptyState contactType={initialContactType} /> : contactsBlockedMessage(initialContactType)}
          />
        ) : null}

        {contacts.length > 0 ? (
          <LedgerDataTable minWidth="980px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">VAT number</th>
                <th className="px-4 py-3">UAE readiness</th>
                <th className="px-4 py-3">ID Type</th>
                <th className="px-4 py-3">ID Number</th>
                <th className="px-4 py-3">ZATCA address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3 font-medium text-ink">{contact.name}</td>
                  <td className="px-4 py-3 text-steel">{contact.type}</td>
                  <td className="px-4 py-3 text-steel">{contact.email ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{contact.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{contact.taxNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{contact.peppolParticipantId ? `Peppol ${contact.peppolParticipantId}` : uaeContactMissingMessage(contact)}</td>
                  <td className="px-4 py-3 text-steel">{formatContactIdentificationType(contact.identificationType)}</td>
                  <td className="px-4 py-3 text-steel">{contact.identificationNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{contact.buildingNumber && contact.district ? `${contact.buildingNumber}, ${contact.district}` : "Incomplete"}</td>
                  <td className="px-4 py-3">
                    <ContactStatusPill isActive={contact.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={contactPrimaryHref(contact)} size="sm">
                      View
                    </LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function contactTypeFromQuery(value: string | null): ContactType {
  return contactTypes.includes(value as ContactType) ? (value as ContactType) : "CUSTOMER";
}

function contactPrimaryHref(contact: Pick<Contact, "id" | "type">): string {
  if (contact.type === "CUSTOMER") {
    return `/customers/${contact.id}`;
  }
  if (contact.type === "SUPPLIER") {
    return `/suppliers/${contact.id}`;
  }
  return `/contacts/${contact.id}`;
}

function uaeContactMissingMessage(contact: Pick<Contact, "uaeTin" | "uaeTrn" | "uaeAddressLine1" | "uaeEmirate" | "peppolParticipantId">): string {
  const missing = [
    !contact.uaeTin && !contact.uaeTrn ? "TIN/TRN" : null,
    !contact.peppolParticipantId ? "Peppol ID" : null,
    !contact.uaeAddressLine1 || !contact.uaeEmirate ? "UAE address" : null,
  ].filter(Boolean);
  return missing.length ? `Missing ${missing.join(", ")}` : "Ready for review";
}

function ContactsEmptyState({ contactType }: Readonly<{ contactType: ContactType }>) {
  if (contactType === "SUPPLIER") {
    return (
      <>
        No contacts yet. Add a first supplier above, then continue to{" "}
        <Link href="/purchases/bills/new" className="font-semibold text-palm hover:underline">
          create the first bill
        </Link>
        .
      </>
    );
  }

  return (
    <>
      No contacts yet. Add a first customer above, then continue to{" "}
      <Link href="/sales/invoices/new" className="font-semibold text-palm hover:underline">
        create the first invoice
      </Link>
      .
    </>
  );
}

function ContactField({
  label,
  help,
  ...props
}: Readonly<{ label: string; help?: ReactNode } & InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput {...props} />
      {help ? <LedgerFieldHelp>{help}</LedgerFieldHelp> : null}
    </LedgerFieldLabel>
  );
}

function ContactSelect({
  label,
  help,
  children,
  ...props
}: Readonly<{ label: string; help?: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect {...props}>{children}</LedgerSelect>
      {help ? <LedgerFieldHelp>{help}</LedgerFieldHelp> : null}
    </LedgerFieldLabel>
  );
}

function contactsBlockedMessage(contactType: ContactType): string {
  return contactType === "SUPPLIER"
    ? "No contacts yet. Ask an administrator to add the first supplier before creating bills."
    : "No contacts yet. Ask an administrator to add the first customer before creating invoices.";
}

function ContactStatusPill({ isActive }: Readonly<{ isActive: boolean }>) {
  const tone: LedgerStatusTone = isActive ? "success" : "neutral";
  return <LedgerStatusBadge tone={tone}>{isActive ? "Active" : "Inactive"}</LedgerStatusBadge>;
}
