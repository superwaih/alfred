import { fetchCredits } from "@/lib/api";
import { useEffect, useState } from "react";
import { BriefcaseIcon, CoinsIcon, IconContext, UserCircleIcon, WalletIcon, type Icon } from "@phosphor-icons/react";
import { setupComplete } from "@/lib/setup-progress";
import { profileItem, resumeFileItem, sessionItem, setupItem, themeItem, resolveTheme } from "@/lib/storage";
import { useStored } from "@/hooks/use-stored";
import { AccountView } from "./account-view";
import { AuthScreen } from "./auth-screen";
import { SetupView } from "./setup-view";
import { Button } from "./ui";
import { ApplyView } from "./apply-view";
import { ProfileView } from "./profile-view";
import { ThemeToggle } from "./theme-toggle";

type Tab = "apply" | "profile" | "account";

const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: "apply", label: "Apply", icon: BriefcaseIcon },
  { id: "profile", label: "Profile", icon: UserCircleIcon },
  { id: "account", label: "Account", icon: WalletIcon },
];

function BowTie({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden>
      <path d="M1 2.5 L16.5 8.4 L16.5 11.6 L1 17.5 Q3.2 10 1 2.5 Z" fill="currentColor" />
      <path d="M39 2.5 L23.5 8.4 L23.5 11.6 L39 17.5 Q36.8 10 39 2.5 Z" fill="currentColor" />
      <rect x="17.2" y="6.6" width="5.6" height="6.8" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/** Applies the chosen colour theme. */
function useTheme() {
  const [theme] = useStored(themeItem);
  useEffect(() => {
    if (!theme) return;
    const resolved = resolveTheme(theme);
    document.documentElement.setAttribute("data-theme", resolved);
    if (theme !== resolved) void themeItem.setValue(resolved);
  }, [theme]);
}

/** Reminder shown in the app until setup is finished. */
function SetupBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rise flex items-center gap-3 rounded-[var(--r-card)] bg-shell p-1.5 pl-4 ring-1 ring-shell-ring">
      <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug">Add your CV so Alfred can fill forms for you.</p>
      <Button size="sm" onClick={onOpen}>
        Add CV
      </Button>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("apply");
  const [session] = useStored(sessionItem);
  const [profile] = useStored(profileItem);
  const [file] = useStored(resumeFileItem);
  const [setup] = useStored(setupItem);
  // null: decide from progress; true/false: the user opened or left setup.
  const [inSetup, setInSetup] = useState<boolean | null>(null);
  useTheme();

  // Signing out and back in starts from the progress again.
  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return;
    const refresh = () => { void fetchCredits().catch(() => undefined); };
    refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn) setInSetup(null);
  }, [signedIn]);

  if (session === undefined || profile === undefined || file === undefined || setup === undefined) {
    return <IconContext.Provider value={{ weight: "regular" }}>{null}</IconContext.Provider>;
  }

  if (!session) {
    return (
      <IconContext.Provider value={{ weight: "regular" }}>
        <div className="flow-minimal">
          <div className="absolute right-4 top-3"><ThemeToggle /></div>
          <AuthScreen />
        </div>
      </IconContext.Provider>
    );
  }

  const complete = setupComplete(setup);
  const showSetup = inSetup ?? (!complete && !setup.skipped);
  if (showSetup) {
    return (
      <IconContext.Provider value={{ weight: "regular" }}>
        <div className="flow-minimal">
          <div className="flex justify-end px-4 pt-3"><ThemeToggle /></div>
          <SetupView
          onFinish={() => {
            setInSetup(false);
            setTab("apply");
          }}
          />
        </div>
      </IconContext.Provider>
    );
  }

  const banner = complete ? null : <SetupBanner onOpen={() => setInSetup(true)} />;

  return (
    <IconContext.Provider value={{ weight: "regular" }}>
      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
            <BowTie className="h-2.5 w-auto text-accent" />
            Alfred
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {session && (
              <button
                type="button"
                onClick={() => setTab("account")}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-control)] px-2.5 text-[12px] font-medium tabular-nums text-ink-soft transition-colors duration-200 hover:bg-sunken hover:text-ink"
              >
                <CoinsIcon aria-hidden className="h-4 w-4 text-accent" />
                {session.user.credits} credits
              </button>
            )}
          </div>
        </header>

        {/* Keyed by tab so each view plays its entrance when opened. */}
        <main key={tab} className="flex-1 pb-24">
          {tab === "apply" && (
            <ApplyView
              setupBanner={banner}
              onOpenProfile={() => (complete ? setTab("profile") : setInSetup(true))}
            />
          )}
          {tab === "profile" && <ProfileView setupBanner={banner} />}
          {tab === "account" && <AccountView />}
        </main>

        <nav aria-label="Alfred" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--line)] bg-dock px-2 pb-2 pt-1.5">
          {TABS.map(({ id, label, icon: I }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(id)}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[var(--r-control)] py-1.5 text-[11px] font-semibold transition-colors duration-200 ${
                  active ? "text-accent" : "text-ink-soft hover:bg-sunken hover:text-ink"
                }`}
              >
                {active && <span aria-hidden className="absolute -top-1.5 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent" />}
                <I aria-hidden className="h-5 w-5 shrink-0" weight={active ? "fill" : "regular"} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </IconContext.Provider>
  );
}
