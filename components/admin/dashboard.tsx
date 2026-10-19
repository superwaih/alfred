"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  BrainIcon,
  CheckIcon,
  CoinsIcon,
  CreditCardIcon,
  EnvelopeSimpleIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PulseIcon,
  ShoppingBagIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SquaresFourIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { AdminSnapshot, AdminUser, AppSettings } from "@/shared/admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminApiError, adminApi, errorText } from "./api";
import { AdminLogin } from "./login";
import {
  ActivityFeed,
  ago,
  Avatar,
  ConfirmButton,
  formatDate,
  formatNumber,
  Notice,
  PrimaryButton,
  SpinnerIcon,
  TASK_LABELS,
  TimeAgo,
} from "./ui";

type Tab = "overview" | "users" | "activity" | "settings";

const TABS: { id: Tab; label: string; icon: Icon; title: string; intro: string }[] = [
  { id: "overview", label: "Overview", icon: SquaresFourIcon, title: "Overview", intro: "Who’s using Alfred, what it’s costing, and whether everything is switched on." },
  { id: "users", label: "Users", icon: UsersThreeIcon, title: "Users", intro: "Find an account to adjust credits, end sessions, change roles or suspend access." },
  { id: "activity", label: "Activity", icon: PulseIcon, title: "Activity", intro: "Sign-ins, AI tasks and admin changes, with every credit movement beside them." },
  { id: "settings", label: "Settings", icon: SlidersHorizontalIcon, title: "Settings", intro: "Prices and switches for the whole app. New requests pick up changes straight away." },
];

export function AdminDashboard() {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, tick] = useState(0);

  const load = useCallback(() => {
    return adminApi<AdminSnapshot>("/api/admin/overview")
      .then((data) => {
        setSnapshot(data);
        setError("");
        setLoadedAt(new Date().toISOString());
      })
      .catch((err) => {
        if (err instanceof AdminApiError && (err.status === 401 || err.status === 403)) setSnapshot(null);
        else setError(errorText(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  // Keeps "Updated 2 minutes ago" honest.
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  async function signOut() {
    try {
      await adminApi("/api/admin/session", { method: "DELETE" });
      setSnapshot(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (!snapshot) {
    if (loading && !error) {
      return (
        <div className="adm">
          <p className="adm-loading" role="status">
            <span style={{ display: "grid", justifyItems: "center" }}>
              <SpinnerIcon />
              Opening administration
            </span>
          </p>
        </div>
      );
    }
    return (
      <div className="adm">
        <AdminLogin
          onSignedIn={refresh}
          connectionError={error}
          onRetry={refresh}
        />
      </div>
    );
  }

  const current = TABS.find((item) => item.id === tab) ?? TABS[0];

  return (
    <div className="adm">
      <a className="adm-skip" href="#adm-main">
        Skip to content
      </a>
      <header className="adm-top">
        <div className="adm-frame adm-top-row">
          <Link href="/" className="adm-mark" aria-label="Alfred home">
            ALFRED <span>Admin</span>
          </Link>
          <nav className="adm-nav" aria-label="Administration">
            {TABS.map(({ id, label, icon: IconFor }) => (
              <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
                <IconFor aria-hidden weight={tab === id ? "fill" : "regular"} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="adm-top-end">
            <ThemeToggle />
            <div className="adm-who">
              <span className="adm-who-text">
                <strong>{snapshot.viewer.name || "Administrator"}</strong>
                <span>{snapshot.viewer.email}</span>
              </span>
              <Avatar name={snapshot.viewer.name} email={snapshot.viewer.email} size="sm" />
              <button type="button" className="adm-icon-btn" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
                <SignOutIcon aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="adm-main" className="adm-frame adm-main">
        <div className="adm-head adm-rise" key={tab}>
          <div>
            <h1>{current.title}</h1>
            <p>{current.intro}</p>
          </div>
          <div className="adm-head-side">
            {loadedAt && <span className="adm-stamp">Updated {ago(loadedAt)}</span>}
            <button type="button" className="adm-btn" disabled={loading} onClick={refresh}>
              <ArrowsClockwiseIcon aria-hidden className={loading ? "adm-spin" : ""} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 24 }}>
            <Notice tone="stop">{error}</Notice>
          </div>
        )}

        {tab === "overview" && <Overview data={snapshot} onOpen={setTab} />}
        {tab === "users" && <Users viewer={snapshot.viewer} onChanged={() => void load()} />}
        {tab === "activity" && <Activity data={snapshot} />}
        {tab === "settings" && <Settings initial={snapshot.settings} onSaved={(settings) => setSnapshot({ ...snapshot, settings })} />}

        <footer className="adm-foot">
          <LockSimpleIcon aria-hidden />
          <p>CVs, saved profiles and personal API keys stay in each user’s browser. This page only sees what passes through Alfred’s server.</p>
        </footer>
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ data, onOpen }: { data: AdminSnapshot; onOpen: (tab: Tab) => void }) {
  const m = data.metrics;
  const verifiedShare = m.users ? Math.round((m.verified / m.users) * 100) : 0;
  const services: { key: keyof AdminSnapshot["services"]; label: string; icon: Icon }[] = [
    { key: "email", label: "Email (Resend)", icon: EnvelopeSimpleIcon },
    { key: "ai", label: "AI (DeepSeek)", icon: BrainIcon },
    { key: "payments", label: "Payments (Polar)", icon: CreditCardIcon },
  ];

  return (
    <>
      <section className="adm-bento" aria-label="Key numbers">
        <article className="adm-tile danfo adm-rise" style={{ ["--i" as string]: 1 }}>
          <div className="adm-tile-label">
            Accounts <UsersThreeIcon aria-hidden weight="bold" />
          </div>
          <strong>{formatNumber(m.users)}</strong>
          <div className="adm-meter">
            <div className="adm-tile-label">
              <span>{formatNumber(m.verified)} verified their email</span>
              <span className="num">{verifiedShare}%</span>
            </div>
            <div className="adm-meter-bar" role="img" aria-label={`${verifiedShare}% of accounts verified`}>
              <span style={{ width: `${verifiedShare}%` }} />
            </div>
          </div>
        </article>
        <article className="adm-tile naija adm-rise" style={{ ["--i" as string]: 2 }}>
          <div className="adm-tile-label">
            AI tasks today <SparkleIcon aria-hidden weight="bold" />
          </div>
          <strong>{formatNumber(m.tasksToday)}</strong>
          <p className="adm-tile-note">
            {m.failuresToday ? `${formatNumber(m.failuresToday)} failed and were refunded` : "None failed"} · since midnight UTC
          </p>
        </article>
        <article className="adm-tile coral adm-rise" style={{ ["--i" as string]: 3 }}>
          <div className="adm-tile-label">
            Credits held <CoinsIcon aria-hidden weight="bold" />
          </div>
          <strong>{formatNumber(m.credits)}</strong>
          <p className="adm-tile-note">Unspent, across every balance</p>
        </article>
        <article className="adm-tile paper adm-rise" style={{ ["--i" as string]: 4 }}>
          <div className="adm-tile-label">
            Credits sold <ShoppingBagIcon aria-hidden weight="bold" />
          </div>
          <strong>{formatNumber(m.purchasedCredits)}</strong>
          <p className="adm-tile-note">All-time purchases</p>
        </article>
      </section>

      <div className="adm-pair adm-rise" style={{ ["--i" as string]: 5, marginBottom: 28 }}>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Switches</h2>
            <button type="button" className="adm-link" onClick={() => onOpen("settings")}>
              Change
            </button>
          </div>
          <dl className="adm-rows">
            <div className="adm-row">
              <dt>
                <UserPlusIcon aria-hidden /> New sign-ups
              </dt>
              <dd>
                <span className={`adm-pill ${data.settings.registrationsOpen ? "ok" : "warn"}`}>{data.settings.registrationsOpen ? "Open" : "Paused"}</span>
              </dd>
            </div>
            <div className="adm-row">
              <dt>
                <SparkleIcon aria-hidden /> Alfred AI on credits
              </dt>
              <dd>
                <span className={`adm-pill ${data.settings.aiEnabled ? "ok" : "warn"}`}>{data.settings.aiEnabled ? "On" : "Paused"}</span>
              </dd>
            </div>
            <div className="adm-row">
              <dt>
                <WarningCircleIcon aria-hidden /> Suspended accounts
              </dt>
              <dd>
                <button type="button" className="adm-link num" onClick={() => onOpen("users")}>
                  {formatNumber(m.suspended)}
                </button>
              </dd>
            </div>
          </dl>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Services</h2>
            <p>Keys are set on the server</p>
          </div>
          <dl className="adm-rows">
            {services.map(({ key, label, icon: IconFor }) => (
              <div className="adm-row" key={key}>
                <dt>
                  <IconFor aria-hidden /> {label}
                </dt>
                <dd>
                  <span className={`adm-pill ${data.services[key] ? "ok" : "warn"}`}>{data.services[key] ? "Connected" : "Not set up"}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="adm-card adm-rise" style={{ ["--i" as string]: 6 }}>
        <div className="adm-card-head">
          <h2>Latest activity</h2>
          <button type="button" className="adm-link" onClick={() => onOpen("activity")}>
            See all
          </button>
        </div>
        <ActivityFeed events={data.activity.slice(0, 8)} />
      </section>
    </>
  );
}

/* ---------------- Users ---------------- */

type UserPage = { users: AdminUser[]; total: number; page: number; pages: number };
type Status = "all" | "active" | "suspended";

function Users({ viewer, onChanged }: { viewer: AdminUser; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserPage | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const requestKey = `${search}|${status}|${page}|${revision}`;
  const [doneKey, setDoneKey] = useState("");
  const loading = doneKey !== requestKey;

  // Search as you type, after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const abort = new AbortController();
    adminApi<UserPage>(`/api/admin/users?q=${encodeURIComponent(search)}&status=${status}&page=${page}`, { signal: abort.signal })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((err) => {
        if (!abort.signal.aborted) setError(errorText(err));
      })
      .finally(() => {
        if (!abort.signal.aborted) setDoneKey(requestKey);
      });
    return () => abort.abort();
  }, [search, status, page, revision, requestKey]);

  return (
    <>
      <form
        className="adm-toolbar adm-rise"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
          setPage(1);
          setRevision((v) => v + 1);
        }}
      >
        <label className="adm-search">
          <span className="sr-only">Search users</span>
          <MagnifyingGlassIcon aria-hidden />
          <input type="search" placeholder="Search by name or email" maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="adm-seg" role="group" aria-label="Filter by status">
          {(["all", "active", "suspended"] as Status[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {value === "all" ? "Everyone" : value === "active" ? "Active" : "Suspended"}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="stop">{error}</Notice>
        </div>
      )}

      <section className="adm-card adm-rise" style={{ ["--i" as string]: 1 }} aria-busy={loading}>
        <div className="adm-card-head">
          <h2>{data ? `${formatNumber(data.total)} ${data.total === 1 ? "account" : "accounts"}` : "Accounts"}</h2>
          {loading && (
            <p role="status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SpinnerIcon /> Loading
            </p>
          )}
        </div>
        <div className="adm-scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Access</th>
                <th className="end">Credits</th>
                <th>Last sign-in</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {!data &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    <td>
                      <div className="adm-person">
                        <span className="adm-avatar adm-skel" />
                        <span style={{ display: "grid", gap: 6, flex: 1 }}>
                          <span className="adm-skel" style={{ width: "50%" }} />
                          <span className="adm-skel" style={{ width: "75%" }} />
                        </span>
                      </div>
                    </td>
                    <td><span className="adm-skel" style={{ width: 70 }} /></td>
                    <td><span className="adm-skel" style={{ width: 30, marginLeft: "auto" }} /></td>
                    <td><span className="adm-skel" style={{ width: 80 }} /></td>
                    <td><span className="adm-skel" style={{ width: 80 }} /></td>
                  </tr>
                ))}
              {data?.users.map((user) => (
                <tr
                  key={user.id}
                  className="clickable"
                  onClick={() => setSelected(user)}
                >
                  <td>
                    <div className="adm-person">
                      <Avatar name={user.name} email={user.email} />
                      <span className="adm-person-text">
                        <button
                          type="button"
                          className="adm-link"
                          style={{ textAlign: "left", textDecoration: "none" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(user);
                          }}
                        >
                          {user.name || "No name given"}
                        </button>
                        <span>{user.email}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <AccessPills user={user} />
                  </td>
                  <td className="end num">{formatNumber(user.credits)}</td>
                  <td className="soft">{user.lastLoginAt ? <TimeAgo value={user.lastLoginAt} /> : "Never"}</td>
                  <td className="soft">{new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.users.length === 0 && (
          <div className="adm-empty">
            <MagnifyingGlassIcon aria-hidden />
            <strong>No accounts match</strong>
            {search ? `Nothing for “${search}”. Check the spelling or search by email.` : "Try another filter."}
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="adm-pager">
            <span className="num">
              Page {page} of {data.pages}
            </span>
            <div>
              <button type="button" className="adm-btn sm" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>
                <ArrowLeftIcon aria-hidden /> Previous
              </button>
              <button type="button" className="adm-btn sm" disabled={loading || page >= data.pages} onClick={() => setPage(page + 1)}>
                Next <ArrowRightIcon aria-hidden />
              </button>
            </div>
          </div>
        )}
      </section>

      {selected && (
        <UserDrawer
          key={selected.id}
          user={selected}
          viewer={viewer}
          onClose={() => setSelected(null)}
          onChanged={(user) => {
            setSelected(user);
            setRevision((v) => v + 1);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function AccessPills({ user }: { user: AdminUser }) {
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {user.suspended ? (
        <span className="adm-pill stop">Suspended</span>
      ) : user.owner ? (
        <span className="adm-pill admin plain">Owner</span>
      ) : user.role === "admin" ? (
        <span className="adm-pill admin plain">Admin</span>
      ) : (
        <span className="adm-pill ok">Active</span>
      )}
      {!user.emailVerified && <span className="adm-pill warn">Unverified</span>}
    </span>
  );
}

const QUICK_AMOUNTS = [5, 10, 25, 50];

function UserDrawer({
  user,
  viewer,
  onClose,
  onChanged,
}: {
  user: AdminUser;
  viewer: AdminUser;
  onClose: () => void;
  onChanged: (user: AdminUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [armed, setArmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const closeRef = useRef<HTMLButtonElement>(null);
  const protectedUser = user.owner || user.id === viewer.id;
  const amount = Number(delta) || 0;
  const nextBalance = user.credits + amount;

  const closeLatest = useRef(onClose);
  useEffect(() => {
    closeLatest.current = onClose;
  });

  // Focus the drawer, close on Escape, and keep the page behind it still.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLatest.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  function edit(next: () => void) {
    next();
    setArmed(false);
    setRequestId(crypto.randomUUID());
  }

  async function act(body: object, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await adminApi<{ user: AdminUser }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ id: user.id, ...body }),
      });
      onChanged(result.user);
      setMessage(done);
      setDelta("");
      setNote("");
      setArmed(false);
      setRequestId(crypto.randomUUID());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function submitCredits(event: FormEvent) {
    event.preventDefault();
    if (!armed) {
      setArmed(true);
      return;
    }
    void act({ action: "credits", delta: amount, note, requestId }, `Balance is now ${formatNumber(nextBalance)} credits. Logged in activity.`);
  }

  return (
    <>
      <div className="adm-scrim" onClick={onClose} aria-hidden />
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
        <div className="adm-drawer-head">
          <Avatar name={user.name} email={user.email} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h2 id="adm-drawer-title">{user.name || "No name given"}</h2>
            <p>{user.email}</p>
            <div className="adm-drawer-pills">
              <AccessPills user={user} />
            </div>
          </div>
          <button ref={closeRef} type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden />
          </button>
        </div>

        <section>
          <div className="adm-facts">
            <div className="adm-fact">
              <span>Balance</span>
              <strong className="num">{formatNumber(user.credits)} credits</strong>
            </div>
            <div className="adm-fact">
              <span>Own API key</span>
              <strong>{user.ownKeyUnlocked ? "Unlocked" : "Locked"}</strong>
            </div>
            <div className="adm-fact">
              <span>Last sign-in</span>
              <strong>{user.lastLoginAt ? ago(user.lastLoginAt) : "Never"}</strong>
            </div>
            <div className="adm-fact">
              <span>Joined</span>
              <strong>{formatDate(user.createdAt).split(",")[0]}</strong>
            </div>
          </div>
        </section>

        {(message || error) && (
          <section style={{ paddingBottom: 0, borderTop: 0 }}>
            {message && <Notice>{message}</Notice>}
            {error && <Notice tone="stop">{error}</Notice>}
          </section>
        )}

        <section>
          <h3>Adjust credits</h3>
          <form onSubmit={submitCredits} style={{ display: "grid", gap: 14 }}>
            <div className="adm-chips" role="group" aria-label="Quick amounts">
              {QUICK_AMOUNTS.map((value) => (
                <button key={value} type="button" aria-pressed={amount === value} onClick={() => edit(() => setDelta(String(value)))}>
                  +{value}
                </button>
              ))}
              {user.credits > 0 && (
                <button type="button" aria-pressed={amount === -user.credits} onClick={() => edit(() => setDelta(String(-user.credits)))}>
                  Clear balance
                </button>
              )}
            </div>
            <label className="adm-field">
              Amount
              <small>Use a minus sign to take credits away.</small>
              <span className="adm-suffix">
                <input
                  type="number"
                  required
                  min={-user.credits}
                  max={100000}
                  step={1}
                  value={delta}
                  placeholder="0"
                  onChange={(e) => edit(() => setDelta(e.target.value))}
                />
                <span>credits</span>
              </span>
            </label>
            <label className="adm-field">
              Reason
              <small>Saved with the change, so the history makes sense later.</small>
              <input
                required
                minLength={5}
                maxLength={300}
                value={note}
                placeholder="e.g. Refund for a failed cover letter"
                onChange={(e) => edit(() => setNote(e.target.value))}
              />
            </label>
            {amount !== 0 && (
              <div className="adm-preview">
                <span className="soft">
                  {formatNumber(user.credits)} {amount > 0 ? "+" : "−"} {formatNumber(Math.abs(amount))}
                </span>
                <strong className="num" style={{ color: nextBalance < 0 ? "var(--adm-stop)" : undefined }}>
                  {formatNumber(nextBalance)} credits
                </strong>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PrimaryButton busy={busy} disabled={!amount || nextBalance < 0 || note.trim().length < 5} icon={armed ? CheckIcon : ArrowRightIcon}>
                {armed ? `Confirm ${amount > 0 ? "+" : ""}${formatNumber(amount)} credits` : "Review change"}
              </PrimaryButton>
              {armed && (
                <button type="button" className="adm-btn" onClick={() => setArmed(false)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h3>Account</h3>
          <div className="adm-actions">
            <div className="adm-action">
              <div>
                <strong>Sign out everywhere</strong>
                <p>Ends every session. They can sign straight back in.</p>
              </div>
              <ConfirmButton label="Sign out" confirmLabel="Sign out all" disabled={busy} onConfirm={() => void act({ action: "revoke" }, "Signed out of every device.")} />
            </div>
            <div className="adm-action">
              <div>
                <strong>{user.role === "admin" ? "Admin access" : "Make admin"}</strong>
                <p>
                  {protectedUser
                    ? "You can’t change your own role or the owner’s."
                    : user.role === "admin"
                      ? "They can open this page and manage everyone."
                      : user.emailVerified
                        ? "Lets them open this page and manage everyone."
                        : "They need to verify their email first."}
                </p>
              </div>
              <ConfirmButton
                label={user.role === "admin" ? "Remove" : "Make admin"}
                confirmLabel={user.role === "admin" ? "Remove admin" : "Grant admin"}
                danger={user.role === "admin"}
                disabled={busy || protectedUser || (!user.emailVerified && user.role !== "admin")}
                onConfirm={() =>
                  void act(
                    { action: "role", role: user.role === "admin" ? "user" : "admin" },
                    user.role === "admin" ? "Admin access removed." : "Now an administrator.",
                  )
                }
              />
            </div>
            <div className="adm-action">
              <div>
                <strong>{user.suspended ? "Suspended" : "Suspend account"}</strong>
                <p>
                  {protectedUser
                    ? "You can’t suspend yourself or the owner."
                    : user.suspended
                      ? "They can’t sign in until you restore them."
                      : "Signs them out and blocks sign-in. Their credits stay put."}
                </p>
              </div>
              <ConfirmButton
                label={user.suspended ? "Restore" : "Suspend"}
                confirmLabel={user.suspended ? "Restore access" : "Suspend now"}
                danger={!user.suspended}
                disabled={busy || protectedUser}
                onConfirm={() =>
                  void act({ action: "suspend", suspended: !user.suspended }, user.suspended ? "Access restored." : "Account suspended and signed out.")
                }
              />
            </div>
          </div>
        </section>
      </aside>
    </>
  );
}

/* ---------------- Activity ---------------- */

const LEDGER_LABELS: Record<string, string> = {
  starter: "Welcome credits",
  purchase: "Bought credits",
  task: "AI task",
  refund: "Refund",
  unlock: "Own-key unlock",
  admin: "Admin adjustment",
};

function Activity({ data }: { data: AdminSnapshot }) {
  return (
    <div className="adm-pair" style={{ alignItems: "start" }}>
      <section className="adm-card adm-rise">
        <div className="adm-card-head">
          <h2>Events</h2>
          <p>Latest 50</p>
        </div>
        <ActivityFeed events={data.activity} />
      </section>
      <section className="adm-card adm-rise" style={{ ["--i" as string]: 1 }}>
        <div className="adm-card-head">
          <h2>Credit movements</h2>
          <p>Latest 50</p>
        </div>
        {data.ledger.length ? (
          <div className="adm-scroll">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>What</th>
                  <th className="end">Change</th>
                  <th className="end">When</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((row) => (
                  <tr key={row.id}>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.email}</td>
                    <td>
                      {LEDGER_LABELS[row.reason] ?? row.reason}
                      {row.task && <span className="soft"> · {TASK_LABELS[row.task] ?? row.task}</span>}
                    </td>
                    <td className={`end adm-delta ${row.delta > 0 ? "up" : row.delta < 0 ? "down" : ""}`}>
                      {row.delta > 0 ? "+" : row.delta < 0 ? "−" : ""}
                      {formatNumber(Math.abs(row.delta))}
                    </td>
                    <td className="end soft" style={{ whiteSpace: "nowrap" }}>
                      <TimeAgo value={row.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-empty">
            <CoinsIcon aria-hidden />
            <strong>No credit movements yet</strong>
            Starter credits, purchases and AI tasks will appear here.
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function Settings({ initial, onSaved }: { initial: AppSettings; onSaved: (settings: AppSettings) => void }) {
  const [saved, setSaved] = useState(initial);
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminApi("/api/admin/settings", { method: "POST", body: JSON.stringify(settings) });
      setSaved(settings);
      onSaved(settings);
      setMessage("Saved. New requests use these values.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (key: "registrationsOpen" | "aiEnabled") => {
    setMessage("");
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const numberField = (label: string, value: number, max: number, onChange: (value: number) => void, hint?: string) => (
    <label className="adm-field" key={label}>
      {label}
      {hint && <small>{hint}</small>}
      <span className="adm-suffix">
        <input
          type="number"
          required
          min={0}
          max={max}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => {
            setMessage("");
            onChange(e.target.value === "" ? NaN : Number(e.target.value));
          }}
        />
        <span>credits</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={save} className="adm-stack" style={{ maxWidth: 880 }}>
      {message && <Notice>{message}</Notice>}
      {error && <Notice tone="stop">{error}</Notice>}

      <section className="adm-card adm-rise">
        <div className="adm-card-head">
          <h2>Access</h2>
        </div>
        <div className="adm-setting">
          <div>
            <strong id="set-reg">New sign-ups</strong>
            <p>When paused, nobody new can create an account. Existing users still sign in.</p>
          </div>
          <button type="button" role="switch" className="adm-switch" aria-checked={settings.registrationsOpen} aria-labelledby="set-reg" onClick={() => toggle("registrationsOpen")} />
        </div>
        <div className="adm-setting">
          <div>
            <strong id="set-ai">Alfred AI on credits</strong>
            <p>Pauses AI paid for with credits. Form filling and personal API keys keep working.</p>
          </div>
          <button type="button" role="switch" className="adm-switch" aria-checked={settings.aiEnabled} aria-labelledby="set-ai" onClick={() => toggle("aiEnabled")} />
        </div>
      </section>

      <section className="adm-card adm-rise" style={{ ["--i" as string]: 1 }}>
        <div className="adm-card-head">
          <h2>Credits</h2>
        </div>
        <div className="adm-cost-grid" style={{ marginBottom: 22 }}>
          {numberField("Welcome credits", settings.starterCredits, 10000, (v) => setSettings({ ...settings, starterCredits: v }), "For new accounts only")}
          {numberField("Own API key unlock", settings.ownKeyUnlockCost, 1000, (v) => setSettings({ ...settings, ownKeyUnlockCost: v }), "Paid once per account")}
        </div>
        <h3 style={{ fontSize: 13, fontWeight: 900, marginBottom: 14 }}>Price per AI task</h3>
        <div className="adm-cost-grid">
          {Object.entries(settings.taskCosts).map(([task, cost]) =>
            numberField(TASK_LABELS[task] ?? task, cost, 1000, (v) => setSettings({ ...settings, taskCosts: { ...settings.taskCosts, [task]: v } })),
          )}
        </div>
        <p className="soft" style={{ fontSize: 12, marginTop: 18, maxWidth: "64ch" }}>
          Each account’s first CV import is always free. Credit pack prices live in Polar.
        </p>
      </section>

      {dirty && (
        <div className="adm-savebar" role="region" aria-label="Unsaved changes">
          <p>You have unsaved changes</p>
          <div>
            <button type="button" className="adm-btn" onClick={() => setSettings(saved)} disabled={busy}>
              Discard
            </button>
            <PrimaryButton busy={busy}>Save settings</PrimaryButton>
          </div>
        </div>
      )}
    </form>
  );
}
