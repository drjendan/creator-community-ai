"use client";

import { Button } from "@/components/ui";

export function ConfirmationDialog({ open, title, description, onConfirm, onCancel }: {
  open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop"><h2 id="confirmation-title" className="font-display text-xl font-bold text-brand-900">{title}</h2><p className="mt-3 text-sm leading-6 text-brand-600">{description}</p><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="destructive" onClick={onConfirm}>Confirm</Button></div></div></div>;
}
