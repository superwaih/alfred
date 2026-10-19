import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  type Icon,
} from "@phosphor-icons/react";

/** Stagger steps for .rise entrances (see panel.css). */
export const STAGGER = ["[--i:0]", "[--i:1]", "[--i:2]", "[--i:3]", "[--i:4]", "[--i:5]", "[--i:6]", "[--i:7]"] as const;
export const stagger = (index: number) => STAGGER[Math.min(index, STAGGER.length - 1)];

/**
 * The butler's tray: an inner core set into a faintly lit outer shell, with
 * concentric radii (shell 24px, padding 6px, core 18px).
 */
export function Tray({ children, className = "", core = "", as: As = "div" }: { children: ReactNode; className?: string; core?: string; as?: "div" | "section" | "li" | "article" }) {
  return (
    <As className={`rounded-[var(--r-shell)] bg-shell p-[var(--bezel)] ring-1 ring-shell-ring ${className}`}>
      <div className={`rounded-[var(--r-card)] bg-core p-4 shadow-core ${core}`}>{children}</div>
    </As>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "quiet" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  /** Leading icon. */
  icon?: Icon;
  /** Trailing icon in its own nested circle (button-in-button). */
  trailing?: Icon | boolean;
};

/**
 * One button family: pill shaped, pressed in on click, with an optional
 * trailing icon that sits in its own circle and leans forward on hover.
 */
export function Button({
  tone = "primary",
  size = "md",
  busy = false,
  icon: Lead,
  trailing,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const tones = {
    primary: "bg-action text-action-ink shadow-[0_1px_2px_rgb(0_0_0/0.15)] hover:brightness-[1.06]",
    quiet: "bg-core text-ink ring-1 ring-[var(--line)] hover:bg-sunken",
    ghost: "bg-transparent text-ink-soft hover:bg-field hover:text-ink",
    danger: "bg-transparent text-stop hover:bg-field",
  }[tone];
  const sizes = {
    sm: "h-9 gap-1.5 text-[13px]",
    md: "h-11 gap-2 text-[14px]",
    lg: "h-12 gap-2.5 text-[15px]",
  }[size];
  const Trail = trailing === true ? ArrowUpRightIcon : trailing || null;
  const pad = Trail ? (size === "sm" ? "pl-3.5 pr-1" : "pl-5 pr-1.5") : size === "sm" ? "px-3.5" : "px-5";
  const bubble = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`group inline-flex shrink-0 items-center justify-center rounded-[var(--r-button)] font-semibold transition-[transform,background-color,box-shadow] duration-500 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint disabled:shadow-none disabled:hover:brightness-100 ${tones} ${sizes} ${pad} ${className}`}
      {...rest}
    >
      {busy ? (
        <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      ) : (
        Lead && <Lead aria-hidden className="h-[1.15em] w-[1.15em]" />
      )}
      <span>{children}</span>
      {Trail && (
        <span
          aria-hidden
          className={`grid place-items-center rounded-full bg-[var(--bubble-bg)] transition-transform duration-500 ease-spring group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 ${bubble}`}
        >
          <Trail className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

/** A round icon-only button with a visible tooltip label for pointer users. */
export function IconButton({ icon: I, label, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-button)] text-ink-soft ring-1 ring-line transition-[transform,background-color,color] duration-500 ease-spring hover:bg-field hover:text-ink active:scale-[0.94] ${className}`}
      {...rest}
    >
      <I aria-hidden className="h-[18px] w-[18px]" />
    </button>
  );
}

/** A small capsule label above a heading. */
export function Eyebrow({ children, tone = "plain" }: { children: ReactNode; tone?: Tone }) {
  const tones = {
    plain: "text-accent",
    ok: "text-ok",
    warn: "text-warn",
    stop: "text-stop",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[4px] bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tones}`}>
      {children}
    </span>
  );
}

export function ViewTitle({ eyebrow, title, sub, className = "" }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <header className={`rise space-y-3 ${className}`}>
      {eyebrow}
      <h1 className="serif text-[28px] text-ink">{title}</h1>
      {sub && <p className="max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">{sub}</p>}
    </header>
  );
}

export function SectionTitle({ children, count, tone = "plain", aside }: { children: ReactNode; count?: number; tone?: Tone; aside?: ReactNode }) {
  const dot = { ok: "bg-ok", warn: "bg-warn", stop: "bg-stop", plain: "bg-accent" }[tone];
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
        <span aria-hidden className={`h-3.5 w-[3px] rounded-full ${dot}`} />
        {children}
        {count !== undefined && <span className="text-[13px] font-semibold tabular-nums text-ink-faint">{count}</span>}
      </h2>
      {aside}
    </div>
  );
}

type FieldShellProps = { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string };

export function FieldShell({ label, hint, children, className = "" }: FieldShellProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[12px] font-semibold text-ink-soft">
        {label}
      </label>
      <div className="mt-1.5">{children(id)}</div>
      {hint && <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

export const controlClass =
  "w-full rounded-[var(--r-control)] bg-field px-3.5 text-[14px] font-medium text-ink ring-1 ring-[var(--line)] placeholder:font-normal placeholder:text-ink-faint outline-none transition-[box-shadow,background-color] duration-300 ease-spring focus:bg-core focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50";

export function TextInput({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {(id) => <input id={id} className={`${controlClass} h-11`} {...rest} />}
    </FieldShell>
  );
}

export function TextArea({ label, hint, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {(id) => <textarea id={id} className={`${controlClass} min-h-24 resize-y py-3 leading-relaxed`} {...rest} />}
    </FieldShell>
  );
}

export function Select({ label, hint, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode }) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {(id) => (
        <select id={id} className={`${controlClass} h-11`} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export type Tone = "ok" | "warn" | "stop" | "plain";

/** A short message with an icon. Errors are announced to screen readers. */
export function Notice({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  const { I, color } = {
    ok: { I: CheckCircleIcon, color: "text-ok" },
    warn: { I: WarningCircleIcon, color: "text-warn" },
    stop: { I: WarningCircleIcon, color: "text-stop" },
    plain: { I: InfoIcon, color: "text-ink-soft" },
  }[tone];
  return (
    <div role={tone === "stop" ? "alert" : "status"} className="rise flex gap-3 rounded-[var(--r-card)] bg-[var(--tag-bg)] p-3.5 text-[13px] leading-relaxed ring-1 ring-[var(--tag-ring)]">
      <I aria-hidden className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${color}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
