"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminApi, errorText } from "./api";
import { Notice, PrimaryButton } from "./ui";

type Step = "login" | "register" | "verify" | "forgot" | "reset";

const COPY: Record<Step, { title: string; intro: string; action: string }> = {
  login: { title: "Sign in", intro: "Administrators only. Use the account you verified by email.", action: "Sign in" },
  register: { title: "Create an account", intro: "We’ll email you a code to confirm the address. An existing admin then grants access.", action: "Send code" },
  verify: { title: "Check your email", intro: "Enter the six-digit code we just sent. It lasts 10 minutes.", action: "Verify email" },
  forgot: { title: "Reset password", intro: "We’ll email you a code to set a new one.", action: "Send code" },
  reset: { title: "Choose a new password", intro: "Enter the code from your email and a new password.", action: "Save password" },
};

export function AdminLogin({
  onSignedIn,
  connectionError,
  onRetry,
}: {
  onSignedIn: () => void;
  connectionError?: string;
  onRetry?: () => void;
}) {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const copy = COPY[step];

  function change(next: Step) {
    setStep(next);
    setCode("");
    setError("");
    setMessage("");
  }

  async function sendCode() {
    const result = await adminApi<{ challengeId: string }>(
      `/api/v1/auth/${step === "register" || step === "verify" ? "register" : "forgot-password"}`,
      { method: "POST", body: JSON.stringify({ email, password, name }) },
    );
    setChallengeId(result.challengeId);
    setCode("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (step === "login") {
        await adminApi("/api/admin/session", { method: "POST", body: JSON.stringify({ email, password }) });
        onSignedIn();
      } else if (step === "register" || step === "forgot") {
        await sendCode();
        if (step === "forgot") setPassword("");
        setStep(step === "register" ? "verify" : "reset");
        setMessage("");
      } else if (step === "verify") {
        await adminApi("/api/v1/auth/verify-email", { method: "POST", body: JSON.stringify({ challengeId, code }) });
        change("login");
        setMessage("Email verified. Sign in once an administrator has given you access.");
      } else {
        await adminApi("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ challengeId, code, password }) });
        change("login");
        setPassword("");
        setMessage("Password changed. Sign in with the new one.");
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      await sendCode();
      setMessage("New code sent. Check spam if it isn’t there in a minute.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const needsCode = step === "verify" || step === "reset";
  const needsPassword = step === "login" || step === "register" || step === "reset";

  return (
    <div className="adm-auth">
      <aside className="adm-poster" aria-hidden>
        <span className="adm-mark">
          ALFRED <span>Admin</span>
        </span>
        <div className="adm-poster-stripes">
          <span />
          <span />
          <span />
        </div>
        <div style={{ position: "relative" }}>
          <h2>
            Behind
            <br />
            the <em>desk</em>
          </h2>
          <p style={{ marginTop: 20 }}>Accounts, credits and the switches that keep Alfred running.</p>
        </div>
      </aside>

      <div className="adm-auth-side">
        <header>
          <ThemeToggle />
        </header>
        <main className="adm-auth-form adm-rise" key={step}>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>

          {connectionError && step === "login" && (
            <div style={{ marginTop: 20 }}>
              <Notice
                tone="stop"
                action={
                  onRetry && (
                    <button type="button" className="adm-link" onClick={onRetry}>
                      Try again
                    </button>
                  )
                }
              >
                {connectionError}
              </Notice>
            </div>
          )}

          <form onSubmit={submit} noValidate={false}>
            {step === "register" && (
              <label className="adm-field">
                Name
                <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
              </label>
            )}
            {!needsCode && (
              <label className="adm-field">
                Email
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" />
              </label>
            )}
            {needsCode && (
              <>
                <p className="adm-sent">
                  <EnvelopeSimpleIcon aria-hidden /> Sent to <strong>{email}</strong>
                </p>
                <label className="adm-field adm-code">
                  Code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    placeholder="······"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
              </>
            )}
            {needsPassword && (
              <label className="adm-field">
                <span style={{ display: "flex", justifyContent: "space-between" }}>
                  {step === "reset" ? "New password" : "Password"}
                  {step === "login" && (
                    <button type="button" className="adm-link" style={{ fontWeight: 400 }} onClick={() => change("forgot")}>
                      Forgot it?
                    </button>
                  )}
                </span>
                {step !== "login" && <small>At least 8 characters.</small>}
                <span className="adm-pass">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={step === "login" ? 1 : 8}
                    maxLength={200}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={step === "login" ? "current-password" : "new-password"}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeSlashIcon aria-hidden /> : <EyeIcon aria-hidden />}
                  </button>
                </span>
              </label>
            )}

            {message && <Notice>{message}</Notice>}
            {error && <Notice tone="stop">{error}</Notice>}

            <PrimaryButton busy={busy}>{copy.action}</PrimaryButton>
          </form>

          <div className="adm-auth-links">
            {step === "login" ? (
              <>
                <span className="soft">
                  New here?{" "}
                  <button type="button" className="adm-link" onClick={() => change("register")}>
                    Create an account
                  </button>
                </span>
                <Link href="/" className="adm-link">
                  Back to the site
                </Link>
              </>
            ) : (
              <>
                <button type="button" className="adm-link" onClick={() => change("login")}>
                  Back to sign in
                </button>
                {needsCode && (
                  <button type="button" className="adm-link" disabled={busy} onClick={() => void resend()}>
                    Send a new code
                  </button>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
