"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SafeErrorPanelProps {
  title?: string;
  message?: string;
  requestId?: string | null;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function SafeErrorPanel({
  title = "Something went wrong",
  message = "The workspace could not finish this request. Try again or share the reference ID with support.",
  requestId,
  error,
  onRetry,
  className,
}: SafeErrorPanelProps) {
  const referenceId = requestId ?? readRequestId(error);

  return (
    <section
      role="alert"
      aria-labelledby="safe-error-panel-title"
      className={cn("mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm", className)}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id="safe-error-panel-title" className="text-base font-semibold leading-snug">
            {title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
      </div>

      {referenceId ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Reference ID</span>
          <code className="ml-2 break-all font-mono text-foreground">{referenceId}</code>
        </div>
      ) : null}

      {onRetry ? (
        <div>
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function readRequestId(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.requestId === "string") {
    return error.requestId;
  }

  const details = error.details;
  if (isRecord(details)) {
    if (typeof details.requestId === "string") {
      return details.requestId;
    }
    if (isRecord(details.error) && typeof details.error.requestId === "string") {
      return details.error.requestId;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
