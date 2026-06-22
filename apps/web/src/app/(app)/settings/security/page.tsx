"use client";

import Link from "next/link";
import { AlertTriangle, KeyRound, LockKeyhole, UsersRound } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSection,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";

const missingCapabilities = [
  { label: "Active session list", details: "Per-session activity tracking has not been implemented yet." },
  { label: "Session revoke / logout all devices", details: "Session/device revocation requires a persisted session backend model." },
  { label: "MFA", details: "Multi-factor authentication controls are planned after security review and backend support." },
  { label: "SSO", details: "Single-sign-on integration is planned after a dedicated backend implementation." },
  { label: "API tokens", details: "API-token management is not yet implemented in this frontend milestone." },
  {
    label: "Logged-in password change",
    details: "Password updates for signed-in users require a dedicated account password endpoint first.",
  },
  { label: "Email verification", details: "Email verification for account recovery and identity confirmation is not enabled." },
  {
    label: "Configurable security notifications",
    details: "Security notification preferences are not yet available in this implementation scope.",
  },
];

export default function SecuritySettingsPage() {
  const { activeMembership, user, loading } = usePermissions();

  const identityName = user?.name || user?.email || "Current account";
  const identityEmail = user?.email || "email not available";
  const organizationName = activeMembership?.organization?.name || "Current organization";
  const roleName = activeMembership?.role?.name || "Role pending";

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Security settings"
        description="Read-only security overview of the controls and visibility that exist today."
      />

      {loading ? <StatusMessage type="loading">Loading account identity.</StatusMessage> : null}

      <LedgerSection
        title="Security overview"
        description="These capabilities are currently available through existing LedgerByte routes."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-950">Sign-in</h3>
            <p className="mt-1 text-sm text-emerald-900">JWT bearer authentication is enabled.</p>
          </article>
          <article className="rounded-md border border-sky-200 bg-sky-50 p-4">
            <h3 className="text-sm font-semibold text-sky-950">Password reset</h3>
            <p className="mt-1 text-sm text-sky-900">
              Password reset is available through the existing reset flow using your registered email.
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Team access</h3>
            <p className="mt-1 text-sm text-slate-700">
              Team and role controls are managed from Team members and Roles settings.
            </p>
          </article>
          <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Audit visibility</h3>
            <p className="mt-1 text-sm text-slate-700">Security-relevant events are visible in audit logs.</p>
          </article>
          <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Organization posture</h3>
            <p className="mt-1 text-sm text-slate-700">Organization profile and setup controls live in setup routes.</p>
          </article>
        </div>
      </LedgerSection>

      <LedgerPageBody className="grid gap-4 lg:grid-cols-2">
        <LedgerSection
          title="Account identity"
          description="Authenticated identity data from the current session."
          action={
            <LedgerStatusBadge tone="success">
              {loading ? "Loading" : "Session available"}
            </LedgerStatusBadge>
          }
        >
          {loading && !user ? <StatusMessage type="loading">Loading account identity.</StatusMessage> : null}
          {user ? (
            <LedgerMetadataRow
              items={[
                { label: "Signed in as", value: identityName },
                { label: "Email", value: identityEmail },
                { label: "Organization", value: organizationName },
                { label: "Active role", value: roleName },
              ]}
            />
          ) : (
            <StatusMessage type="info">Sign in and an active organization are required to view account identity details.</StatusMessage>
          )}
        </LedgerSection>

        <LedgerSection
          title="Password and sign-in guidance"
          description="Current guidance for account-safe authentication actions."
        >
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 text-sky-700" />
              <span>Use the existing reset flow for recovery. Change from memory only is not currently implemented.</span>
            </li>
            <li className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-amber-700" />
              <span>Signed-in password change controls are intentionally omitted until backend support exists.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-700" />
              <span>No active fake security controls are presented in this read-only route.</span>
            </li>
          </ul>
        </LedgerSection>
      </LedgerPageBody>

      <LedgerSection title="Security route shortcuts" description="Open existing settings pages that already support these controls.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Team settings", href: "/settings/team" },
            { label: "Roles and permissions", href: "/settings/roles" },
            { label: "Audit log shortcut", href: "/settings/audit-logs" },
            { label: "Guided setup", href: "/setup" },
            { label: "Organization setup", href: "/organization/setup" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="ledger-focus rounded-md border border-line bg-panel p-4 text-sm font-semibold text-ink shadow-panel hover:border-palm/50">
              {item.label}
            </Link>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection
        title="Not available yet"
        description="Planned controls below remain disabled until explicit backend and policy support is added."
      >
        <ul className="space-y-2 text-sm text-slate-700">
          {missingCapabilities.map((capability) => (
            <li key={capability.label} className="flex items-start gap-2">
              <UsersRound className="mt-0.5 h-4 w-4 text-slate-500" />
              <span>
                <strong>{capability.label}</strong> — Not available yet. {capability.details}
              </span>
            </li>
          ))}
        </ul>
      </LedgerSection>
    </LedgerPage>
  );
}
