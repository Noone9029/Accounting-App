"use client";

import { PERMISSION_GROUPS } from "@/lib/permission-matrix";
import type { Permission } from "@/lib/permissions";

interface PermissionMatrixProps {
  selected: readonly string[];
  readOnly?: boolean;
  onToggle?: (permission: Permission) => void;
}

export function PermissionMatrix({ selected, readOnly = false, onToggle }: PermissionMatrixProps) {
  const selectedSet = new Set(selected);

  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <section key={group.id} className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            {group.permissions.map((item) => {
              const checked = selectedSet.has(item.permission);
              return (
                <label key={item.permission} className="flex min-h-20 gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => onToggle?.(item.permission)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.permission}</span>
                    <span className="mt-1 block text-xs leading-5 text-steel">{item.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
