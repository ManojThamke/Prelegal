// Shared UI primitives, so every screen uses the same controls.

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON: Record<ButtonVariant, string> = {
  // Purple is reserved for each screen's main action.
  primary: "bg-brand-purple text-white hover:bg-[#62307a] disabled:bg-slate-300 disabled:text-white",
  secondary: "bg-white text-brand-navy ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  quiet: "text-slate-600 hover:bg-slate-100 hover:text-brand-navy disabled:text-slate-400",
  danger: "text-rose-700 hover:bg-rose-50 disabled:text-slate-400",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = ""): string {
  return (
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold " +
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue " +
    `disabled:cursor-not-allowed ${BUTTON[variant]} ${extra}`
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function TextField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-brand-navy">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-blue focus:outline-none focus:ring-3 focus:ring-brand-blue/20"
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {children}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-3 text-sm text-slate-600">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue"
      />
      {label}
    </p>
  );
}

/** Legal disclaimer shown with every generated document. */
export const DISCLAIMER =
  "Prelegal documents are drafts generated with AI assistance. They are not legal advice and " +
  "should be reviewed by a qualified lawyer before you sign or rely on them.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`border-l-4 border-brand-yellow bg-white px-4 py-3 text-sm text-slate-700 shadow-xs ${className}`}
    >
      <strong className="font-semibold text-brand-navy">Draft for legal review. </strong>
      {DISCLAIMER}
    </p>
  );
}
