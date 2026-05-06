"use client";

import { useEffect, useState } from "react";
import { getActiveOrganizationId, subscribeToOrganizationChange } from "@/lib/api";

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
