"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CoinsIcon,
  GearSixIcon,
  KeyIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  SignInIcon,
  SignOutIcon,
  SparkleIcon,
  UserGearIcon,
  UserPlusIcon,
  WarningCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { AdminSnapshot } from "@/shared/admin";

export const TASK_LABELS: Record<string, string> = {
  "tailor-cv": "Tailor CV",
  "cover-letter": "Cover letter",
  answer: "Draft answer",
  "parse-cv": "Import CV",
};

export const formatNumber = (value: number) => value.toLocaleString();

export const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday"; the exact time goes in the title. */
export function ago(value: string, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function TimeAgo({ value }: { value: string }) {
  return (
    <time dateTime={value} title={formatDate(value)}>
      {ago(value)}
    </time>
  );
}

const AVATAR_FILLS = ["var(--adm-danfo)", "var(--adm-naija)", "var(--adm-coral)", "var(--adm-paper)"];

export function Avatar({ name, email, size = "" }: { name: string; email: string; size?: "" | "sm" | "lg" }) {
  const source = name.trim() || email;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  let hash = 0;
  for (const char of email) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span aria-hidden className={`adm-avatar ${size}`} style={{ background: AVATAR_FILLS[hash % AVATAR_FILLS.length] }}>
      {initials || "?"}
    </span>
  );
}

export function Notice({ tone = "ok", children, action }: { tone?: "ok" | "stop"; children: ReactNode; action?: ReactNode }) {
  const IconFor = tone === "ok" ? CheckCircleIcon : WarningCircleIcon;
  return (
    <p role={tone === "ok" ? "status" : "alert"} className={`adm-note ${tone === "stop" ? "stop" : ""}`}>
      <IconFor aria-hidden weight="fill" />
      <span>{children}</span>
      {action}
    </p>
  );
}

/** Primary pill with its arrow in a nested bubble. */
export function PrimaryButton({
  children,
  busy,
  disabled,
  type = "submit",
  onClick,
  icon: IconFor = ArrowRightIcon,
}: {
  children: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  icon?: Icon;
}) {
  return (
    <button type={type} className="adm-btn primary" disabled={busy || disabled} onClick={onClick} aria-busy={busy || undefined}>
      {children}
      <span className="adm-bubble" aria-hidden>
        {busy ? <SpinnerIcon /> : <IconFor weight="bold" />}
      </span>
    </button>
  );
}

export function SpinnerIcon() {
  return (
    <svg className="adm-spin" viewBox="0 0 24 24" fill="none" aria-hidden width="16" height="16">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A button that asks once, in place, before doing something that matters.
 * Disarms itself after a few seconds so a stray click later does nothing.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  danger,
  disabled,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" className={`adm-btn sm ${danger ? "danger" : ""}`} disabled={disabled} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="adm-confirm">
      <button type="button" className="adm-btn sm" onClick={() => setArmed(false)}>
        Cancel
      </button>
      <button
        type="button"
        className={`adm-btn sm ${danger ? "danger solid" : "primary"}`}
        autoFocus
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
    </span>
  );
}

type Event = AdminSnapshot["activity"][number];
type EventStyle = { icon: Icon; tone?: "stop" | "admin" | "ok"; text: (event: Event) => ReactNode };

const SETTING_LABELS: Record<string, string> = {
  registrationsOpen: "registrations",
  aiEnabled: "Alfred AI",
  starterCredits: "starter credits",
  ownKeyUnlockCost: "own-key unlock",
};

/** Reads the before/after JSON that settings changes record. */
function settingsChange(detail: string): string {
  try {
    const { before, after } = JSON.parse(detail) as { before: Record<string, unknown> | string; after: Record<string, unknown> };
    const old = typeof before === "object" && before ? before : {};
    const changes: string[] = [];
    for (const [key, value] of Object.entries(after)) {
      if (key === "taskCosts" && value && typeof value === "object") {
        for (const [task, cost] of Object.entries(value)) {
          const was = (old.taskCosts as Record<string, unknown> | undefined)?.[task];
          if (was !== cost) changes.push(`${TASK_LABELS[task] ?? task} ${was ?? "default"} → ${String(cost)}`);
        }
      } else if (old[key] !== value) {
        const show = (v: unknown) => (typeof v === "boolean" ? (v ? "on" : "off") : String(v ?? "default"));
        changes.push(`${SETTING_LABELS[key] ?? key} ${show(old[key])} → ${show(value)}`);
      }
    }
    return changes.length ? changes.join(" · ") : "Saved without changes";
  } catch {
    return "";
  }
}

const EVENTS: Record<string, EventStyle> = {
  "account.registered": { icon: UserPlusIcon, tone: "ok", text: (e) => <><b>{e.actor}</b> created an account</> },
  "account.login": { icon: SignInIcon, text: (e) => <><b>{e.actor}</b> signed in</> },
  "account.password_reset": { icon: KeyIcon, text: (e) => <><b>{e.actor}</b> reset their password</> },
  "ai.completed": { icon: SparkleIcon, text: (e) => <><b>{e.actor}</b> ran {TASK_LABELS[e.target] ?? e.target}</> },
  "ai.failed": { icon: WarningCircleIcon, tone: "stop", text: (e) => <><b>{e.actor}</b>’s {TASK_LABELS[e.target] ?? e.target} failed</> },
  "admin.login": { icon: ShieldCheckIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> opened administration</> },
  "admin.credits": { icon: CoinsIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> adjusted credits for <b>{e.target}</b></> },
  "admin.role": { icon: UserGearIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> changed the role of <b>{e.target}</b></> },
  "admin.suspend": { icon: ProhibitIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> changed access for <b>{e.target}</b></> },
  "admin.revoke": { icon: SignOutIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> signed <b>{e.target}</b> out everywhere</> },
  "admin.settings": { icon: GearSixIcon, tone: "admin", text: (e) => <><b>{e.actor}</b> updated settings</> },
};

export function ActivityFeed({ events }: { events: Event[] }) {
  if (!events.length) {
    return (
      <div className="adm-empty">
        <SparkleIcon aria-hidden />
        <strong>Nothing yet</strong>
        Sign-ins, AI tasks and admin changes will show up here.
      </div>
    );
  }
  return (
    <ul className="adm-feed">
      {events.map((event) => {
        const style = EVENTS[event.action] ?? { icon: SparkleIcon, text: (e: Event) => <><b>{e.actor}</b> {e.action}</> };
        const IconFor = style.icon;
        const detail = event.action === "admin.settings" ? settingsChange(event.detail) : event.detail;
        return (
          <li key={event.id}>
            <span className={`adm-feed-icon ${style.tone ?? ""}`}>
              <IconFor aria-hidden weight={style.tone ? "fill" : "regular"} />
            </span>
            <p className="adm-feed-text">
              {style.text(event)}
              {detail && <span className="adm-feed-detail">{detail.replace(/_/g, " ")}</span>}
            </p>
            <TimeAgo value={event.createdAt} />
          </li>
        );
      })}
    </ul>
  );
}
