import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowRightIcon, EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, LockSimpleIcon, UserIcon, type Icon } from "@phosphor-icons/react";
import { forgotPassword, register, resetPassword, signIn, verifyRegistration } from "@/lib/api";
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
  const [step, setStep] = useState<"credentials" | "verify" | "forgot" | "reset">("credentials");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const creating = mode === "up";

  function backToSignIn() {
    setStep("credentials"); setMode("in"); setCode(""); setPassword(""); setError(""); setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (step === "verify") await verifyRegistration(challengeId, code);
      else if (step === "forgot") {
        setChallengeId((await forgotPassword(email)).challengeId);
        setPassword(""); setCode(""); setStep("reset");
        setMessage("If that account exists, we’ve sent a reset code. Check your inbox and spam folder.");
      } else if (step === "reset") {
        await resetPassword(challengeId, code, password);
        backToSignIn(); setMessage("Password updated. Sign in with your new password.");
      } else if (creating) {
        setChallengeId((await register(email, password, name)).challengeId);
        setStep("verify"); setCode(""); setMessage("Check your email for a six-digit code. It expires in 10 minutes.");
      } else await signIn(email, password);
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

        {step === "credentials" && <Segmented
          label="Account"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError(""); setMessage("");
          }}
          options={[
            { value: "up", label: "Create account" },
            { value: "in", label: "Sign in" },
          ]}
        />}

        {step !== "credentials" && <h1 className="serif text-[28px] text-ink">{step === "verify" ? "Verify your email" : "Reset your password"}</h1>}
        {message && <Notice>{message}</Notice>}

        <form onSubmit={submit} className="space-y-3">
          {step === "credentials" && creating && <IconField icon={UserIcon} label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          {(step === "credentials" || step === "forgot") && <IconField icon={EnvelopeSimpleIcon} label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
          {(step === "verify" || step === "reset") && <>
            <p className="text-[13px] text-ink-soft">Code sent to {email}</p>
            <IconField icon={EnvelopeSimpleIcon} label="Six-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
          </>}
          {(step === "credentials" || step === "reset") && <IconField
            icon={LockSimpleIcon}
            label={step === "reset" ? "New password" : "Password"}
            type={showPassword ? "text" : "password"}
            required
            minLength={creating || step === "reset" ? MIN_PASSWORD : 1}
            placeholder={creating ? `At least ${MIN_PASSWORD} characters` : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating || step === "reset" ? "new-password" : "current-password"}
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
          />}

          {error && <Notice tone="stop">{error}</Notice>}

          <Button type="submit" size="lg" className="w-full" trailing={ArrowRightIcon} busy={busy}>
            {step === "verify" ? "Verify and create account" : step === "forgot" ? "Send reset code" : step === "reset" ? "Set new password" : creating ? "Create account" : "Sign in"}
          </Button>
        </form>
        {step === "credentials" && !creating && <button type="button" className="text-[13px] text-ink underline underline-offset-4" onClick={() => { setStep("forgot"); setError(""); setMessage(""); }}>Forgot password?</button>}
        {step !== "credentials" && <div className="flex flex-wrap gap-4 text-[13px]">
          <button type="button" disabled={busy} className="text-ink underline underline-offset-4" onClick={backToSignIn}>Back to sign in</button>
          {(step === "verify" || step === "reset") && <button type="button" disabled={busy} className="text-ink underline underline-offset-4" onClick={async () => {
            setBusy(true); setError("");
            try {
              const next = step === "verify" ? await register(email, password, name) : await forgotPassword(email);
              setChallengeId(next.challengeId); setCode(""); setMessage("A new code has been sent. Check your inbox and spam folder.");
            } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
          }}>Resend code</button>}
        </div>}
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
