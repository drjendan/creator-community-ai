"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";

type TourScope = "tenant" | "platform";
type TourStep = {
  title: string;
  description: string;
  selector?: string;
};
type HighlightRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const tenantSteps: TourStep[] = [
  {
    title: "Welcome to UpNexx",
    description: "This quick tour shows you where to manage your brand, publish content, preview the member experience, and manage your account."
  },
  {
    title: "Your podcast workspace",
    description: "This switcher shows which tenant you are managing. Platform administrators can also use it to create or move between podcast businesses.",
    selector: "[data-tour='tenant-switcher']"
  },
  {
    title: "Everything is grouped by purpose",
    description: "Open Content to add podcasts, courses, resources, and events. Audience manages members and community. Workspace contains branding, team, billing, and settings.",
    selector: "[data-tour='main-navigation']"
  },
  {
    title: "Your working area",
    description: "Each section opens here. Content screens include Add, Edit, Delete, tile/list views, publishing status, access controls, and member previews.",
    selector: "[data-tour='workspace']"
  },
  {
    title: "Help and account controls",
    description: "Restart this tour anytime with the Tour button. Open your profile menu to sign out securely.",
    selector: "[data-tour='account-controls']"
  }
];

const platformSteps: TourStep[] = [
  {
    title: "Welcome to Super Administration",
    description: "This tour covers the controls used to create tenants and oversee the entire UpNexx platform."
  },
  {
    title: "Platform navigation",
    description: "UpNexx Tenants manages workspaces. Billing & Usage covers plans and entitlements. Platform Team and Settings contain internal access and configuration.",
    selector: "[data-tour='main-navigation']"
  },
  {
    title: "Platform workspace",
    description: "The selected administration screen appears here. Start with Tenants when onboarding a new podcast creator.",
    selector: "[data-tour='workspace']"
  },
  {
    title: "Help and account controls",
    description: "Use Tour to replay this guide, or open the profile menu to sign out.",
    selector: "[data-tour='account-controls']"
  }
];

export function OnboardingTour({ scope, startSignal, identity = "local" }: { scope: TourScope; startSignal: number; identity?: string }) {
  const allSteps = useMemo(() => scope === "platform" ? platformSteps : tenantSteps, [scope]);
  const [steps, setSteps] = useState<TourStep[]>(allSteps);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const storageKey = `podcastos:onboarding:${scope}:${identity}:v2`;

  const begin = useCallback(() => {
    const available = allSteps.filter((step) => {
      if (!step.selector) return true;
      const target = document.querySelector(step.selector);
      if (!target) return false;
      const style = window.getComputedStyle(target);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    setSteps(available);
    setStepIndex(0);
    setOpen(true);
  }, [allSteps]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!window.localStorage.getItem(storageKey)) begin();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [begin, storageKey]);

  useEffect(() => {
    if (startSignal > 0) begin();
  }, [begin, startSignal]);

  const close = useCallback((completed = false) => {
    window.localStorage.setItem(storageKey, completed ? "completed" : "dismissed");
    setOpen(false);
  }, [storageKey]);
  const dialogRef = useDialogFocus<HTMLElement>(open, () => close(false));

  useEffect(() => {
    if (!open) return;
    const step = steps[stepIndex];
    function updatePosition() {
      if (!step?.selector) {
        setRect(null);
        return;
      }
      const target = document.querySelector(step.selector);
      if (!target) {
        setRect(null);
        return;
      }
      const bounds = target.getBoundingClientRect();
      const padding = 8;
      setRect({
        top: Math.max(8, bounds.top - padding),
        left: Math.max(8, bounds.left - padding),
        right: Math.min(window.innerWidth - 8, bounds.right + padding),
        bottom: Math.min(window.innerHeight - 8, bounds.bottom + padding),
        width: Math.min(window.innerWidth - 16, bounds.width + padding * 2),
        height: Math.min(window.innerHeight - 16, bounds.height + padding * 2)
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, stepIndex, steps]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [close, open]);

  if (!open || !steps.length) return null;

  const step = steps[stepIndex];
  const lastStep = stepIndex === steps.length - 1;
  const popoverStyle = rect
    ? {
        left: window.innerWidth - rect.right >= 392
          ? rect.right + 18
          : rect.left >= 392
            ? rect.left - 376
            : Math.max(16, (window.innerWidth - 360) / 2),
        top: Math.min(Math.max(16, rect.top), Math.max(16, window.innerHeight - 330))
      }
    : {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)"
      };

  return (
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      {rect ? (
        <>
          <div className="fixed left-0 right-0 top-0 bg-brand-950/70" style={{ height: rect.top }} />
          <div className="fixed bottom-0 left-0 right-0 bg-brand-950/70" style={{ top: rect.bottom }} />
          <div className="fixed left-0 bg-brand-950/70" style={{ top: rect.top, width: rect.left, height: rect.height }} />
          <div className="fixed right-0 bg-brand-950/70" style={{ top: rect.top, left: rect.right, height: rect.height }} />
          <div className="pointer-events-none fixed rounded-xl ring-4 ring-highlight-400 ring-offset-2 ring-offset-white" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
        </>
      ) : <div className="fixed inset-0 bg-brand-950/75" />}

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        tabIndex={-1}
        className="fixed z-[100] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-brand-200 bg-white p-6 shadow-2xl"
        style={popoverStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent-700">Step {stepIndex + 1} of {steps.length}</p>
          <button type="button" onClick={() => close(false)} className="-mr-2 -mt-2 rounded-lg p-2 text-brand-500 hover:bg-brand-100" aria-label="Close tour"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="tour-title" className="mt-3 font-display text-2xl font-extrabold text-brand-900">{step.title}</h2>
        <p id="tour-description" className="mt-3 text-sm leading-6 text-brand-600">{step.description}</p>
        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          {steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === stepIndex ? "w-7 bg-accent-600" : "w-2 bg-brand-200"}`} />)}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => close(false)} className="text-sm font-bold text-brand-500 hover:text-brand-800">Skip tour</button>
          <div className="flex gap-2">
            {stepIndex > 0 && <button type="button" onClick={() => setStepIndex((value) => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-brand-200 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"><ChevronLeft className="h-4 w-4" />Back</button>}
            <button type="button" onClick={() => lastStep ? close(true) : setStepIndex((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700">{lastStep ? "Finish" : "Next"}{!lastStep && <ChevronRight className="h-4 w-4" />}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

