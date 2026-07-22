import { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-brand-900", className)}
      {...props}
    />
  );
}

// Field wires a label to a control and renders hint / error text with the
// correct aria wiring. Pass htmlFor + id to the control for accessibility.
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const describedById = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={describedById} className="text-xs text-brand-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={describedById} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
