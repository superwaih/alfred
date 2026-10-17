import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowsClockwiseIcon,
  BrowserIcon,
  CheckCircleIcon,
  CrosshairIcon,
  PenNibIcon,
  PaperclipIcon,
  TextboxIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { browser } from "wxt/browser";
import { coverLetterAsText } from "@shared/ai";
import type { FieldReport, PageChanged, PageReport } from "@/lib/messages";
import { runAi } from "@/lib/ai";
import { profileReady, profileTextFor } from "@/lib/profile-text";
import { profileItem, resumeFileItem } from "@/lib/storage";
import { attachCvOnPage, fillActivePage, focusFieldOnPage, PageUnavailable, scanActivePage, setFieldOnPage, type ActivePage } from "@/lib/tab";
import { useCostLabel } from "@/hooks/use-cost-label";
import { useStored } from "@/hooks/use-stored";
import { TailorCard } from "./tailor-card";
import { Button, controlClass, errorMessage, Eyebrow, IconButton, Notice, SectionTitle, Skeleton, stagger, Tray, ViewTitle } from "./ui";

const SITE_NAMES: Record<PageReport["site"], string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  generic: "this site",
};

type Props = { onOpenProfile: () => void; onOpenDocuments: () => void; setupBanner?: ReactNode };

export function ApplyView({ onOpenProfile, onOpenDocuments, setupBanner }: Props) {
  const [profile] = useStored(profileItem);
  const [resume] = useStored(resumeFileItem);
  const [page, setPage] = useState<ActivePage | null>(null);
  const [error, setError] = useState("");
  const [guidance, setGuidance] = useState("");
  const [scanning, setScanning] = useState(true);
  const [filling, setFilling] = useState(false);
  const [filledOnce, setFilledOnce] = useState(false);
  const pageRef = useRef<ActivePage | null>(null);
  pageRef.current = page;

  const rescan = useCallback(async () => {
    setScanning(true);
    try {
      const next = await scanActivePage();
      setPage(next);
      setError("");
      setGuidance("");
    } catch (err) {
      setPage(null);
      if (err instanceof PageUnavailable) {
        setGuidance(err.message);
        setError("");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setScanning(false);
    }
  }, []);

  // Rescan when the user switches tabs, a page loads, or a multi-step form moves on.
  useEffect(() => {
    void rescan();
    const onActivated = () => {
      setFilledOnce(false);
      void rescan();
    };
    const onUpdated = (_id: number, info: { status?: string }) => {
      if (info.status === "complete") void rescan();
    };
    const onMessage = (message: PageChanged) => {
      if (message?.type === "alfred:page-changed") void rescan();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.runtime.onMessage.addListener(onMessage);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, [rescan]);

  async function fill() {
    if (!page) return;
    setFilling(true);
    try {
      const report = await fillActivePage(page);
      setPage({ ...page, report });
      setFilledOnce(true);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFilling(false);
    }
  }

  async function attachTo(field: FieldReport): Promise<boolean> {
    const current = pageRef.current;
    if (!current) return false;
    const report = await attachCvOnPage(current, field.id);
    if (report) setPage({ ...current, report });
    return Boolean(report);
  }

  async function putValue(field: FieldReport, value: string): Promise<boolean> {
    const current = pageRef.current;
    if (!current) return false;
    const report = await setFieldOnPage(current, field.id, value);
    if (report) setPage({ ...current, report });
    return Boolean(report?.fields.find((candidate) => candidate.id === field.id && candidate.status === "filled"));
  }

  const groups = useMemo(() => {
    const fields = page?.report.fields ?? [];
    return {
      needsYou: fields.filter((field) => field.status === "needs-you" || field.status === "unsupported"),
      drafts: fields.filter((field) => field.status === "draftable"),
      done: fields.filter((field) => field.status === "filled" || field.status === "attached"),
      kept: fields.filter((field) => field.status === "kept"),
      other: fields.filter((field) => field.status === "empty" && field.kind !== "custom"),
    };
  }, [page]);

  if (!profile) return null;

  if (!profileReady(profile)) {
    return (
      <div className="space-y-6 px-5 pt-6">
        {setupBanner}
        <ViewTitle
          eyebrow={<Eyebrow>Welcome</Eyebrow>}
          title="Tell Alfred about you, once."
          sub="Upload your CV and Alfred sets up your profile in seconds. You check it once; every application after that starts from it."
        />
        <div className={`rise ${stagger(2)}`}>
          <Button size="lg" trailing onClick={onOpenProfile}>
            Continue setup
          </Button>
        </div>
      </div>
    );
  }

  const report = page?.report;
  const total = report?.fields.filter((field) => field.kind !== "custom").length ?? 0;

  return (
    <div className="space-y-7 px-5 pt-6">
      {setupBanner}
      {report?.job.title ? (
        <ViewTitle
          eyebrow={
            <Eyebrow tone={report.isApplication ? "ok" : "plain"}>
              {report.isApplication ? `${SITE_NAMES[report.site]} · Application` : "Job page"}
            </Eyebrow>
          }
          title={report.job.title}
          sub={report.job.company || undefined}
        />
      ) : (
        !scanning && <ViewTitle eyebrow={<Eyebrow>This page</Eyebrow>} title="Nothing to fill here yet." />
      )}

      {scanning && !page && !error && !guidance && <LoadingTray />}
      {error && <Notice tone="stop">{error}</Notice>}
      {guidance && (
        <>
          <Notice>{guidance}</Notice>
          <HowToUse />
        </>
      )}

      {report && !report.isApplication && (
        <Notice>
          This page doesn’t look like an application form. Open the job’s “Apply” page and Alfred will read it. You can still
          prepare a CV and cover letter for this job in{" "}
          <button type="button" className="font-semibold text-ink underline decoration-1 underline-offset-2" onClick={onOpenDocuments}>
            Documents
          </button>
          .
        </Notice>
      )}
      {page && report && !report.isApplication && report.job.title && (
        <TailorCard page={page} onReport={(next) => setPage({ ...page, report: { ...next, job: page.report.job } })} onOpenDocuments={onOpenDocuments} />
      )}

      {report?.isApplication && !filledOnce && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1.25fr_1fr] gap-2">
            <BentoTile tone="accent" className={`row-span-2 ${stagger(1)}`}>
              <p className="text-[12px] font-semibold opacity-80">Questions found</p>
              <p className="mt-auto serif text-[40px] leading-none tabular-nums">{total}</p>
              <p className="mt-1 text-[12px] text-ink-faint">Alfred fills what your profile answers.</p>
            </BentoTile>
            <BentoTile className={stagger(2)}>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
                <PaperclipIcon aria-hidden className="h-4 w-4" /> CV file
              </p>
              <p className={`mt-1 truncate text-[13px] font-semibold ${resume ? "text-ok" : "text-warn"}`}>
                {resume ? "Ready to attach" : "Not added yet"}
              </p>
            </BentoTile>
            <BentoTile className={stagger(3)}>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
                <UserCircleIcon aria-hidden className="h-4 w-4" /> Profile
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold text-ok">{profile.personal.firstName} {profile.personal.lastName}</p>
            </BentoTile>
          </div>

          <div className={`rise flex items-center gap-2 ${stagger(4)}`}>
            <Button size="lg" className="flex-1" icon={TextboxIcon} trailing onClick={fill} busy={filling}>
              Fill this application
            </Button>
            <IconButton icon={ArrowsClockwiseIcon} label="Read the page again" onClick={() => void rescan()} className="h-12 w-12" />
          </div>
          <p className={`rise text-[12px] leading-relaxed text-ink-faint ${stagger(5)}`}>
            Alfred leaves anything you’ve already typed alone, won’t guess salary or visa questions, and never presses Submit.
          </p>

          <TailorCard page={page!} onReport={(next) => setPage({ ...page!, report: { ...next, job: page!.report.job } })} onOpenDocuments={onOpenDocuments} />

          {!resume && report.fields.some((field) => field.key === "resume") && (
            <Notice tone="warn">
              This form asks for a CV. Add your CV file in{" "}
              <button type="button" className="font-semibold text-ink underline decoration-1 underline-offset-2" onClick={onOpenProfile}>
                Profile
              </button>{" "}
              and Alfred will attach it.
            </Notice>
          )}
        </div>
      )}

      {filledOnce && page && report && (
        <>
          <Summary done={groups.done.length} needsYou={groups.needsYou.length} drafts={groups.drafts.length} total={total} />

          <TailorCard page={page} onReport={(next) => setPage({ ...page, report: { ...next, job: page.report.job } })} onOpenDocuments={onOpenDocuments} />

          {groups.needsYou.length > 0 && (
            <section className="space-y-3">
              <SectionTitle tone="stop" count={groups.needsYou.length}>
                Needs you
              </SectionTitle>
              <p className="text-[13px] text-ink-soft">Alfred won’t guess these. Answer here or on the page.</p>
              <ul className="space-y-2.5">
                {groups.needsYou.map((field, index) => (
                  <NeedsYouItem
                    key={field.id}
                    index={index}
                    field={field}
                    onPut={putValue}
                    onShow={() => void focusFieldOnPage(page, field.id)}
                    onAttach={() => attachTo(field)}
                    onOpenProfile={onOpenProfile}
                    onOpenDocuments={onOpenDocuments}
                  />
                ))}
              </ul>
            </section>
          )}

          {groups.drafts.length > 0 && (
            <section className="space-y-3">
              <SectionTitle tone="warn" count={groups.drafts.length}>
                Free-text answers
              </SectionTitle>
              <p className="text-[13px] text-ink-soft">Alfred can draft these from your profile. Every draft is yours to edit first.</p>
              <ul className="space-y-2.5">
                {groups.drafts.map((field, index) => (
                  <DraftItem key={field.id} index={index} field={field} page={report} onPut={putValue} onShow={() => void focusFieldOnPage(page, field.id)} />
                ))}
              </ul>
            </section>
          )}

          {groups.done.length > 0 && (
            <section className="space-y-3">
              <SectionTitle tone="ok" count={groups.done.length}>
                Filled for you
              </SectionTitle>
              <Tray as="section" core="p-1.5">
                <ul>
                  {groups.done.map((field) => (
                    <li key={field.id}>
                      <button
                        type="button"
                        onClick={() => void focusFieldOnPage(page, field.id)}
                        className="group flex w-full items-center gap-3 rounded-[var(--r-control)] px-2.5 py-2.5 text-left transition-colors duration-300 hover:bg-field"
                      >
                        <CheckCircleIcon aria-hidden className="h-5 w-5 shrink-0 text-ok" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] text-ink-soft">{displayLabel(field.label, "Untitled field")}</span>
                          <span className="block truncate font-semibold">{field.value}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-faint transition-colors group-hover:text-ink-soft">{field.source || "Filled"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Tray>
            </section>
          )}

          {groups.kept.length > 0 && (
            <p className="text-[12px] leading-relaxed text-ink-faint">
              {groups.kept.length} {groups.kept.length === 1 ? "field already had" : "fields already had"} an answer, so Alfred left{" "}
              {groups.kept.length === 1 ? "it" : "them"} as you wrote {groups.kept.length === 1 ? "it" : "them"}.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button tone="quiet" icon={ArrowsClockwiseIcon} onClick={fill} busy={filling}>
              Fill again
            </Button>
          </div>

          <Notice tone="ok">Read the form through on the page, then press its Submit button yourself. Alfred never submits an application.</Notice>
        </>
      )}
    </div>
  );
}

/** The empty state: what to do when no application is open. */
function HowToUse() {
  const steps = [
    { icon: BrowserIcon, title: "Open a job application", body: "Greenhouse, Lever, Workday, or any careers site." },
    { icon: TextboxIcon, title: "Press Fill", body: "Alfred answers what your profile knows, and flags the rest." },
    { icon: CheckCircleIcon, title: "Review and submit", body: "You read it through. The Submit button is always yours." },
  ];
  return (
    <Tray className={`rise ${stagger(2)}`} core="p-2">
      <ol aria-label="How to use Alfred">
        {steps.map(({ icon: I, title, body }) => (
          <li key={title} className="flex gap-3 rounded-[var(--r-control)] p-2.5">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-field ring-1 ring-line">
              <I className="h-5 w-5 text-ink-soft" />
            </span>
            <span>
              <span className="block text-[14px] font-semibold">{title}</span>
              <span className="block text-[12px] leading-relaxed text-ink-soft">{body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Tray>
  );
}

function LoadingTray() {
  return (
    <div className="space-y-4" aria-label="Reading the page">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="grid grid-cols-[1.25fr_1fr] gap-2">
        <Skeleton className="row-span-2 h-[148px] rounded-[var(--r-card)]" />
        <Skeleton className="h-[70px] rounded-[var(--r-card)]" />
        <Skeleton className="h-[70px] rounded-[var(--r-card)]" />
      </div>
    </div>
  );
}

/** A compact tray for bento grids. */
/**
 * A compact tile for bento grids. Its tone picks the --tile-* tokens, which
 * default to the plain card colours; a theme can fill tiles with colour.
 */
function BentoTile({ children, className = "", tone = "plain" }: { children: ReactNode; className?: string; tone?: "plain" | "ok" | "stop" | "warn" | "accent" }) {
  const fill = {
    plain: "bg-core",
    ok: "bg-[var(--tile-ok,var(--core))] text-[var(--tile-ok-ink,var(--ink))]",
    stop: "bg-[var(--tile-stop,var(--core))] text-[var(--tile-stop-ink,var(--ink))]",
    warn: "bg-[var(--tile-warn,var(--core))] text-[var(--tile-warn-ink,var(--ink))]",
    accent: "bg-[var(--tile-accent,var(--core))] text-[var(--tile-accent-ink,var(--ink))]",
  }[tone];
  return (
    <div className={`rise rounded-[var(--r-card)] bg-shell p-[var(--bezel)] ring-1 ring-shell-ring ${className}`}>
      <div className={`flex h-full flex-col rounded-[var(--r-card)] p-3.5 shadow-core ${fill}`}>{children}</div>
    </div>
  );
}

function Summary({ done, needsYou, drafts, total }: { done: number; needsYou: number; drafts: number; total: number }) {
  const share = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="grid grid-cols-[1.25fr_1fr] gap-2" aria-label="Fill summary">
      <BentoTile tone="ok" className={`row-span-2 ${stagger(1)}`}>
        <p className="flex items-center gap-1.5 text-[12px] font-semibold opacity-80">
          <CheckCircleIcon aria-hidden className="h-4 w-4 text-[var(--tile-ok-num,var(--ok))]" /> Filled
        </p>
        <p className="mt-auto serif text-[40px] leading-none tabular-nums">{done}</p>
        <p className="mt-1 text-[12px] opacity-80">of {total} questions</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label="Share of questions filled">
          <div className="h-full rounded-full bg-[var(--tile-ok-num,var(--ok))] transition-[width] duration-700 ease-spring" style={{ width: `${share}%` }} />
        </div>
      </BentoTile>
      <BentoTile tone={needsYou ? "stop" : "plain"} className={stagger(2)}>
        <p className="text-[12px] font-semibold opacity-80">Needs you</p>
        <p className={`mt-1 text-[24px] font-semibold leading-none tabular-nums ${needsYou ? "text-[var(--tile-stop-num,var(--stop))]" : "text-ink-faint"}`}>{needsYou}</p>
      </BentoTile>
      <BentoTile tone={drafts ? "warn" : "plain"} className={stagger(3)}>
        <p className="text-[12px] font-semibold opacity-80">Can draft</p>
        <p className={`mt-1 text-[24px] font-semibold leading-none tabular-nums ${drafts ? "text-[var(--tile-warn-num,var(--warn))]" : "text-ink-faint"}`}>{drafts}</p>
      </BentoTile>
    </div>
  );
}

/** A form's label without its own required marker; Alfred adds a consistent one. */
function displayLabel(label: string, fallback: string): string {
  return label.replace(/\s*[*✱＊]\s*$/, "").trim() || fallback;
}

type ItemProps = { field: FieldReport; index: number; onPut: (field: FieldReport, value: string) => Promise<boolean>; onShow: () => void };

function ItemHeader({ field, onShow }: { field: FieldReport; onShow: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="pt-1.5 text-[14px] font-semibold leading-snug">
        {displayLabel(field.label, "Untitled question")}
        {field.required && <span className="text-stop"> *</span>}
      </p>
      <IconButton icon={CrosshairIcon} label="Show on the page" onClick={onShow} />
    </div>
  );
}

function NeedsYouItem({
  field,
  index,
  onPut,
  onShow,
  onAttach,
  onOpenProfile,
  onOpenDocuments,
}: ItemProps & { onAttach: () => Promise<boolean>; onOpenProfile: () => void; onOpenDocuments: () => void }) {
  const [resume] = useStored(resumeFileItem);
  const [attaching, setAttaching] = useState<"idle" | "busy" | "failed">("idle");
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const choosable = field.kind === "select" || field.kind === "radio";
  const writable = field.kind !== "custom" && field.kind !== "file";

  async function put() {
    if (!value.trim()) return;
    setState("saving");
    const ok = await onPut(field, value);
    setState(ok ? "idle" : "failed");
  }

  return (
    <Tray as="li" className={`rise ${stagger(index + 1)}`} core="space-y-3">
      <ItemHeader field={field} onShow={onShow} />
      {field.status === "unsupported" ? (
        <p className="text-[13px] text-ink-soft">This one uses a custom control Alfred can’t operate. Please fill it on the page.</p>
      ) : field.kind === "file" ? (
        field.key === "coverLetter" ? (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            This form wants a cover letter file. Write one in{" "}
            <button type="button" className="font-semibold text-ink underline decoration-1 underline-offset-2" onClick={onOpenDocuments}>
              Documents
            </button>
            , save it as a PDF, then attach it on the page.
          </p>
        ) : resume ? (
          <div className="space-y-2">
            <Button
              icon={PaperclipIcon}
              busy={attaching === "busy"}
              onClick={async () => {
                setAttaching("busy");
                setAttaching((await onAttach()) ? "idle" : "failed");
              }}
            >
              Attach {resume.name}
            </Button>
            {attaching === "failed" && (
              <p className="text-[12px] text-stop">This upload box didn’t accept the file. Use “Show on the page” and drop your CV into it.</p>
            )}
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Add your CV in{" "}
            <button type="button" className="font-semibold text-ink underline decoration-1 underline-offset-2" onClick={onOpenProfile}>
              Profile
            </button>{" "}
            and Alfred will attach it here.
          </p>
        )
      ) : (
        writable && (
          <div className="flex gap-2">
            {choosable && field.options.length > 0 ? (
              <select
                aria-label={field.label}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={`${controlClass} h-11 min-w-0 flex-1`}
              >
                <option value="">Choose…</option>
                {field.options.filter(Boolean).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label={field.label}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void put()}
                className={`${controlClass} h-11 min-w-0 flex-1`}
                placeholder="Your answer"
              />
            )}
            <Button onClick={() => void put()} busy={state === "saving"} disabled={!value.trim()}>
              Put in
            </Button>
          </div>
        )
      )}
      {state === "failed" && <p className="text-[12px] text-stop">The page didn’t accept that. Try filling it on the page.</p>}
    </Tray>
  );
}

function DraftItem({ field, index, page, onPut, onShow }: ItemProps & { page: PageReport }) {
  const [profile] = useStored(profileItem);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(false);
  const isCoverLetter = field.key === "coverLetter";
  const cost = useCostLabel(isCoverLetter ? "cover-letter" : "answer");

  async function write() {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const job = { jobDescription: page.job.description, jobTitle: page.job.title, company: page.job.company };
      if (isCoverLetter) {
        const { output } = await runAi("cover-letter", { ...job, profileText: profileTextFor(profile) });
        setDraft(coverLetterAsText(output));
        setNote("A draft written from your profile. Make it sound like you.");
      } else {
        const { output } = await runAi("answer", {
          ...job,
          profileText: profileTextFor(profile),
          question: field.label,
          maxWords: field.maxLength ? Math.max(10, Math.floor(field.maxLength / 7)) : undefined,
        });
        setDraft(output.answer);
        setNote(output.confident ? output.note : `Check this one: ${output.note}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tray as="li" className={`rise ${stagger(index + 1)}`} core="space-y-3">
      <ItemHeader field={field} onShow={onShow} />
      {!draft ? (
        <Button tone="quiet" icon={PenNibIcon} onClick={() => void write()} busy={busy}>
          Draft it{cost}
        </Button>
      ) : (
        <>
          <textarea
            aria-label={`Draft answer: ${field.label}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setPlaced(false);
            }}
            className={`${controlClass} min-h-36 resize-y py-3 text-[13px] leading-relaxed`}
          />
          {note && <p className="text-[12px] leading-relaxed text-warn">{note}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              icon={placed ? CheckCircleIcon : undefined}
              onClick={async () => setPlaced(await onPut(field, draft))}
              disabled={!draft.trim()}
            >
              {placed ? "In the form" : "Put in form"}
            </Button>
            <Button tone="ghost" icon={ArrowsClockwiseIcon} onClick={() => void write()} busy={busy}>
              Redraft
            </Button>
          </div>
        </>
      )}
      {error && <p className="text-[12px] text-stop">{error}</p>}
    </Tray>
  );
}
