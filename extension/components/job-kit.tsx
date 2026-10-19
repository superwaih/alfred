import { useEffect, useState, type ReactNode } from "react";
import { browser } from "wxt/browser";
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  PaperclipIcon,
  PrinterIcon,
  TextboxIcon,
} from "@phosphor-icons/react";
import { coverLetterAsText, type CoverLetter, type TailoredCv } from "@shared/ai";
import { fullName } from "@shared/profile";
import { runAi } from "@/lib/ai";
import { tailoredCvPdf } from "@/lib/cv-pdf";
import type { PageReport } from "@/lib/messages";
import { profileTextFor } from "@/lib/profile-text";
import { preparedDocsItem, profileItem } from "@/lib/storage";
import { attachCvOnPage, setFieldOnPage, type ActivePage } from "@/lib/tab";
import { useCostLabel } from "@/hooks/use-cost-label";
import { useStored } from "@/hooks/use-stored";
import { Button, errorMessage, Notice, TextArea, TextInput, Tray } from "./ui";

export type Job = { title: string; company: string; description: string };

export function jobKeyFor(company: string, title: string) {
  return `${company}::${title}`.toLowerCase();
}

/** Turns an edited letter back into its parts; null if it no longer has a greeting and sign-off. */
export function letterFromText(text: string): CoverLetter | null {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const [greeting, ...rest] = blocks;
  const signOff = rest.pop();
  return greeting && signOff ? { greeting, paragraphs: rest, signOff } : null;
}

function downloadUrl(name: string, url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

function openPrint(doc: "cv" | "letter") {
  return browser.tabs.create({ url: browser.runtime.getURL(`/print.html?doc=${doc}`) });
}

type Props = {
  /** The job as read from the page. Empty or missing parts can be typed in. */
  job: Job;
  /** The open application, when there is one: enables Attach and Put in form. */
  page?: ActivePage | null;
  onReport?: (report: PageReport) => void;
  /** Starts open; otherwise it's a one-line row the user expands. */
  defaultOpen?: boolean;
};

/**
 * Everything Alfred writes for one job, in one place: a tailored CV and a
 * cover letter. Nothing runs until the user asks; both are kept for the job
 * so they survive closing the panel.
 */
export function JobKit({ job, page, onReport, defaultOpen = false }: Props) {
  const [profile] = useStored(profileItem);
  const [docs, setDocs] = useStored(preparedDocsItem);
  const [title, setTitle] = useState(job.title);
  const [company, setCompany] = useState(job.company);
  const [description, setDescription] = useState(job.description);
  const [busy, setBusy] = useState<"" | "cv" | "letter" | "attach" | "download" | "put">("");
  const [error, setError] = useState("");
  const [attached, setAttached] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [showCv, setShowCv] = useState(false);
  const cvCost = useCostLabel("tailor-cv");
  const letterCost = useCostLabel("cover-letter");

  // A different job on the page replaces what was typed.
  useEffect(() => {
    setTitle(job.title);
    setCompany(job.company);
    setDescription(job.description);
    setAttached(false);
    setPlaced(false);
  }, [job.title, job.company, job.description]);

  // With no job on the page, pick up the last one the user prepared.
  useEffect(() => {
    if (job.title || job.description || !docs) return;
    setTitle((value) => value || docs.jobTitle);
    setCompany((value) => value || docs.company);
    setDescription((value) => value || docs.jobDescription);
  }, [docs === undefined]);

  if (!profile) return null;

  const key = jobKeyFor(company, title);
  const current = docs && docs.jobKey === key ? docs : null;
  const cv = current?.cv ?? null;
  const letter = current?.letter ?? null;
  const fields = page?.report.fields ?? [];
  const cvField = fields.find((field) => field.kind === "file" && field.key === "resume");
  const letterField = fields.find((field) => field.key === "coverLetter" && (field.kind === "textarea" || field.kind === "text"));
  const readFromPage = job.description.trim().length >= 40;
  const ready = description.trim().length >= 40;

  async function save(patch: { cv?: TailoredCv | null; letter?: CoverLetter | null }) {
    await setDocs({
      jobKey: key,
      jobTitle: title,
      company,
      jobDescription: description,
      cv: patch.cv !== undefined ? patch.cv : (current?.cv ?? null),
      letter: patch.letter !== undefined ? patch.letter : (current?.letter ?? null),
      updatedAt: new Date().toISOString(),
    });
  }

  async function run(kind: "cv" | "letter") {
    if (!profile) return;
    setBusy(kind);
    setError("");
    try {
      const input = { profileText: profileTextFor(profile), jobDescription: description, jobTitle: title, company };
      if (kind === "cv") {
        const { output } = await runAi("tailor-cv", input);
        setAttached(false);
        await save({ cv: output });
      } else {
        const { output } = await runAi("cover-letter", input);
        setPlaced(false);
        await save({ letter: output });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function attach() {
    if (!cv || !cvField || !page || !profile) return;
    setBusy("attach");
    setError("");
    try {
      const file = await tailoredCvPdf(cv, profile, company);
      const report = await attachCvOnPage(page, cvField.id, file);
      if (!report) throw new Error("This upload box didn’t take the file. Download the PDF and drop it in yourself.");
      onReport?.(report);
      setAttached(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function downloadPdf() {
    if (!cv || !profile) return;
    setBusy("download");
    try {
      const file = await tailoredCvPdf(cv, profile, company);
      downloadUrl(file.name, file.dataUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function putLetter(text: string) {
    if (!page || !letterField) return;
    setBusy("put");
    const report = await setFieldOnPage(page, letterField.id, text);
    if (report) onReport?.(report);
    setPlaced(Boolean(report?.fields.find((field) => field.id === letterField.id && field.status === "filled")));
    if (!report) setError("The page didn’t take the letter. Copy it and paste it in yourself.");
    setBusy("");
  }

  const doneCount = Number(Boolean(cv)) + Number(Boolean(letter));
  const ready_ = doneCount ? `${doneCount === 2 ? "CV and cover letter" : cv ? "Tailored CV" : "Cover letter"} ready` : "";
  // No job on the page: the user pastes one in, or picks up the last one.
  const manual = !job.title && !job.description;
  const summary = manual
    ? title
      ? [title, company && `at ${company}`, ready_ && `· ${ready_}`].filter(Boolean).join(" ")
      : "Paste a job description to tailor your CV"
    : ready_ || "Tailored CV and cover letter, when you want them";

  return (
    <Tray as="section" className="rise">
      <details className="group/kit" open={defaultOpen || undefined}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{manual ? "Prepare for a job" : "For this job"}</span>
            <span className="block truncate text-[12px] text-ink-soft">{summary}</span>
          </span>
          <CaretDownIcon aria-hidden className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-300 ease-spring group-open/kit:rotate-180" />
        </summary>

        <div className="space-y-4 pt-4">
          {!readFromPage && (
            <div className="space-y-2.5">
              {!job.title && (
                <div className="grid grid-cols-2 gap-2.5">
                  <TextInput label="Role" value={title} onChange={(event) => setTitle(event.target.value)} />
                  <TextInput label="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
                </div>
              )}
              <TextArea
                label="Job description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Paste the job description here."
                hint={job.title ? "Alfred couldn’t read it from this page." : undefined}
              />
            </div>
          )}

          {/* Tailored CV */}
          <div className="space-y-2.5">
            <Row icon={FileTextIcon} title="Tailored CV" done={Boolean(cv)}>
              {cv ? cv.headline : "Your experience, reordered and reworded for this job. Nothing invented."}
            </Row>
            {!cv ? (
              <Button className="w-full" tone="quiet" icon={FileTextIcon} onClick={() => void run("cv")} busy={busy === "cv"} disabled={!ready || busy !== ""}>
                Tailor my CV{cvCost}
              </Button>
            ) : (
              <>
                {cv.changes.length > 0 && (
                  <ul className="space-y-1 pl-[42px] text-[12px] leading-relaxed text-ink-soft">
                    {cv.changes.slice(0, 2).map((change) => (
                      <li key={change} className="flex gap-2">
                        <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warn" />
                        {change}
                      </li>
                    ))}
                  </ul>
                )}
                {cvField &&
                  (attached ? (
                    <p className="flex items-center gap-2 pl-[42px] text-[13px] font-semibold text-ok">
                      <CheckCircleIcon aria-hidden className="h-4 w-4" weight="fill" /> Attached to this application
                    </p>
                  ) : (
                    <Button className="w-full" icon={PaperclipIcon} onClick={() => void attach()} busy={busy === "attach"}>
                      Attach to this application
                    </Button>
                  ))}
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" tone="quiet" icon={DownloadSimpleIcon} onClick={() => void downloadPdf()} busy={busy === "download"}>
                    PDF
                  </Button>
                  <Button size="sm" tone="ghost" onClick={() => setShowCv((value) => !value)} aria-expanded={showCv}>
                    {showCv ? "Hide" : "Read it"}
                  </Button>
                  <Button size="sm" tone="ghost" icon={ArrowsClockwiseIcon} onClick={() => void run("cv")} busy={busy === "cv"} disabled={busy !== ""}>
                    Redo
                  </Button>
                </div>
                {showCv && <CvSheet cv={cv} />}
              </>
            )}
          </div>

          <div className="h-px bg-[var(--line)]" />

          {/* Cover letter */}
          <div className="space-y-2.5">
            <Row icon={EnvelopeSimpleIcon} title="Cover letter" done={Boolean(letter)}>
              {letter ? "Written from your profile. Edit it until it sounds like you." : "A short letter in your voice, for this role."}
            </Row>
            {!letter ? (
              <Button className="w-full" tone="quiet" icon={EnvelopeSimpleIcon} onClick={() => void run("letter")} busy={busy === "letter"} disabled={!ready || busy !== ""}>
                Write a cover letter{letterCost}
              </Button>
            ) : (
              <LetterEditor
                letter={letter}
                onSave={(next) => void save({ letter: next })}
                canPut={Boolean(letterField)}
                placed={placed}
                putting={busy === "put"}
                onPut={(text) => void putLetter(text)}
                onRedo={() => void run("letter")}
                redoing={busy === "letter"}
              />
            )}
          </div>

          {!ready && <p className="text-[12px] leading-relaxed text-ink-faint">Alfred needs the job description to write for this job.</p>}
          {error && <Notice tone="stop">{error}</Notice>}
        </div>
      </details>
    </Tray>
  );
}

function Row({ icon: I, title, done, children }: { icon: typeof FileTextIcon; title: string; done: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-control)] ${done ? "bg-ok text-white" : "bg-sunken text-ink-soft ring-1 ring-line"}`}>
        {done ? <CheckIcon className="h-4 w-4" weight="bold" /> : <I className="h-4 w-4" />}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[14px] font-semibold leading-snug">{title}</p>
        <p className="text-[12px] leading-relaxed text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

/** The tailored CV as it will read on paper. */
function CvSheet({ cv }: { cv: TailoredCv }) {
  const [profile] = useStored(profileItem);
  if (!profile) return null;
  const contact = [profile.personal.email, profile.personal.phone, [profile.personal.city, profile.personal.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="rise space-y-3 rounded-[var(--r-control)] bg-white p-4 text-[12px] leading-relaxed text-[#1a1a1a] ring-1 ring-line">
      <header>
        <p className="text-[15px] font-semibold tracking-[-0.02em]">{fullName(profile)}</p>
        <p className="font-bold">{cv.headline}</p>
        <p className="text-[#55554f]">{contact}</p>
      </header>
      <p>{cv.summary}</p>
      {cv.roles.map((role) => (
        <div key={`${role.company}-${role.title}-${role.dates}`}>
          <p className="flex justify-between gap-2 font-bold">
            <span>
              {role.title}, {role.company}
            </span>
            <span className="shrink-0 font-normal text-[#55554f]">{role.dates}</span>
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {role.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      ))}
      <p>
        <span className="font-bold">Skills: </span>
        {cv.skills.join(", ")}
      </p>
    </article>
  );
}

function LetterEditor({
  letter,
  onSave,
  canPut,
  placed,
  putting,
  onPut,
  onRedo,
  redoing,
}: {
  letter: CoverLetter;
  onSave: (letter: CoverLetter) => void;
  canPut: boolean;
  placed: boolean;
  putting: boolean;
  onPut: (text: string) => void;
  onRedo: () => void;
  redoing: boolean;
}) {
  const text = coverLetterAsText(letter);
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState(false);
  useEffect(() => setDraft(text), [text]);

  function keep() {
    const next = letterFromText(draft);
    if (next) onSave(next);
  }

  return (
    <div className="space-y-2.5">
      <textarea
        aria-label="Cover letter"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={keep}
        className="block min-h-56 w-full resize-y rounded-[var(--r-control)] bg-white p-4 text-[12.5px] leading-relaxed text-[#1a1a1a] outline-none ring-1 ring-line focus:ring-2 focus:ring-[var(--focus)]"
      />
      {canPut && (
        <Button className="w-full" icon={placed ? CheckCircleIcon : TextboxIcon} onClick={() => onPut(draft)} busy={putting} disabled={!draft.trim()}>
          {placed ? "In the form" : "Put in the form"}
        </Button>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          tone="quiet"
          icon={copied ? CheckIcon : CopyIcon}
          onClick={async () => {
            await navigator.clipboard.writeText(draft);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          size="sm"
          tone="ghost"
          icon={PrinterIcon}
          onClick={() => {
            keep();
            void openPrint("letter");
          }}
        >
          Save as PDF
        </Button>
        <Button size="sm" tone="ghost" icon={ArrowsClockwiseIcon} onClick={onRedo} busy={redoing}>
          Redo
        </Button>
      </div>
    </div>
  );
}

