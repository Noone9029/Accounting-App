"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionMatrix } from "@/components/permissions/permission-matrix";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export default function RolesSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.roles.manage);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([PERMISSIONS.reports.view]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    setLoading(true);
    setError("");
    apiRequest<Role[]>("/roles")
      .then(setRoles)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load roles."))
      .finally(() => setLoading(false));
  }, [organizationId]);

  function togglePermission(permission: Permission) {
    setPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]));
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const role = await apiRequest<Role>("/roles", { method: "POST", body: { name, permissions } });
      router.push(`/settings/roles/${role.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-steel">Review system roles and create custom permission sets.</p>
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage roles.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading roles...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Link key={role.id} href={`/settings/roles/${role.id}`} className="rounded-md border border-slate-200 bg-white p-4 hover:border-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{role.name}</h2>
                <p className="mt-1 text-sm text-steel">{role.permissions.length} permissions</p>
              </div>
              {role.isSystem ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">System</span> : null}
            </div>
            <p className="mt-3 text-xs text-slate-500">{role.memberCount} members assigned</p>
          </Link>
        ))}
      </section>

      {canManage ? (
        <form onSubmit={createRole} className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Create Custom Role</h2>
            <p className="mt-1 text-sm text-steel">Custom roles can be edited or deleted when no active members are assigned.</p>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-ink">Role name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2"
              placeholder="Reports reviewer"
            />
          </label>
          <PermissionMatrix selected={permissions} onToggle={togglePermission} />
          <button
            type="submit"
            disabled={saving || permissions.length === 0}
            className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create role
          </button>
        </form>
      ) : (
        <StatusMessage type="info">Your role can view permission matrices but cannot create or edit roles.</StatusMessage>
      )}
    </div>
  );
}

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "error" | "info" | "loading" }>) {
  const classes = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    loading: "border-slate-200 bg-white text-steel",
  };

  return <div className={`rounded-md border px-4 py-3 text-sm ${classes[type]}`}>{children}</div>;
}
