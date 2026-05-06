"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { Contact, ContactType } from "@/lib/types";

const contactTypes: ContactType[] = ["CUSTOMER", "SUPPLIER", "BOTH"];

export default function ContactsPage() {
  const organizationId = useActiveOrganizationId();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const created = await apiRequest<Contact>("/contacts", {
        method: "POST",
        body: {
          type: String(formData.get("type")) as ContactType,
          name: String(formData.get("name")),
          email: String(formData.get("email") || "") || undefined,
          phone: String(formData.get("phone") || "") || undefined,
          taxNumber: String(formData.get("taxNumber") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          countryCode: String(formData.get("countryCode") || "SA"),
        },
      });
      setContacts((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created contact ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create contact.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Contacts</h1>
        <p className="mt-1 text-sm text-steel">Customers, suppliers, and combined contacts from the active organization.</p>
      </div>

      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create contact</h2>
        <form onSubmit={createContact} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select name="type" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {contactTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="email" type="email" placeholder="Email" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="phone" placeholder="Phone" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="taxNumber" placeholder="VAT number" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="city" placeholder="City" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="countryCode" defaultValue="SA" placeholder="Country" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Add contact
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load contacts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading contacts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && contacts.length === 0 ? <StatusMessage type="empty">No contacts found.</StatusMessage> : null}
      </div>

      {contacts.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">VAT number</th>
                <th className="px-4 py-3">Status</th>
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
                  <td className="px-4 py-3 text-steel">{contact.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
