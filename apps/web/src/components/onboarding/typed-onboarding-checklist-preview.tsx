"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, Clock3 } from "lucide-react";
import { getAppRouteByKey } from "@/lib/app-routes";
import { getSetupRoute } from "@/lib/setup-onboarding-routes";
import {
  getDefaultTypedOnboardingSelectorValue,
  getTypedOnboardingSelectorPreview,
  resolveTypedOnboardingSelectorValue,
} from "@/lib/typed-onboarding-selector";
import {
  isTypedOnboardingTemplateItemActionable,
  type TypedOnboardingArchetype,
  type TypedOnboardingCapabilityStatus,
  type TypedOnboardingChecklistTemplateItem,
} from "@/lib/typed-onboarding";

export function TypedOnboardingChecklistPreview() {
  const [selectedKey, setSelectedKey] = useState(getDefaultTypedOnboardingSelectorValue);
  const preview = getTypedOnboardingSelectorPreview(selectedKey);
  const counts = preview.summary;

  return (
    <section data-testid="typed-onboarding-preview" className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Setup profile previews</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Preview archetype-aware setup checklist templates. This is read-only guidance; selections are not saved and
            planned or blocked capabilities stay non-actionable.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-steel sm:w-72">
          <StatusCount label="Active" value={counts.active} />
          <StatusCount label="Planned" value={counts.planned} />
          <StatusCount label="Blocked" value={counts.blocked} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Setup profile options">
        {preview.options.map((option) => {
          const selected = option.key === preview.selectedKey;
          const selectable = option.status === "active";
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              disabled={!selectable}
              onClick={() => setSelectedKey(resolveTypedOnboardingSelectorValue(option.key))}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                selected
                  ? "border-palm bg-emerald-50 text-emerald-900"
                  : !selectable
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700 hover:border-palm/50 hover:bg-slate-50"
              }`}
            >
              {option.title}
            </button>
          );
        })}
      </div>

      <SelectedArchetypePreview archetype={preview.archetype} previewItems={preview.items} />
    </section>
  );
}

function SelectedArchetypePreview({
  archetype,
  previewItems,
}: Readonly<{
  archetype: TypedOnboardingArchetype;
  previewItems: TypedOnboardingChecklistTemplateItem[];
}>) {
  return (
    <div data-testid={`typed-onboarding-profile-${archetype.key}`} className="mt-4">
      <div className="rounded-md border border-slate-100 bg-mist px-3 py-3">
        <div className="text-sm font-semibold text-ink">{archetype.title}</div>
        <p className="mt-1 text-sm leading-6 text-steel">{archetype.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {archetype.recommendedFor.map((label) => (
            <span key={label} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-steel">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {previewItems.map((item) => (
          <TemplateItemPreview key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

function TemplateItemPreview({ item }: Readonly<{ item: TypedOnboardingChecklistTemplateItem }>) {
  const action = templateItemAction(item);
  return (
    <article data-testid={`typed-onboarding-item-${item.key}`} className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${statusClassName(item.status)}`}>
          <StatusIcon status={item.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
            <span className={`self-start rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClassName(item.status)}`}>
              {statusLabel(item.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-steel">{item.description}</p>
          <div className="mt-2 text-xs uppercase text-steel">{categoryLabel(item.category)}</div>
          {action ? (
            <Link href={action.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-palm hover:underline">
              Open {item.title}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <div className="mt-3 text-sm font-medium text-slate-600">{nonActionableLabel(item)}</div>
          )}
        </div>
      </div>
    </article>
  );
}

function templateItemAction(item: TypedOnboardingChecklistTemplateItem): { href: string } | null {
  if (!isTypedOnboardingTemplateItemActionable(item)) {
    return null;
  }

  const setupRoute = getSetupRoute(item.routeKey);
  if (setupRoute) {
    return { href: setupRoute.href };
  }

  const appRoute = getAppRouteByKey(item.routeKey);
  return appRoute?.capabilityStatus === "active" ? { href: appRoute.href } : null;
}

function StatusCount({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2">
      <div className="font-mono text-base font-semibold text-ink">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function StatusIcon({ status }: Readonly<{ status: TypedOnboardingCapabilityStatus }>) {
  const className = "h-4 w-4";
  switch (status) {
    case "active":
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case "planned":
      return <Clock3 className={className} aria-hidden="true" />;
    case "blocked":
      return <Ban className={className} aria-hidden="true" />;
  }
}

function statusLabel(status: TypedOnboardingCapabilityStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "planned":
      return "Planned";
    case "blocked":
      return "Blocked";
  }
}

function statusClassName(status: TypedOnboardingCapabilityStatus): string {
  switch (status) {
    case "active":
      return "text-emerald-700";
    case "planned":
      return "text-amber-700";
    case "blocked":
      return "text-red-700";
  }
}

function statusBadgeClassName(status: TypedOnboardingCapabilityStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-800";
    case "planned":
      return "bg-amber-50 text-amber-900";
    case "blocked":
      return "bg-red-50 text-red-800";
  }
}

function categoryLabel(category: TypedOnboardingChecklistTemplateItem["category"]): string {
  return category.replace(/_/g, " ");
}

function nonActionableLabel(item: TypedOnboardingChecklistTemplateItem): string {
  if (item.status === "planned") {
    return "Planned metadata only";
  }
  return item.blockerCode ? `Blocked: ${item.blockerCode}` : "Blocked";
}
