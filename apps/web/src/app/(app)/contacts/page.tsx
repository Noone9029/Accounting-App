"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Contacts</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Start with one customer or supplier. VAT, ID, and address fields can be added now or reviewed later before local customer-invoice ZATCA rehearsal work.
          </p>
        </div>
        <Link href="/setup" className="inline-flex items-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Guided setup
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {canManageContacts ? (
        <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-ink">Add a customer or supplier</h2>
            <p className="text-sm leading-6 text-steel">
              For the first invoice, choose Customer or Both, then add a name. Address and ID fields improve later VAT/ZATCA checks but do not send anything externally.
            </p>
          </div>
          <form onSubmit={createContact} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              key={initialContactType}
              name="type"
              required
              defaultValue={initialContactType}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            >
              {contactTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="email" type="email" placeholder="Email" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="phone" placeholder="Phone" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <div>
              <input name="taxNumber" placeholder="VAT number" inputMode="numeric" pattern="[0-9]{15}" minLength={15} maxLength={15} title="VAT number must be exactly 15 digits." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              <p className="mt-1 text-[11px] text-steel">Exactly 15 digits.</p>
            </div>
            <div>
              <select
                name="identificationType"
                value={createIdentificationType}
                onChange={(event) => setCreateIdentificationType(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
              >
                <option value="">ID Type</option>
                {contactIdentificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-steel">Used for buyer identification when VAT is not available.</p>
            </div>
            <div>
              <input
                name="identificationNumber"
                placeholder="ID number"
                disabled={!createIdentificationOption}
                required={Boolean(createIdentificationOption)}
                inputMode={createIdentificationOption?.inputMode ?? "text"}
                pattern={createIdentificationOption?.pattern}
                maxLength={createIdentificationOption?.maxLength}
                title={createIdentificationOption ? `${createIdentificationOption.label}: ${createIdentificationOption.hint}` : "Choose an ID type first."}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-palm disabled:bg-slate-100"
              />
              <p className="mt-1 text-[11px] text-steel">{createIdentificationOption?.hint ?? "Choose an ID type first."}</p>
            </div>
            <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-steel md:col-span-4">Address and ZATCA buyer fields</div>
            <input name="addressLine1" placeholder="Street name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="addressLine2" placeholder="Additional street" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <div>
              <input name="buildingNumber" placeholder="Building number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              <p className="mt-1 text-[11px] text-steel">Usually 4 digits for Saudi national address.</p>
            </div>
            <div>
              <input name="district" placeholder="District" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              <p className="mt-1 text-[11px] text-steel">Required for clean Saudi ZATCA buyer address validation where applicable.</p>
            </div>
            <input name="city" placeholder="City" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="postalCode" placeholder="Postal code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="countryCode" defaultValue="SA" placeholder="Country" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:self-start">
              Add contact
            </button>
          </form>
        </div>
      ) : null}

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load contacts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading contacts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && contacts.length === 0 ? (
          <StatusMessage type="empty">
            {canManageContacts ? (
              <ContactsEmptyState contactType={initialContactType} />
            ) : (
              contactsBlockedMessage(initialContactType)
            )}
          </StatusMessage>
        ) : null}
      </div>

      {contacts.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">VAT number</th>
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
                  <td className="px-4 py-3 text-steel">{formatContactIdentificationType(contact.identificationType)}</td>
                  <td className="px-4 py-3 text-steel">{contact.identificationNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{contact.buildingNumber && contact.district ? `${contact.buildingNumber}, ${contact.district}` : "Incomplete"}</td>
                  <td className="px-4 py-3 text-steel">{contact.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3">
                    <Link href={contactPrimaryHref(contact)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
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

function contactsBlockedMessage(contactType: ContactType): string {
  return contactType === "SUPPLIER"
    ? "No contacts yet. Ask an administrator to add the first supplier before creating bills."
    : "No contacts yet. Ask an administrator to add the first customer before creating invoices.";
}
