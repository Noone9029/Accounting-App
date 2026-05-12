"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRequiredPermissionsForPathname, hasAnyPermission } from "@/lib/permissions";
import { usePermissions } from "./permission-provider";

export function PermissionBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { activeMembership, error, loading } = usePermissions();
  const requiredPermissions = getRequiredPermissionsForPathname(pathname);

  if (loading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-steel">
        Loading access...
      </div>
    );
  }

  if (error) {
    return <AccessDeniedPanel detail={error} />;
  }

  if (requiredPermissions.length > 0 && !hasAnyPermission(activeMembership, ...requiredPermissions)) {
    return <AccessDeniedPanel detail="Your current role does not include the permission required for this page." />;
  }

  return <>{children}</>;
}

function AccessDeniedPanel({ detail }: Readonly<{ detail: string }>) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-ink">Access denied</div>
      <p className="mt-2 max-w-2xl text-sm text-steel">{detail}</p>
      <Link href="/dashboard" className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Back to dashboard
      </Link>
    </section>
  );
}
