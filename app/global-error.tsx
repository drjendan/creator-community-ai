"use client";

import { useEffect } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { logError } from "@/lib/logging";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("application.global_error", error, { errorReference: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col bg-brand-50">
          <main className="grid flex-1 place-items-center px-4 py-16">
            <div className="max-w-xl rounded-2xl border border-brand-200 bg-white p-8 text-center shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-danger-strong">UpNexx</p>
              <h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900">Something went wrong</h1>
              <p className="mt-3 text-sm leading-6 text-brand-600">The application encountered an unexpected error. Your data has not been removed.</p>
              {error.digest && <p className="mt-4 font-mono text-xs text-brand-500">Error reference: {error.digest}</p>}
              <button type="button" onClick={reset} className="mt-6 rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-bold text-white">Try Again</button>
            </div>
          </main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
