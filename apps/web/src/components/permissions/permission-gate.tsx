"use client";

import { hasAnyPermission, type Permission } from "@/lib/permissions";
import { usePermissions } from "./permission-provider";

export function PermissionGate({
  any,
  children,
  fallback = null,
}: Readonly<{
  any: readonly Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}>) {
  const { activeMembership } = usePermissions();

  return hasAnyPermission(activeMembership, ...any) ? <>{children}</> : <>{fallback}</>;
}
