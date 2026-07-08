"use client";

import { SafeErrorPanel } from "@/components/support/safe-error-panel";

export default function AppError({ error, reset }: { error: Error & { digest?: string; requestId?: string | null }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <SafeErrorPanel error={error} requestId={error.requestId ?? error.digest ?? null} onRetry={reset} />
    </main>
  );
}
