"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getAccessToken, getActiveOrganizationId, setActiveOrganizationId, subscribeToOrganizationChange } from "@/lib/api";
import { hasAllPermissions, hasAnyPermission, hasPermission, type Permission } from "@/lib/permissions";
import type { MeResponse } from "@/lib/types";

interface PermissionContextValue {
  user: MeResponse | null;
  activeMembership: MeResponse["memberships"][number] | null;
  loading: boolean;
  error: string;
  can: (permission: Permission) => boolean;
  canAny: (...permissions: Permission[]) => boolean;
  canAll: (...permissions: Permission[]) => boolean;
  reload: () => void;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    function syncOrganizationId() {
      setActiveOrganizationIdState(getActiveOrganizationId());
    }

    syncOrganizationId();
    return subscribeToOrganizationChange(syncOrganizationId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const me = await apiRequest<MeResponse>("/auth/me", { organizationId: null });
        if (cancelled) {
          return;
        }

        const activeMemberships = me.memberships.filter((membership) => membership.status === "ACTIVE");
        const storedOrganizationId = getActiveOrganizationId();
        const nextOrganizationId =
          activeMemberships.find((membership) => membership.organization.id === storedOrganizationId)?.organization.id ??
          activeMemberships[0]?.organization.id ??
          null;

        setUser({ ...me, memberships: activeMemberships });
        setError("");

        if (nextOrganizationId && nextOrganizationId !== storedOrganizationId) {
          setActiveOrganizationId(nextOrganizationId);
        } else {
          setActiveOrganizationIdState(nextOrganizationId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setUser(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load permissions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [reloadCounter]);

  const activeMembership = useMemo(() => {
    if (!user) {
      return null;
    }

    return (
      user.memberships.find((membership) => membership.organization.id === activeOrganizationId) ??
      user.memberships[0] ??
      null
    );
  }, [activeOrganizationId, user]);

  const value = useMemo<PermissionContextValue>(
    () => ({
      user,
      activeMembership,
      loading,
      error,
      can: (permission) => hasPermission(activeMembership, permission),
      canAny: (...permissions) => hasAnyPermission(activeMembership, ...permissions),
      canAll: (...permissions) => hasAllPermissions(activeMembership, ...permissions),
      reload: () => setReloadCounter((counter) => counter + 1),
    }),
    [activeMembership, error, loading, user],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error("usePermissions must be used inside PermissionProvider.");
  }

  return context;
}
