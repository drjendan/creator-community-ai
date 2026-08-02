"use client";

import { useEffect } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button, Container } from "@/components/ui";
import { logError } from "@/lib/logging";

export default function ApplicationError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("application.route_error", error, { errorReference: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-50">
      <main className="grid flex-1 place-items-center px-4 py-16">
        <Container>
          <div className="mx-auto max-w-xl rounded-2xl border border-brand-200 bg-white p-8 text-center shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-danger-strong">Application Error</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900">We couldn&apos;t load this page</h1>
            <p className="mt-3 text-sm leading-6 text-brand-600">Try again. If the problem continues, contact UpNexx Support and include the error reference below.</p>
            {error.digest && <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 font-mono text-xs text-brand-600">Error reference: {error.digest}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={reset}>Try Again</Button>
              <Button href="/dashboard/support" variant="secondary">Contact Support</Button>
            </div>
          </div>
        </Container>
      </main>
      <AppFooter />
    </div>
  );
}
