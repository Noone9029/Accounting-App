"use client";

import { ArrowUpRight, BarChart3, FileText, Loader2, Navigation, Search, UserRound, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { formatAppDate } from "@/lib/app-i18n";
import {
  combineGlobalSearchResults,
  getLocalGlobalSearchResults,
  groupGlobalSearchResults,
  searchGlobalRecords,
} from "@/lib/global-search";
import type { GlobalSearchCategory, GlobalSearchResult } from "@/lib/types";

const DEBOUNCE_MS = 300;
const COLLAPSED_RESULT_LIMIT = 8;

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className = "" }: GlobalSearchProps) {
  const router = useRouter();
  const { activeMembership } = usePermissions();
  const { dir, locale, t, tc } = useAppLocale();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listboxId = `${inputId}-results`;

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleMouseDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!debouncedQuery) {
        setRemoteResults([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await searchGlobalRecords(debouncedQuery);
        if (!cancelled) {
          setRemoteResults(response.results);
        }
      } catch (searchError) {
        if (!cancelled) {
          setRemoteResults([]);
          setError(searchError instanceof Error ? searchError.message : t("globalSearch.unavailable"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, t]);

  const localResults = useMemo(() => getLocalGlobalSearchResults(query, activeMembership, locale), [activeMembership, locale, query]);
  const allResults = useMemo(() => combineGlobalSearchResults(remoteResults, localResults), [localResults, remoteResults]);
  const visibleResults = expanded ? allResults : allResults.slice(0, COLLAPSED_RESULT_LIMIT);
  const groupedResults = useMemo(() => groupGlobalSearchResults(visibleResults), [visibleResults]);
  const hasMoreResults = allResults.length > visibleResults.length;

  useEffect(() => {
    setExpanded(false);
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(visibleResults.length - 1, 0)));
  }, [visibleResults.length]);

  function selectResult(result: GlobalSearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" && visibleResults.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % visibleResults.length);
      return;
    }

    if (event.key === "ArrowUp" && visibleResults.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current - 1 + visibleResults.length) % visibleResults.length);
      return;
    }

    if (event.key === "Enter" && visibleResults.length > 0) {
      event.preventDefault();
      const target = visibleResults[activeIndex] ?? visibleResults[0];
      if (target) {
        selectResult(target);
      }
    }
  }

  const showPanel = open && (query.trim().length > 0 || loading || Boolean(error));

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${dir === "rtl" ? "right-3" : "left-3"}`} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={showPanel}
          aria-autocomplete="list"
          aria-activedescendant={visibleResults[activeIndex] ? resultOptionId(listboxId, visibleResults[activeIndex]) : undefined}
          placeholder={t("globalSearch.placeholder")}
          className={`h-10 w-full rounded-md border border-line bg-white text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 ${dir === "rtl" ? "pl-20 pr-9" : "pl-9 pr-20"}`}
        />
        <kbd dir="ltr" className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 sm:inline-flex ${dir === "rtl" ? "left-2" : "right-2"}`}>
          Ctrl K
        </kbd>
      </div>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("globalSearch.aria")}
          className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-y border-line bg-white p-3 shadow-2xl sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 sm:max-h-[min(28rem,calc(100vh-8rem))] sm:rounded-md sm:border sm:p-2"
        >
          <SearchPanelState loading={loading} error={error} hasQuery={query.trim().length > 0} hasResults={visibleResults.length > 0} />

          {groupedResults.map((group) => (
            <SearchGroup
              key={group.category}
              category={group.category}
              results={group.results}
              activeResult={visibleResults[activeIndex]}
              listboxId={listboxId}
              onSelect={selectResult}
              translateLabel={tc}
            />
          ))}

          {hasMoreResults ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-palm"
            >
              {t("globalSearch.viewAll")}
              <span className="text-xs text-steel">({allResults.length})</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchPanelState({
  loading,
  error,
  hasQuery,
  hasResults,
}: {
  loading: boolean;
  error: string;
  hasQuery: boolean;
  hasResults: boolean;
}) {
  const { t } = useAppLocale();
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm text-steel">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t("globalSearch.searching")}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rosewood">{error}</div>;
  }

  if (hasQuery && !hasResults) {
    return <div className="px-3 py-6 text-center text-sm text-steel">{t("globalSearch.noResults")}</div>;
  }

  return null;
}

function SearchGroup({
  category,
  results,
  activeResult,
  listboxId,
  onSelect,
  translateLabel,
}: {
  category: GlobalSearchCategory;
  results: readonly GlobalSearchResult[];
  activeResult: GlobalSearchResult | undefined;
  listboxId: string;
  onSelect: (result: GlobalSearchResult) => void;
  translateLabel: (label: string) => string;
}) {
  return (
    <section className="py-1">
      <h2 className="px-2 py-1 text-xs font-semibold uppercase text-steel">{translateLabel(category)}</h2>
      <div className="space-y-1">
        {results.map((result) => (
          <SearchResultRow
            key={result.id}
            result={result}
            active={activeResult?.id === result.id}
            optionId={resultOptionId(listboxId, result)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function SearchResultRow({
  result,
  active,
  optionId,
  onSelect,
}: {
  result: GlobalSearchResult;
  active: boolean;
  optionId: string;
  onSelect: (result: GlobalSearchResult) => void;
}) {
  const { locale, dir } = useAppLocale();
  const Icon = resultIcon(result.category);

  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(result)}
      className={`flex min-h-14 w-full items-start gap-3 rounded-md px-2 py-2 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-palm ${
        active ? "bg-mist text-ink" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold">{result.label}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{result.resultType}</span>
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-steel">
          <span className="truncate">{result.detail}</span>
          {result.date ? <span>{formatAppDate(result.date, locale, "")}</span> : null}
          {result.amount ? <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{result.amount}</span> : null}
          {result.status ? <span>{result.status}</span> : null}
        </span>
      </span>
      <ArrowUpRight className={`mt-1 h-4 w-4 shrink-0 text-slate-400 ${dir === "rtl" ? "-scale-x-100" : ""}`} aria-hidden="true" />
    </button>
  );
}

function resultIcon(category: GlobalSearchCategory): LucideIcon {
  switch (category) {
    case "Contacts":
      return UserRound;
    case "Transactions":
      return FileText;
    case "Reports":
      return BarChart3;
    case "Pages / Navigation":
      return Navigation;
  }
  return FileText;
}

function resultOptionId(listboxId: string, result: GlobalSearchResult): string {
  return `${listboxId}-${result.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
