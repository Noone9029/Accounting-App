"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { InviteOrganizationMemberResponse, MembershipStatus, OrganizationMember, Role } from "@/lib/types";
import { usePermissions } from "@/components/permissions/permission-provider";

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
    try {
      const result = await apiRequest<InviteOrganizationMemberResponse>("/organization-members/invite", {
        method: "POST",
        body: { email: inviteEmail, name: inviteName || undefined, roleId: inviteRoleId },
      });
      setInviteEmail("");
      setInviteName("");
      await refresh();
      setMessage(result.message);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to create invite placeholder.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Team Members</h1>
        <p className="mt-1 text-sm text-steel">Manage organization member roles and account status.</p>
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage team members.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading team members...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

      <StatusMessage type="info">Email invitations are not connected yet.</StatusMessage>

      {canInvite ? (
        <form onSubmit={inviteMember} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_240px_auto]">
            <label className="text-sm">
              <span className="font-medium text-ink">Email</span>
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="existing-user@example.com"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-ink">Name note</span>
              <input
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Optional"
              />
            </label>
            <label className="text-sm">
              <span className="font-medium text-ink">Role</span>
              <select
                required
                value={inviteRoleId}
                onChange={(event) => setInviteRoleId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {sortedRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={savingId === "invite" || !inviteRoleId}
              className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add invite
            </button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="grid grid-cols-[1.4fr_1.5fr_220px_130px_140px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Joined</div>
        </div>
        {members.map((member) => (
          <div key={member.id} className="grid grid-cols-[1.4fr_1.5fr_220px_130px_140px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
            <div className="font-medium text-ink">{member.user.name}</div>
            <div className="text-steel">{member.user.email}</div>
            <div>
              {canManage ? (
                <select
                  value={member.roleId}
                  disabled={savingId === member.id}
                  onChange={(event) => void updateRole(member, event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                >
                  {sortedRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-ink">{member.role.name}</span>
              )}
            </div>
            <div>
              <span className={statusClass(member.status)}>{member.status}</span>
            </div>
            <div className="text-xs text-steel">{formatDate(member.createdAt)}</div>
            {canManage ? (
              <div className="col-span-5 mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={savingId === member.id}
                  onClick={() => void updateStatus(member, member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {member.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {!loading && members.length === 0 ? <div className="px-4 py-6 text-sm text-steel">No members found.</div> : null}
      </section>
    </div>
  );
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "error" | "info" | "loading" | "success" }>) {
  const classes = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    loading: "border-slate-200 bg-white text-steel",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return <div className={`rounded-md border px-4 py-3 text-sm ${classes[type]}`}>{children}</div>;
}

function statusClass(status: MembershipStatus): string {
  const classes: Record<MembershipStatus, string> = {
    ACTIVE: "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700",
    INVITED: "rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700",
    SUSPENDED: "rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700",
  };
  return classes[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
