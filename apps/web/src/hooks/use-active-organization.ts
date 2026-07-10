"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { getActiveOrganizationId, subscribeToOrganizationChange } from "@/lib/api";
import type { Organization } from "@/lib/types";

export function useActiveOrganization(): Organization | null {
  const { activeMembership } = usePermissions();

  return activeMembership?.organization ?? null;
}

export function useActiveOrganizationId(): string | null {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    function syncOrganizationId() {
      setOrganizationId(getActiveOrganizationId());
    }

    syncOrganizationId();
    return subscribeToOrganizationChange(syncOrganizationId);
  }, []);

  return organizationId;
}
