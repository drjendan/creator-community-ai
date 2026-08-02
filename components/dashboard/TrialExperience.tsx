"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import { expiredTrialMessage } from "@/lib/trial-constants";

export type TrialExperienceState = {
  subscriptionId: string | null;
  subscriptionType: string;
  isActiveTrial: boolean;
  isExpiredTrial: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  daysRemaining: number | null;
};

export function TrialExperience({ trial }: { trial: TrialExperienceState }) {
  const [showModal, setShowModal] = useState(trial.isExpiredTrial);
  const modalKey = `upnexx:expired-trial:${trial.subscriptionId ?? "unknown"}`;

  useEffect(() => {
    if (!trial.isExpiredTrial || window.sessionStorage.getItem(modalKey)) setShowModal(false);
  }, [modalKey, trial.isExpiredTrial]);

  function dismiss() {
    window.sessionStorage.setItem(modalKey, "dismissed");
    setShowModal(false);
  }

  if (!trial.isActiveTrial && !trial.isExpiredTrial) return null;

  return (
    <>
      <section
        aria-label="Trial status"
        className={trial.isExpiredTrial
          ? "border-b border-red-200 bg-red-50 px-4 py-4 md:px-8"
          : "border-b border-accent-200 bg-accent-50 px-4 py-4 md:px-8"}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-brand-900">
              {trial.isExpiredTrial ? expiredTrialMessage : `${trial.subscriptionType} is active.`}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-brand-600">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Status: {trial.isExpiredTrial ? "Expired Trial" : "Active Trial"}</span>
              <span>Started: {formatDate(trial.trialStartedAt)}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Ends: {formatDate(trial.trialEndsAt)}</span>
              <span>{trial.daysRemaining ?? 0} {trial.daysRemaining === 1 ? "day" : "days"} remaining</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/billing" className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2">
              {trial.isExpiredTrial ? "Choose Plan" : "Upgrade"}
            </Link>
            <Link href="/dashboard/support" className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-bold text-brand-800 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-accent-500">
              Contact Support
            </Link>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-brand-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="expired-trial-title" className="relative w-full max-w-lg rounded-2xl bg-white p-7 shadow-pop">
            <button type="button" onClick={dismiss} className="absolute right-4 top-4 rounded-lg p-2 text-brand-500 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-accent-500" aria-label="Close trial notice">
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Expired Trial</p>
            <h2 id="expired-trial-title" className="mt-3 pr-8 font-display text-2xl font-extrabold text-brand-900">Your free trial has ended</h2>
            <p className="mt-3 leading-7 text-brand-600">{expiredTrialMessage}</p>
            <p className="mt-3 text-sm text-brand-600">Your data is safe and remains available to view. Creating content, using AI, sending campaigns, uploading files, and inviting users are paused until you select a plan.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/billing" className="rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2">Choose Plan</Link>
              <a href="mailto:sales@upnexx.net?subject=UpNexx%20subscription" className="rounded-lg border border-brand-300 px-4 py-2.5 text-sm font-bold text-brand-800 focus:outline-none focus:ring-2 focus:ring-accent-500">Contact Sales</a>
              <Link href="/dashboard/support" className="rounded-lg border border-brand-300 px-4 py-2.5 text-sm font-bold text-brand-800 focus:outline-none focus:ring-2 focus:ring-accent-500">Contact Support</Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not available";
}
