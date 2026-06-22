"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, Clock3 } from "lucide-react";
import { LedgerPanel, LedgerStatusBadge, buttonClassName } from "@/components/ui/ledger-system";
import { getAppRouteByKey } from "@/lib/app-routes";
import {
  loadTypedOnboardingState,
  recomputeTypedOnboardingChecklist,
  updateTypedOnboardingProfile,
  type TypedOnboardingApiChecklist,
  type TypedOnboardingApiChecklistItem,
  type TypedOnboardingApiChecklistItemStatus,
} from "@/lib/onboarding-api";
import { getSetupRoute } from "@/lib/setup-onboarding-routes";
import {
  getDefaultTypedOnboardingSelectorValue,
  getTypedOnboardingSelectorOptions,
  getTypedOnboardingSelectorPreview,
  resolveTypedOnboardingSelectorValue,
  type TypedOnboardingSelectorSummary,
} from "@/lib/typed-onboarding-selector";
import { getTypedOnboardingGuidance, type TypedOnboardingGuidance } from "@/lib/typed-onboarding-guidance";
import {
  isTypedOnboardingTemplateItemActionable,
  type TypedOnboardingArchetype,
  type TypedOnboardingCapabilityStatus,
  type TypedOnboardingChecklistTemplateItem,
} from "@/lib/typed-onboarding";

type TypedOnboardingPreviewItem = TypedOnboardingChecklistTemplateItem & {
  persistedStatus?: TypedOnboardingApiChecklistItemStatus;
  persistedStatusLabel?: string;
  blockedReason?: string | null;
};

type TypedOnboardingPreviewStatusTone = "info" | "success" | "loading" | "error";

export function TypedOnboardingChecklistPreview() {
  const [selectedKey, setSelectedKey] = useState(getDefaultTypedOnboardingSelectorValue);
  const [apiChecklist, setApiChecklist] = useState<TypedOnboardingApiChecklist | null>(null);
  const [loadingSavedState, setLoadingSavedState] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Saved setup profile will load from LedgerByte API when available.");
  const [statusTone, setStatusTone] = useState<TypedOnboardingPreviewStatusTone>("info");
  const preview = useMemo(() => buildPreview(selectedKey, apiChecklist), [selectedKey, apiChecklist]);
  const counts = preview.summary;
  const controlsDisabled = loadingSavedState || savingSelection;

  useEffect(() => {
    let cancelled = false;
    setLoadingSavedState(true);
    setStatusTone("loading");

    loadTypedOnboardingState()
      .then((state) => {
        if (cancelled) {
          return;
        }
        const nextKey = resolveTypedOnboardingSelectorValue(state.profile?.selectedArchetypeKey);
        setSelectedKey(nextKey);
        setApiChecklist(state.checklist);
        setStatusMessage(
          state.profile
            ? "Saved setup profile loaded from LedgerByte API."
            : "No saved setup profile found; showing local preview until one is saved through the API.",
        );
        setStatusTone(state.profile ? "success" : "info");
      })
      .catch(() => {
        if (!cancelled) {
          setStatusMessage("Setup profile API is unavailable; showing local preview only.");
          setStatusTone("error");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSavedState(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function selectArchetype(value: string): Promise<void> {
    const nextKey = resolveTypedOnboardingSelectorValue(value);
    if (nextKey === selectedKey || controlsDisabled) {
      return;
    }

    setSavingSelection(true);
    setStatusMessage("Saving setup profile through LedgerByte API...");
    setStatusTone("loading");
    try {
      const updatedProfile = await updateTypedOnboardingProfile(nextKey);
      const recomputedChecklist = await recomputeTypedOnboardingChecklist();
      setSelectedKey(resolveTypedOnboardingSelectorValue(updatedProfile?.selectedArchetypeKey ?? nextKey));
      setApiChecklist(recomputedChecklist ?? null);
      setStatusMessage("Saved setup profile updated through LedgerByte API.");
      setStatusTone("success");
    } catch {
      setStatusMessage("Setup profile could not be saved. Local preview state was left unchanged.");
      setStatusTone("error");
    } finally {
      setSavingSelection(false);
    }
  }

  return (
    <LedgerPanel>
      <section data-testid="typed-onboarding-preview">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Setup profile previews</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
              Preview archetype-aware setup checklist templates. Profile selection is saved through LedgerByte API when
              available; planned or blocked capabilities stay non-actionable.
            </p>
            <p
              role={statusTone === "error" ? "alert" : "status"}
              aria-live={statusTone === "error" ? "assertive" : "polite"}
              className={`mt-1 rounded-md border px-2 py-1 text-xs leading-5 ${statusMessageClassName(statusTone)}`}
            >
              {loadingSavedState ? "Loading saved setup profile... " : null}
              {savingSelection ? "Saving selection... " : null}
              {statusMessage}
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
                disabled={!selectable || controlsDisabled}
                onClick={() => {
                  void selectArchetype(option.key);
                }}
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
    </LedgerPanel>
  );
}

function statusMessageClassName(tone: TypedOnboardingPreviewStatusTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "loading":
      return "border-blue-100 bg-blue-50 text-blue-800";
    case "error":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "info":
      return "border-slate-100 bg-slate-50 text-steel";
  }
}

function SelectedArchetypePreview({
  archetype,
  previewItems,
}: Readonly<{
  archetype: TypedOnboardingArchetype;
  previewItems: TypedOnboardingPreviewItem[];
}>) {
  const guidance = getTypedOnboardingGuidance(archetype.key);

  return (
    <div data-testid={`typed-onboarding-profile-${archetype.key}`} className="mt-4">
      <div className="rounded-md border border-slate-100 bg-mist px-3 py-3">
        <div className="text-sm font-semibold text-ink">{archetype.title}</div>
        <p className="mt-1 text-sm leading-6 text-steel">{archetype.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {archetype.recommendedFor.map((label) => (
            <LedgerStatusBadge key={label} tone="draft">{label}</LedgerStatusBadge>
          ))}
        </div>
      </div>

      <ArchetypeGuidancePanel guidance={guidance} />

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {previewItems.map((item) => (
          <TemplateItemPreview key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

function ArchetypeGuidancePanel({ guidance }: Readonly<{ guidance: TypedOnboardingGuidance }>) {
  return (
    <div className={`mt-3 rounded-md border px-3 py-3 ${guidancePanelClassName(guidance.tone)}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{guidance.headline}</div>
          <p className="mt-1 text-sm leading-6 text-slate-700">{guidance.summary}</p>
        </div>
        <div className="shrink-0 rounded-md border border-white/70 bg-white/70 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
          {guidanceToneLabel(guidance.tone)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <GuidanceList title="Emphasis" items={guidance.emphasis} />
        <GuidanceList title="Active now" items={guidance.activeNow} />
        <GuidanceList title="Planned or blocked" items={[...guidance.plannedNext, ...guidance.blockedUntilProven]} />
      </div>
    </div>
  );
}

function GuidanceList({ title, items }: Readonly<{ title: string; items: string[] }>) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-600">{title}</div>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TemplateItemPreview({ item }: Readonly<{ item: TypedOnboardingPreviewItem }>) {
  const action = templateItemAction(item);
  return (
    <article data-testid={`typed-onboarding-item-${item.key}`} className="rounded-md border border-line bg-panel px-3 py-3">
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
          {item.persistedStatusLabel ? (
            <div className="mt-2 text-xs font-semibold uppercase text-slate-600">Saved state: {item.persistedStatusLabel}</div>
          ) : null}
          {action ? (
            <Link href={action.href} className={buttonClassName({ variant: "secondary", size: "sm", className: "mt-3" })}>
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

function guidancePanelClassName(tone: TypedOnboardingGuidance["tone"]): string {
  switch (tone) {
    case "active":
      return "border-emerald-100 bg-emerald-50";
    case "planning":
      return "border-amber-100 bg-amber-50";
    case "blocked":
      return "border-red-100 bg-red-50";
  }
}

function guidanceToneLabel(tone: TypedOnboardingGuidance["tone"]): string {
  switch (tone) {
    case "active":
      return "Active guidance";
    case "planning":
      return "Planning guidance";
    case "blocked":
      return "Blocked guidance";
  }
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
    <div className="rounded-md border border-line bg-mist px-2 py-2">
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

function buildPreview(selectedValue: unknown, checklist: TypedOnboardingApiChecklist | null): {
  selectedKey: ReturnType<typeof resolveTypedOnboardingSelectorValue>;
  archetype: TypedOnboardingArchetype;
  options: ReturnType<typeof getTypedOnboardingSelectorOptions>;
  items: TypedOnboardingPreviewItem[];
  summary: TypedOnboardingSelectorSummary;
} {
  const selectedKey = resolveTypedOnboardingSelectorValue(selectedValue);
  const selectorPreview = getTypedOnboardingSelectorPreview(selectedKey);
  const items = applyPersistedChecklist(selectorPreview.items, checklist);
  return {
    selectedKey: selectorPreview.selectedKey,
    archetype: selectorPreview.archetype,
    options: getTypedOnboardingSelectorOptions(),
    items,
    summary: summarizeItems(items),
  };
}

function applyPersistedChecklist(
  templateItems: TypedOnboardingChecklistTemplateItem[],
  checklist: TypedOnboardingApiChecklist | null,
): TypedOnboardingPreviewItem[] {
  const apiItemsByKey = new Map((checklist?.items ?? []).map((item) => [item.itemKey, item]));
  return templateItems.map((item) => {
    const apiItem = apiItemsByKey.get(item.key);
    if (!apiItem) {
      return item;
    }

    return {
      ...item,
      status: statusFromApiItem(apiItem, item.status),
      blockerCode: apiItem.blockedReasonCode ?? item.blockerCode,
      blockedReason: apiItem.blockedReason,
      persistedStatus: apiItem.status,
      persistedStatusLabel: persistedStatusLabel(apiItem.status),
    };
  });
}

function statusFromApiItem(
  item: TypedOnboardingApiChecklistItem,
  fallback: TypedOnboardingCapabilityStatus,
): TypedOnboardingCapabilityStatus {
  if (item.status === "BLOCKED") {
    return "blocked";
  }
  if (item.status === "NOT_STARTED") {
    return fallback;
  }
  return "active";
}

function persistedStatusLabel(status: TypedOnboardingApiChecklistItemStatus): string | undefined {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "SKIPPED":
      return "Skipped";
    case "REOPENED":
      return "Reopened";
    default:
      return undefined;
  }
}

function summarizeItems(items: TypedOnboardingPreviewItem[]): TypedOnboardingSelectorSummary {
  const active = items.filter((item) => item.status === "active").length;
  const planned = items.filter((item) => item.status === "planned").length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const actionable = items.filter(isTypedOnboardingTemplateItemActionable).length;
  return {
    active,
    planned,
    blocked,
    total: items.length,
    actionable,
    nonActionable: items.length - actionable,
  };
}
