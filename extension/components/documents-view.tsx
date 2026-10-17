import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { coverLetterAsText, tailoredCvAsText, type CoverLetter, type TailoredCv } from "@shared/ai";
import { fullName } from "@shared/profile";
import { runAi } from "@/lib/ai";
import { tailoredCvPdf } from "@/lib/cv-pdf";
import { profileReady, profileTextFor } from "@/lib/profile-text";
import { preparedDocsItem, profileItem } from "@/lib/storage";
import { scanActivePage } from "@/lib/tab";
import { useCostLabel } from "@/hooks/use-cost-label";
import { useStored } from "@/hooks/use-stored";
import {
  ArrowSquareInIcon,
  CheckIcon,
  CopyIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  PrinterIcon,
  FileTextIcon,
} from "@phosphor-icons/react";
import { Button, errorMessage, Eyebrow, Notice, SectionTitle, stagger, TextArea, TextInput, Tray, ViewTitle } from "./ui";

type Props = { onOpenProfile: () => void };

export function DocumentsView({ onOpenProfile }: Props) {
  const [profile] = useStored(profileItem);
  const [docs, setDocs] = useStored(preparedDocsItem);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<"" | "cv" | "letter" | "page">("");
  const [error, setError] = useState("");
  const cvCost = useCostLabel("tailor-cv");
  const letterCost = useCostLabel("cover-letter");

  // Start from the documents already prepared, or the job on the current page.
  useEffect(() => {
    if (docs === undefined) return;
    if (docs) {
      setTitle(docs.jobTitle);
      setCompany(docs.company);
      setDescription(docs.jobDescription);
    } else {
      void readPage();
    }
    // Only on first load of the stored documents.
  }, [docs === undefined]);

  async function readPage() {
    setBusy("page");
    try {
      const page = await scanActivePage();
      setTitle(page.report.job.title);
      setCompany(page.report.job.company);
      setDescription(page.report.job.description);
      setError(page.report.job.description ? "" : "Alfred couldn't find a job description on this page. Paste it below.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  function jobKey() {
    return `${company}::${title}`.toLowerCase();
  }

  async function save(patch: { cv?: TailoredCv | null; letter?: CoverLetter | null }) {
    const sameJob = docs && docs.jobKey === jobKey();
    await setDocs({
      jobKey: jobKey(),
      jobTitle: title,
      company,
      jobDescription: description,
      cv: patch.cv !== undefined ? patch.cv : sameJob ? docs.cv : null,
      letter: patch.letter !== undefined ? patch.letter : sameJob ? docs.letter : null,
      updatedAt: new Date().toISOString(),
    });
  }

  async function tailor() {
    if (!profile) return;
    setBusy("cv");
    setError("");
    try {
      const { output } = await runAi("tailor-cv", {
        profileText: profileTextFor(profile),
        jobDescription: description,
        jobTitle: title,
        company,
      });
      await save({ cv: output });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function writeLetter() {
    if (!profile) return;
    setBusy("letter");
    setError("");
    try {
      const { output } = await runAi("cover-letter", {
        profileText: profileTextFor(profile),
        jobDescription: description,
        jobTitle: title,
        company,
      });
      await save({ letter: output });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  if (!profile) return null;
  if (!profileReady(profile)) {
    return (
      <div className="space-y-6 px-5 pt-6">
        <ViewTitle
          eyebrow={<Eyebrow>Documents</Eyebrow>}
          title="Documents start from your profile."
          sub="Alfred tailors your CV from your own experience, so it needs your profile first."
        />
        <div className={`rise ${stagger(2)}`}>
          <Button size="lg" trailing onClick={onOpenProfile}>
            Set up my profile
          </Button>
        </div>
      </div>
    );
  }

  const contact = [profile.personal.email, profile.personal.phone, [profile.personal.city, profile.personal.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
  const current = docs && docs.jobKey === jobKey() ? docs : null;
  const tooShort = description.trim().length < 40;

  return (
    <div className="space-y-7 px-5 pt-6">
      <ViewTitle
        eyebrow={<Eyebrow>Documents</Eyebrow>}
        title="Told for this job."
        sub="Same experience, reordered and reworded for what this employer asks. Nothing invented."
      />

      <Tray as="section" className={`rise ${stagger(1)}`} core="space-y-4">
        <SectionTitle
          aside={
            <Button size="sm" tone="ghost" icon={ArrowSquareInIcon} onClick={() => void readPage()} busy={busy === "page"}>
              From this page
            </Button>
          }
        >
          The job
        </SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <TextInput label="Role" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextInput label="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
        </div>
        <TextArea
          label="Job description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
          hint="Alfred leads with the parts of your experience this description asks for."
        />
      </Tray>

      <div className={`rise space-y-2.5 ${stagger(2)}`}>
        <Button size="lg" className="w-full" icon={FileTextIcon} trailing onClick={() => void tailor()} busy={busy === "cv"} disabled={tooShort || busy !== ""}>
          Tailor my CV{cvCost}
        </Button>
        <Button tone="quiet" className="w-full" icon={EnvelopeSimpleIcon} onClick={() => void writeLetter()} busy={busy === "letter"} disabled={tooShort || busy !== ""}>
          Write cover letter{letterCost}
        </Button>
      </div>
      {error && <Notice tone="stop">{error}</Notice>}

      {current?.cv && (
        <CvPreview cv={current.cv} name={fullName(profile)} contact={contact} onPrint={() => void openPrint("cv")} />
      )}

      {current?.letter && (
        <LetterEditor
          letter={current.letter}
          onChange={(letter) => void save({ letter })}
          onPrint={() => void openPrint("letter")}
        />
      )}
    </div>
  );
}

function openPrint(doc: "cv" | "letter") {
  return browser.tabs.create({ url: browser.runtime.getURL(`/print.html?doc=${doc}`) });
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      tone="quiet"
      icon={copied ? CheckIcon : CopyIcon}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CvPreview({ cv, name, contact, onPrint }: { cv: TailoredCv; name: string; contact: string; onPrint: () => void }) {
  const text = tailoredCvAsText(cv, name, contact);
  const [profile] = useStored(profileItem);
  const [docs] = useStored(preparedDocsItem);

  async function downloadPdf() {
    if (!profile) return;
    const file = await tailoredCvPdf(cv, profile, docs?.company ?? "");
    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.name;
    link.click();
  }
  return (
    <section className="rise space-y-3">
      <SectionTitle tone="ok">Tailored CV</SectionTitle>
      <Tray core="p-0 overflow-hidden">
      <article className="space-y-3 rounded-[var(--r-card)] bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a]">
        <header>
          <p className="text-[17px] font-semibold tracking-[-0.02em]">{name}</p>
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
      </Tray>
      {cv.changes.length > 0 && (
        <div className="space-y-2 px-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">What Alfred changed</p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-soft">
            {cv.changes.map((change) => (
              <li key={change} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warn" />
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={DownloadSimpleIcon} onClick={() => void downloadPdf()}>
          Download PDF
        </Button>
        <Button size="sm" tone="ghost" icon={PrinterIcon} onClick={onPrint}>
          Print
        </Button>
        <CopyButton text={text} />
        <Button size="sm" tone="ghost" icon={DownloadSimpleIcon} onClick={() => download(`${name || "CV"} - tailored.txt`, text)}>
          .txt
        </Button>
      </div>
    </section>
  );
}

function LetterEditor({ letter, onChange, onPrint }: { letter: CoverLetter; onChange: (letter: CoverLetter) => void; onPrint: () => void }) {
  const text = coverLetterAsText(letter);
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  return (
    <section className="rise space-y-3">
      <SectionTitle tone="warn" aside={<Eyebrow tone="warn">Draft</Eyebrow>}>
        Cover letter
      </SectionTitle>
      <Tray core="p-0 overflow-hidden">
      <textarea
        aria-label="Cover letter"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const blocks = draft.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
          const [greeting, ...rest] = blocks;
          const signOff = rest.pop();
          if (greeting && signOff) onChange({ greeting, paragraphs: rest, signOff });
        }}
        className="block min-h-80 w-full resize-y rounded-[var(--r-card)] bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a] outline-none focus:ring-2 focus:ring-[var(--focus)]"
      />
      </Tray>
      <p className="px-1 text-[12px] leading-relaxed text-ink-faint">Written from your profile. Edit it until it sounds like you; your edits are kept.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={PrinterIcon} onClick={onPrint}>
          Save as PDF
        </Button>
        <CopyButton text={draft} />
      </div>
    </section>
  );
}
