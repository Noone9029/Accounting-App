"use client";

import { ChevronDown, X, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  ENABLED_GLOBAL_CREATE_MODULES,
  GLOBAL_CREATE_ACTIONS,
  GLOBAL_CREATE_CATEGORY_ORDER,
  type GlobalCreateAction,
  type GlobalCreateCategory,
} from "@/lib/global-create-actions";
import { hasPermission } from "@/lib/permissions";

interface GlobalCreateMenuProps {
  className?: string;
  placement?: "sidebar" | "topbar";
}

export function GlobalCreateMenu({ className = "", placement = "sidebar" }: GlobalCreateMenuProps) {
  const { activeMembership } = usePermissions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  const groupedActions = useMemo(
    () =>
      GLOBAL_CREATE_CATEGORY_ORDER.map((category) => ({
        category,
        actions: GLOBAL_CREATE_ACTIONS.filter((action) => action.category === category),
      })).filter((group) => group.actions.length > 0),
    [],
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName(placement)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Create</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close create menu"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/20 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="dialog"
            aria-label="Create menu"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-t-md border border-slate-200 bg-white p-4 shadow-2xl lg:absolute lg:bottom-auto lg:left-0 lg:top-full lg:mt-2 lg:max-h-[calc(100vh-8rem)] lg:w-[860px] lg:rounded-md lg:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Create</h2>
                <p className="mt-1 text-xs text-steel">Start common accounting records from one place.</p>
              </div>
              <button
                type="button"
                aria-label="Close create menu"
                onClick={() => setOpen(false)}
                className="ledger-focus rounded-md border border-line p-2 text-slate-500 hover:bg-slate-50 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {groupedActions.map((group) => (
                <CreateMenuGroup
                  key={group.category}
                  category={group.category}
                  actions={group.actions}
                  activeMembership={activeMembership}
                  onSelect={() => setOpen(false)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CreateMenuGroup({
  category,
  actions,
  activeMembership,
  onSelect,
}: {
  category: GlobalCreateCategory;
  actions: readonly GlobalCreateAction[];
  activeMembership: Parameters<typeof hasPermission>[0];
  onSelect: () => void;
}) {
  const headingId = `${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-create-group`;

  return (
    <section role="group" aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-2 text-xs font-semibold uppercase text-steel">
        {category}
      </h3>
      <div className="space-y-1">
        {actions.map((action) => (
          <CreateMenuAction key={action.id} action={action} activeMembership={activeMembership} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function CreateMenuAction({
  action,
  activeMembership,
  onSelect,
}: {
  action: GlobalCreateAction;
  activeMembership: Parameters<typeof hasPermission>[0];
  onSelect: () => void;
}) {
  const Icon = action.icon;
  const moduleEnabled = action.requiredModule ? ENABLED_GLOBAL_CREATE_MODULES[action.requiredModule] : true;
  const allowed = hasPermission(activeMembership, action.requiredPermission);
  const disabledReason = !moduleEnabled
    ? action.disabledReason ?? `${action.label} is not enabled yet.`
    : !allowed
      ? action.permissionDeniedReason ?? `You do not have permission to create ${action.label.toLowerCase()}.`
      : !action.href
        ? action.disabledReason ?? `${action.label} is not available yet.`
        : "";

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{action.label}</span>
    </>
  );

  if (!disabledReason && action.href) {
    return (
      <Link href={action.href} onClick={onSelect} className="ledger-focus flex min-h-9 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-ink">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={disabledReason}
      aria-disabled="true"
      className="flex min-h-9 w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-400"
    >
      {content}
    </button>
  );
}

function buttonClassName(placement: "sidebar" | "topbar"): string {
  const shared =
    "ledger-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors";

  if (placement === "topbar") {
    return `${shared} bg-palm px-3 py-2 text-white hover:bg-palm-dark`;
  }

  return `${shared} w-full bg-palm px-3 py-2.5 text-white shadow-sm hover:bg-palm-dark`;
}
