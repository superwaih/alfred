import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowRightIcon, EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon, UserIcon, type Icon } from "@phosphor-icons/react";
import { register, signIn } from "@/lib/api";
import { Segmented } from "./account-view";
import { Button, controlClass, errorMessage, Notice } from "./ui";

function BowTie({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden>
      <path d="M1 2.5 L16.5 8.4 L16.5 11.6 L1 17.5 Q3.2 10 1 2.5 Z" fill="currentColor" />
      <path d="M39 2.5 L23.5 8.4 L23.5 11.6 L39 17.5 Q36.8 10 39 2.5 Z" fill="currentColor" />
      <rect x="17.2" y="6.6" width="5.6" height="6.8" rx="1.2" fill="currentColor" />
    </svg>
  );
}

const MIN_PASSWORD = 8;

/** Create an account or sign in: the fields and nothing else. */
export function AuthScreen() {
  const [mode, setMode] = useState<"up" | "in">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creating = mode === "up";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (creating) await register(email, password, name);
      else await signIn(email, password);
      // The session item updates and the app moves on to setup by itself.
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="rise mx-auto w-full max-w-[360px] space-y-5">
        <span aria-label="Alfred" role="img" className="mx-auto grid h-10 w-10 place-items-center rounded-[10px] bg-accent-soft text-accent">
          <BowTie className="h-2.5 w-auto" />
        </span>

        <Segmented
          label="Account"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError("");
          }}
          options={[
            { value: "up", label: "Create account" },
            { value: "in", label: "Sign in" },
          ]}
        />

        <form onSubmit={submit} className="space-y-3">
          {creating && <IconField icon={UserIcon} label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          <IconField icon={EnvelopeSimpleIcon} label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <IconField
            icon={LockSimpleIcon}
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            minLength={creating ? MIN_PASSWORD : 1}
            placeholder={creating ? `At least ${MIN_PASSWORD} characters` : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating ? "new-password" : "current-password"}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                className="grid h-8 w-8 place-items-center rounded-[6px] text-ink-faint transition-colors duration-200 hover:bg-sunken hover:text-ink"
              >
                {showPassword ? <EyeSlashIcon aria-hidden className="h-4 w-4" /> : <EyeIcon aria-hidden className="h-4 w-4" />}
              </button>
            }
          />

          {error && <Notice tone="stop">{error}</Notice>}

          <Button type="submit" size="lg" className="w-full" trailing={ArrowRightIcon} busy={busy}>
            {creating ? "Create account" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/** A labelled input with a leading icon and an optional trailing control. */
function IconField({ icon: I, label, trailing, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon: Icon; label: string; trailing?: ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <I aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input id={id} placeholder={label} className={`${controlClass} h-11 pl-9 ${trailing ? "pr-11" : ""}`} {...rest} />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}
