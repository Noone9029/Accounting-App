"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  disabledReportPackBoundaryItems,
  fetchReportPackManifestPreview,
  isReportPackSourceNavigable,
  reportPackReviewStatusLabel,
  type ReportPackManifestPreview,
  type ReportPackReviewStatus,
} from "@/lib/report-packs";

type PreviewState =
  | { status: "loading" }
  | { status: "loaded"; manifest: ReportPackManifestPreview }
  | { status: "error"; message: string };

export default function ReportPacksPage() {
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    fetchReportPackManifestPreview()
      .then((manifest) => {
        if (active) {
          setPreviewState({ status: "loaded", manifest });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPreviewState({
            status: "error",
            message: error instanceof Error ? error.message : "Report-pack preview could not be loaded.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Read-only preview</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Report packs</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
            View the report-pack manifest preview that LedgerByte can currently describe. This page does not generate,
            download, export, email, schedule, archive, store, submit, or send anything.
          </p>
        </div>
        <Link href="/reports" className="self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink shadow-panel">
          Open reports
        </Link>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Report-pack preview is metadata only. Generation, exports, downloads, email sending, scheduling, archive writes,
        generated-document mutation, object storage, signed URLs, provider calls, and compliance submission remain disabled.
      </div>

      {previewState.status === "loading" ? <ReportPackLoadingState /> : null}
      {previewState.status === "error" ? <ReportPackErrorState message={previewState.message} /> : null}
      {previewState.status === "loaded" ? <ReportPackManifestView manifest={previewState.manifest} /> : null}
    </section>
  );
}

function ReportPackManifestView({ manifest }: { manifest: ReportPackManifestPreview }) {
  const disabledBoundaries = disabledReportPackBoundaryItems(manifest.executionBoundary);
  const items = manifest.items;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel">Preview status</div>
          <div className="mt-2 text-lg font-semibold text-ink">{manifest.status.replaceAll("_", " ")}</div>
          <p className="mt-2 text-sm leading-6 text-steel">
            This manifest is a planning preview. Each item still needs review before any future bundle execution is designed.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel">Supported report kinds</div>
          <div className="mt-2 text-lg font-semibold text-ink">{items.length}</div>
          <p className="mt-2 text-sm leading-6 text-steel">
            Supported items are listed from the API manifest. Missing web pages are shown as preview-only, not linked.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel">Disabled boundaries</div>
          <div className="mt-2 text-lg font-semibold text-ink">{disabledBoundaries.length}</div>
          <p className="mt-2 text-sm leading-6 text-steel">
            All execution boundaries remain disabled in this UI slice.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink">Supported report items</h2>
        {items.length === 0 ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-white p-5 text-sm leading-6 text-steel shadow-panel">
            No report-pack items were returned by the preview endpoint. Nothing can be generated or exported from this state.
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1 font-mono text-xs text-steel">{item.reportKind}</p>
                  </div>
                  <span className={`self-start rounded-md px-2 py-1 text-xs font-medium ${reviewStatusClass(item.reviewStatus)}`}>
                    {reportPackReviewStatusLabel(item.reviewStatus)}
                  </span>
                </div>
                <div className="mt-4 text-sm leading-6 text-steel">
                  Source: {item.source.type === "ledgerbyte-report-route" ? "LedgerByte report route" : item.source.type}
                </div>
                {isReportPackSourceNavigable(item) ? (
                  <Link href={item.source.href} className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    View source report
                  </Link>
                ) : (
                  <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">
                    Preview-only item. No active web report page is linked yet.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink">Disabled capabilities</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {disabledBoundaries.map((boundary) => (
            <div key={boundary.key} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{boundary.label}</h3>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Disabled</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-steel">{boundary.explanation}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportPackLoadingState() {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 text-sm leading-6 text-steel shadow-panel" role="status">
      Loading report-pack preview metadata.
    </div>
  );
}

function ReportPackErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rosewood" role="alert">
      <div className="font-semibold">Report-pack preview is unavailable.</div>
      <p className="mt-1">{message}</p>
      <p className="mt-2">No report-pack action is available while the preview cannot be loaded.</p>
    </div>
  );
}

function reviewStatusClass(status: ReportPackReviewStatus): string {
  switch (status) {
    case "READY_FOR_REVIEW":
      return "bg-emerald-50 text-emerald-700";
    case "BLOCKED":
      return "bg-rose-50 text-rosewood";
    case "NEEDS_REVIEW":
      return "bg-amber-50 text-amber-800";
  }
}
