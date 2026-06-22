"use client";

import { usePathname } from "next/navigation";
import { LedgerButton, LedgerErrorState, LedgerLoadingState, LedgerPanel } from "@/components/ui/ledger-system";
import { getRequiredPermissionsForPathname, hasAnyPermission } from "@/lib/permissions";
import { usePermissions } from "./permission-provider";

export function PermissionBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { activeMembership, error, loading, user } = usePermissions();
  const requiredPermissions = getRequiredPermissionsForPathname(pathname);

  if (loading) {
    return <LedgerLoadingState title="Loading access" />;
  }

  if (error) {
    return <AccessDeniedPanel detail={error} />;
  }

  if (!user) {
    return <AccessDeniedPanel detail="Log in before opening this workspace route." actionHref="/login" actionLabel="Log in" />;
  }

  if (requiredPermissions.length > 0 && !hasAnyPermission(activeMembership, ...requiredPermissions)) {
    return <AccessDeniedPanel detail="Your current role does not include the permission required for this page." />;
  }

  return <>{children}</>;
}

function AccessDeniedPanel({
  actionHref = "/dashboard",
  actionLabel = "Back to dashboard",
  detail,
}: Readonly<{ actionHref?: string; actionLabel?: string; detail: string }>) {
  return (
    <LedgerPanel>
      <LedgerErrorState
        title="Access denied"
        description={detail}
        action={<LedgerButton href={actionHref}>{actionLabel}</LedgerButton>}
      />
    </LedgerPanel>
  );
}
