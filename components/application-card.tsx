import type { ReactNode } from "react";
import { job } from "@/lib/demo-data";
import { BowTie } from "./brand";

export type FieldState = "empty" | "filled" | "needs-you" | "answered";

export type CardField = {
  label: string;
  value?: ReactNode;
  state: FieldState;
};

type ApplicationCardProps = {
  fields: CardField[];
  /** What Alfred says in the card's top bar. */
  note: ReactNode;
  footer: ReactNode;
  compact?: boolean;
  className?: string;
};

/**
 * A fragment of a real application page with Alfred's bar across the top.
 * It is the product's own interface, so it keeps its own borders and radii
 * (data-ui), set in a nested shell like a plate in a tray.
 */
export function ApplicationCard({ fields, note, footer, compact = false, className = "" }: ApplicationCardProps) {
  return (
    <div
      data-ui
      className={`rounded-[22px] bg-current/10 p-1.5 ring-1 ring-current/15 ${className}`}
    >
      <div className="overflow-hidden rounded-[16px] bg-paper text-ink">
        <div className="flex items-center gap-2 bg-night px-3.5 py-2.5 text-[13px] text-bone">
          {!compact && <BowTie className="h-2.5 w-auto shrink-0 text-danfo" />}
          <span className="truncate font-bold">{note}</span>
        </div>

        <div className={compact ? "px-4 pb-4 pt-3.5" : "px-5 pb-5 pt-4"}>
          <p className="text-[13px] text-ink-soft">{job.host}</p>
          <p className={`mt-0.5 font-black leading-tight tracking-[-0.02em] ${compact ? "text-[15px]" : "text-lg"}`}>
            {job.role}, {job.company}
          </p>

          <div className={compact ? "mt-3 space-y-2.5" : "mt-4 space-y-3"}>
            {fields.map((field) => (
              <Field key={field.label} field={field} compact={compact} />
            ))}
          </div>

          <div className={compact ? "mt-3.5" : "mt-5"}>{footer}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ field, compact }: { field: CardField; compact: boolean }) {
  // Form-field status bars inside the product's own UI. taste-skill-ignore
  const box = {
    empty: "bg-field",
    filled: "bg-field shadow-[inset_3px_0_0_var(--naija)]", // taste-skill-ignore
    "needs-you": "bg-coral/15 shadow-[inset_0_0_0_2px_var(--coral)]", // taste-skill-ignore
    answered: "bg-field shadow-[inset_3px_0_0_var(--ink)]", // taste-skill-ignore
  }[field.state];

  const tag = {
    empty: null,
    filled: <span className="text-[#0e7a40]">Filled</span>,
    "needs-you": <span className="text-[#b02e18]">Needs you</span>,
    answered: <span>By you</span>,
  }[field.state];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-soft">{field.label}</span>
        {tag && <span className="font-bold">{tag}</span>}
      </div>
      <div
        className={`mt-1 flex items-center rounded-[7px] px-2.5 ${compact ? "h-8 text-[13px]" : "h-10 text-[15px]"} ${box}`}
      >
        <span className="min-w-0 flex-1 truncate font-bold tabular-nums">{field.value}</span>
      </div>
    </div>
  );
}

/** The application's own Submit button, as the page would draw it. */
export function SubmitButton({ active, label = "Submit application" }: { active: boolean; label?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-9 w-full items-center justify-center rounded-[8px] text-[13px] font-bold ${
        active ? "bg-ink text-paper" : "bg-field-off text-field-off-ink"
      }`}
    >
      {label}
    </span>
  );
}
