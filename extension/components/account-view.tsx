import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CoinsIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  ShieldCheckIcon,
  SignOutIcon,
  type Icon,
} from "@phosphor-icons/react";
import { fetchCredits, signOut, unlockOwnKey, type CreditsInfo } from "@/lib/api";
import { OWN_KEY_UNLOCK_COST } from "@shared/ai";
import { PROVIDER_LABELS } from "@/lib/providers";
import { DEFAULT_MODELS, billingItem, sessionItem, settingsItem, themeItem, resolveTheme, type ColorTheme, type Provider, type Settings } from "@/lib/storage";
import { useStored } from "@/hooks/use-stored";
import { Button, controlClass, errorMessage, Eyebrow, IconButton, Notice, SectionTitle, Select, stagger, TextInput, Tray, ViewTitle } from "./ui";

const TASK_NAMES: Record<string, string> = {
  "tailor-cv": "Tailored CV",
  "cover-letter": "Cover letter",
  answer: "Drafted answer",
  "parse-cv": "Read CV",
};

export function AccountView() {
  const [session] = useStored(sessionItem);
  return (
    <div className="space-y-8 px-5 pt-6">
      <ViewTitle
        eyebrow={<Eyebrow>Account</Eyebrow>}
        title={session ? "Credits and AI." : "Your Alfred account."}
        sub={
          session
            ? "How Alfred pays for AI, and how the panel looks."
            : "An account holds your AI credits. Your profile stays in this browser either way."
        }
      />
      {session && <Credits />}
      <AiSettings />
      <Preferences />
      {session && <SignOutRow />}
    </div>
  );
}

/** A pill switch for two or three options. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: Icon }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[var(--r-button)] bg-sunken p-1 ring-1 ring-line">
      {options.map(({ value: optionValue, label: optionLabel, icon: I }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--r-button)-2px)] text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-500 ease-spring ${
              active ? "bg-core text-ink shadow-core" : "text-ink-soft hover:text-ink"
            }`}
          >
            {I && <I aria-hidden className="h-4 w-4" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

function Credits() {
  const [session] = useStored(sessionItem);
  const [info, setInfo] = useState<CreditsInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    setBusy("refresh");
    try {
      setInfo(await fetchCredits());
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const credits = info?.credits ?? session?.user.credits ?? 0;

  return (
    <section className="space-y-3">
      <Tray className={`rise ${stagger(1)}`} core="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
              <CoinsIcon aria-hidden className="h-4 w-4 text-accent" /> Balance
            </p>
            <p className="mt-2 serif text-[46px] leading-none tabular-nums">{credits}</p>
            <p className="mt-1 truncate text-[12px] text-ink-faint">credits · {session?.user.email}</p>
          </div>
          <IconButton
            icon={ArrowsClockwiseIcon}
            label="Refresh balance"
            onClick={() => void refresh()}
            className={busy === "refresh" ? "animate-spin" : ""}
          />
        </div>
        {info && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["CV", info.costs["tailor-cv"]],
                ["Letter", info.costs["cover-letter"]],
                ["Answer", info.costs.answer],
              ] as const
            ).map(([label, cost]) => (
              <div key={label} className="rounded-[var(--r-control)] bg-sunken px-2 py-2.5 ring-1 ring-line">
                <dt className="text-[11px] text-ink-faint">{label}</dt>
                <dd className="text-[15px] font-semibold tabular-nums">{cost}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-[12px] leading-relaxed text-ink-faint">Filling forms from your profile is always free.</p>
      </Tray>

      {error && <Notice tone="stop">{error}</Notice>}

      {info && info.history.length > 0 && (
        <details className="group rounded-[var(--r-card)] bg-shell p-[var(--bezel)] ring-1 ring-shell-ring">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-[var(--r-card)] px-3.5 py-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
            Recent activity
            <span aria-hidden className="text-ink-faint transition-transform duration-500 ease-spring group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <ul className="rounded-[var(--r-card)] bg-core px-3.5 py-1 text-[13px] shadow-core">
            {info.history.map((row) => (
              <li key={`${row.createdAt}-${row.delta}`} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {row.reason === "task"
                    ? TASK_NAMES[row.task ?? ""] ?? "AI task"
                    : row.reason === "refund"
                      ? "Refund (task failed)"
                      : row.reason === "purchase"
                        ? "Purchase"
                        : row.reason === "unlock"
                          ? "Own key unlocked"
                          : "Welcome credits"}
                  <span className="block text-[11px] text-ink-faint">{new Date(row.createdAt).toLocaleString()}</span>
                </span>
                <span className={`font-semibold tabular-nums ${row.delta > 0 ? "text-ok" : "text-ink-soft"}`}>
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function AiSettings() {
  const [settings, setSettings] = useStored(settingsItem);
  const [session] = useStored(sessionItem);
  const [showKey, setShowKey] = useState(false);
  const unlocked = Boolean(session?.user.ownKeyUnlocked);

  // While own keys are locked, AI always runs on credits.
  useEffect(() => {
    if (settings && !unlocked && settings.aiMode === "own-key") void setSettings({ ...settings, aiMode: "auto" });
  }, [settings, unlocked, setSettings]);

  if (!settings) return null;
  if (!unlocked) return <OwnKeyLocked />;

  const set = (patch: Partial<Settings>) => void setSettings({ ...settings, ...patch });
  const provider = settings.provider;

  return (
    <section className={`rise space-y-3.5 ${stagger(3)}`}>
      <SectionTitle>AI</SectionTitle>
      <fieldset className="space-y-2">
        <legend className="sr-only">How Alfred pays for AI</legend>
        {(
          [
            ["auto", "Alfred credits, then my key", "Uses your credits while you have them. When they run out, your own key takes over if you’ve added one."],
            ["own-key", "Only my own key", "Never spends credits. Every AI task runs on the key below."],
          ] as const
        ).map(([value, label, help]) => {
          const active = settings.aiMode === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-[var(--r-card)] p-3.5 ring-1 transition-[background-color,box-shadow] duration-500 ease-spring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--focus)] ${
                active ? "bg-core shadow-core ring-shell-ring" : "bg-shell ring-shell-ring hover:bg-field"
              }`}
            >
              <input type="radio" name="ai-mode" checked={active} onChange={() => set({ aiMode: value })} className="sr-only" />
              <span
                aria-hidden
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300 ${
                  active ? "bg-action text-action-ink ring-transparent" : "ring-line"
                }`}
              >
                {active && <CheckIcon className="h-3 w-3" weight="bold" />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold">{label}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{help}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <Tray core="space-y-3.5">
        <Select label="Your provider" value={provider} onChange={(e) => set({ provider: e.target.value as Provider })}>
          {(Object.keys(PROVIDER_LABELS) as Provider[]).map((key) => (
            <option key={key} value={key}>
              {PROVIDER_LABELS[key]}
            </option>
          ))}
        </Select>

        {provider === "openai-compatible" && (
          <TextInput
            label="API address"
            value={settings.compatibleBaseUrl}
            onChange={(e) => set({ compatibleBaseUrl: e.target.value })}
            hint="The provider’s OpenAI-style base URL, ending in /v1."
          />
        )}

        <div>
          <label htmlFor="api-key" className="block text-[12px] font-semibold text-ink-soft">
            {PROVIDER_LABELS[provider].split(" (")[0]} API key
          </label>
          <div className="relative mt-1.5">
            <KeyIcon aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={settings.keys[provider] ?? ""}
              onChange={(e) => set({ keys: { ...settings.keys, [provider]: e.target.value.trim() } })}
              className={`${controlClass} h-11 pl-10 pr-12 font-mono text-[13px]`}
            />
            <IconButton
              icon={showKey ? EyeSlashIcon : EyeIcon}
              label={showKey ? "Hide key" : "Show key"}
              aria-pressed={showKey}
              onClick={() => setShowKey(!showKey)}
              className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 ring-0"
            />
          </div>
        </div>

        <TextInput
          label="Model"
          value={settings.models[provider] ?? ""}
          placeholder={DEFAULT_MODELS[provider] || "Required for this provider"}
          onChange={(e) => set({ models: { ...settings.models, [provider]: e.target.value.trim() } })}
          hint={DEFAULT_MODELS[provider] ? `Leave empty for ${DEFAULT_MODELS[provider]}.` : "Use the model name your provider lists."}
        />
      </Tray>

      <p className="flex gap-2 px-1 text-[12px] leading-relaxed text-ink-faint">
        <ShieldCheckIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
        Your key stays in this browser and goes only to the provider you chose, never to Alfred. Usage is billed by your provider.
      </p>
    </section>
  );
}

/** The one-time unlock for using your own AI provider key. */
function OwnKeyLocked() {
  const [session] = useStored(sessionItem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const credits = session?.user.credits ?? 0;
  const [billing] = useStored(billingItem);
  const unlockCost = billing?.ownKeyUnlockCost ?? OWN_KEY_UNLOCK_COST;
  const enough = credits >= unlockCost;

  async function unlock() {
    setBusy(true);
    setError("");
    try {
      await unlockOwnKey();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`rise space-y-3.5 ${stagger(3)}`}>
      <SectionTitle>Use your own API key</SectionTitle>
      <Tray core="space-y-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Prefer to pay an AI provider directly? Unlock once for {unlockCost} credits, then add a DeepSeek, OpenAI, Gemini or
          other key. Your key stays in this browser.
        </p>
        <Button className="w-full" icon={KeyIcon} disabled={!enough} busy={busy} onClick={() => void unlock()}>
          Unlock for {unlockCost} credits
        </Button>
        {!enough && (
          <p className="text-[12px] leading-relaxed text-ink-soft">
            It costs {unlockCost} credits and you have {credits}.
          </p>
        )}
        {error && <Notice tone="stop">{error}</Notice>}
      </Tray>
    </section>
  );
}

const THEMES: { value: ColorTheme; label: string; ground: string; ink: string; dots: string[] }[] = [
  { value: "light", label: "Light", ground: "#f6f4ec", ink: "#1a1a1a", dots: ["#f4b41a", "#1aa85d", "#f2493f"] },
  { value: "dark", label: "Dark", ground: "#0f0f12", ink: "#ffffff", dots: ["#f4b41a", "#2ee59d", "#ff7887"] },
];

function Preferences() {
  const [settings, setSettings] = useStored(settingsItem);
  const [theme, setTheme] = useStored(themeItem);
  if (!settings || !theme) return null;
  const marks = settings.highlightFields;

  return (
    <section className={`rise space-y-3.5 ${stagger(4)}`}>
      <SectionTitle>Preferences</SectionTitle>
      <Tray core="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="marks-label" className="text-[14px] font-semibold">
              Mark fields on the page
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">Green: filled. Red: needs you. Yellow dashes: Alfred can draft it.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={marks}
            aria-labelledby="marks-label"
            onClick={() => void setSettings({ ...settings, highlightFields: !marks })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-500 ease-spring ${marks ? "bg-ok" : "bg-sunken ring-1 ring-line"}`}
          >
            <span
              aria-hidden
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25)] transition-transform duration-500 ease-spring ${marks ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-ink-soft">Colour theme</p>
          <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-2 gap-2">
            {THEMES.map((option) => {
              const active = resolveTheme(theme) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => void setTheme(option.value)}
                  className={`flex flex-col items-start gap-2 rounded-[var(--r-control)] p-2.5 text-left ring-1 transition-shadow ${active ? "ring-2 ring-[var(--focus)]" : "ring-line"}`}
                  style={{ background: option.ground }}
                >
                  <span aria-hidden className="flex gap-1">
                    {option.dots.map((dot) => (
                      <span key={dot} className="h-3.5 w-3.5 rounded-full" style={{ background: dot }} />
                    ))}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: option.ink }}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Tray>
    </section>
  );
}

function SignOutRow() {
  return (
    <section className="flex flex-wrap gap-2 pb-2">
      <Button size="sm" tone="quiet" icon={SignOutIcon} onClick={() => void signOut()}>
        Sign out
      </Button>
      <Button size="sm" tone="danger" onClick={() => void signOut(true)}>
        Sign out everywhere
      </Button>
    </section>
  );
}
