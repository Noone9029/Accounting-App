"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { InviteOrganizationMemberResponse, MembershipStatus, OrganizationMember, Role } from "@/lib/types";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerToolbar,
} from "@/components/ui/ledger-system";

export default function TeamSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can, reload } = usePermissions();
  const canManage = can(PERMISSIONS.users.manage);
  const canInvite = can(PERMISSIONS.users.invite);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitePreviewUrl, setInvitePreviewUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const sortedRoles = useMemo(() => [...roles].sort((a, b) => a.name.localeCompare(b.name)), [roles]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    setLoading(true);
    setError("");
    Promise.all([apiRequest<OrganizationMember[]>("/organization-members"), apiRequest<Role[]>("/roles")])
      .then(([memberResult, roleResult]) => {
        setMembers(memberResult);
        setRoles(roleResult);
        setInviteRoleId((current) => current || roleResult.find((role) => role.name === "Viewer")?.id || roleResult[0]?.id || "");
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load team settings."))
      .finally(() => setLoading(false));
  }, [organizationId]);

  async function refresh() {
    const [memberResult, roleResult] = await Promise.all([apiRequest<OrganizationMember[]>("/organization-members"), apiRequest<Role[]>("/roles")]);
    setMembers(memberResult);
    setRoles(roleResult);
    reload();
  }

  async function updateRole(member: OrganizationMember, roleId: string) {
    setSavingId(member.id);
    setError("");
    setMessage("");
    try {
      await apiRequest<OrganizationMember>(`/organization-members/${member.id}/role`, { method: "PATCH", body: { roleId } });
      await refresh();
      setMessage("Member role updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update member role.");
    } finally {
      setSavingId("");
    }
  }

  async function updateStatus(member: OrganizationMember, status: MembershipStatus) {
    setSavingId(member.id);
    setError("");
    setMessage("");
    try {
      await apiRequest<OrganizationMember>(`/organization-members/${member.id}/status`, { method: "PATCH", body: { status } });
      await refresh();
      setMessage(status === "ACTIVE" ? "Member reactivated." : "Member suspended.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update member status.");
    } finally {
      setSavingId("");
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId("invite");
    setError("");
    setMessage("");
    setInvitePreviewUrl("");
    try {
      const result = await apiRequest<InviteOrganizationMemberResponse>("/organization-members/invite", {
        method: "POST",
        body: { email: inviteEmail, name: inviteName || undefined, roleId: inviteRoleId },
      });
      setInviteEmail("");
      setInviteName("");
      setInvitePreviewUrl(result.invitePreviewUrl ?? "");
      await refresh();
      setMessage(result.message);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to send mock invite.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Team members"
        description="Manage organization member roles, mock invites, and account status for controlled beta access."
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage team members.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading team members...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

      <StatusMessage type="info">Real email delivery is not configured yet. Invites are written to the mock email outbox.</StatusMessage>
      <BetaAccessGuidance />
      {invitePreviewUrl ? (
        <StatusMessage type="info">
          Mock invite preview link:{" "}
          <a href={invitePreviewUrl} className="font-medium text-palm">
            {invitePreviewUrl}
          </a>
        </StatusMessage>
      ) : null}

      <LedgerPageBody>
        {canInvite ? (
          <form onSubmit={inviteMember}>
            <LedgerToolbar
              title="Invite tester"
              description="Invites are recorded in the mock email outbox until real delivery is explicitly configured."
              actions={
                <LedgerButton type="submit" disabled={savingId === "invite" || !inviteRoleId} variant="primary">
                  Send mock invite
                </LedgerButton>
              }
            >
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_240px]">
                <LedgerFieldLabel>
                  <LedgerFieldText>Email</LedgerFieldText>
                  <LedgerInput
                    required
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="new-user@example.com"
                  />
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Name</LedgerFieldText>
                  <LedgerInput value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Optional" />
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Role</LedgerFieldText>
                  <LedgerSelect required value={inviteRoleId} onChange={(event) => setInviteRoleId(event.target.value)}>
                    {sortedRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
              </div>
            </LedgerToolbar>
          </form>
        ) : null}

        <LedgerPanel className="p-0">
          <div aria-label="Team members table" className="overflow-x-auto">
            <LedgerDataTable minWidth="1040px" className="border-0 shadow-none">
              <thead className="border-b border-line bg-mist text-xs font-semibold uppercase text-steel">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-ink">{member.user.name}</td>
                    <td className="px-4 py-3 text-steel">{member.user.email}</td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <LedgerSelect value={member.roleId} disabled={savingId === member.id} onChange={(event) => void updateRole(member, event.target.value)}>
                          {sortedRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </LedgerSelect>
                      ) : (
                        <span className="text-ink">{member.role.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <LedgerStatusBadge tone={statusTone(member.status)}>{member.status}</LedgerStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-steel">{formatDate(member.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="flex flex-col items-end gap-2">
                          <LedgerButton
                            type="button"
                            size="sm"
                            disabled={savingId === member.id}
                            onClick={() => void updateStatus(member, member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                          >
                            {member.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                          </LedgerButton>
                          <LedgerFieldHelp>
                            {member.status === "ACTIVE" ? "Suspend after the beta session to revoke access." : "Reactivate only for another scheduled beta session."}
                          </LedgerFieldHelp>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </div>
          {!loading && members.length === 0 ? <LedgerEmptyState title="No members found" description="Invite a tester after selecting a role and beta workflow." /> : null}
        </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function BetaAccessGuidance() {
  return (
    <LedgerSummaryBand tone="warning">
      <h2 className="font-semibold text-ink">Beta access guidance</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <p>
          Start with 3-5 selected testers in a labeled beta/test organization. Use dummy customers, suppliers, bank files, and documents only.
        </p>
        <p>
          Use Viewer for read-only review. Use Sales, Purchases, Accountant, or a custom role only when the tester must complete that workflow.
        </p>
        <p>
          Keep Owner/Admin access internal. Suspend testers after the session, and use password reset rather than sharing credentials.
        </p>
      </div>
      <p className="mt-3 text-xs leading-5">
        User testing does not enable production ZATCA submission, real customer email sending by default, live bank feeds, or production data use.
      </p>
    </LedgerSummaryBand>
  );
}

function statusTone(status: MembershipStatus): "success" | "info" | "danger" {
  const tones: Record<MembershipStatus, "success" | "info" | "danger"> = {
    ACTIVE: "success",
    INVITED: "info",
    SUSPENDED: "danger",
  };
  return tones[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
