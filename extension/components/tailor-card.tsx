import { useState } from "react";
import { ArrowsClockwiseIcon, CheckCircleIcon, DownloadSimpleIcon, PaperclipIcon, FileTextIcon } from "@phosphor-icons/react";
import { runAi } from "@/lib/ai";
import { tailoredCvPdf } from "@/lib/cv-pdf";
import type { PageReport } from "@/lib/messages";
import { profileTextFor } from "@/lib/profile-text";
import { preparedDocsItem, profileItem } from "@/lib/storage";
import { attachCvOnPage, type ActivePage } from "@/lib/tab";
import { useCostLabel } from "@/hooks/use-cost-label";
import { useStored } from "@/hooks/use-stored";
import { Button, errorMessage, Notice, SectionTitle, stagger, Tray } from "./ui";

type Props = {
  page: ActivePage;
  onReport: (report: PageReport) => void;
  onOpenDocuments: () => void;
};

export function jobKeyFor(company: string, title: string) {
  return `${company}::${title}`.toLowerCase();
}

function download(name: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = name;
  link.click();
}

/**
 * Tailors the CV for the job on the page and puts it straight into the
 * application's CV field, in place of the original.
 */
export function TailorCard({ page, onReport, onOpenDocuments }: Props) {
  const [profile] = useStored(profileItem);
  const [docs, setDocs] = useStored(preparedDocsItem);
  const [busy, setBusy] = useState<"" | "tailor" | "attach" | "download">("");
  const [error, setError] = useState("");
  const [attached, setAttached] = useState(false);
  const cost = useCostLabel("tailor-cv");

  const { job, fields } = page.report;
  const key = jobKeyFor(job.company, job.title);
  const cv = docs && docs.jobKey === key ? docs.cv : null;
  const cvField = fields.find((field) => field.kind === "file" && field.key === "resume");
  const target = job.company || "this job";

  if (!profile) return null;

  async function tailor() {
    if (!profile) return;
    setBusy("tailor");
    setError("");
    setAttached(false);
    try {
      const { output } = await runAi("tailor-cv", {
        profileText: profileTextFor(profile),
        jobDescription: job.description,
        jobTitle: job.title,
        company: job.company,
      });
      const sameJob = docs && docs.jobKey === key;
      await setDocs({
        jobKey: key,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        cv: output,
        letter: sameJob ? docs.letter : null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  async function attach() {
    if (!cv || !cvField || !profile) return;
    setBusy("attach");
    setError("");
    try {
      const file = await tailoredCvPdf(cv, profile, job.company);
      const report = await attachCvOnPage(page, cvField.id, file);
      if (!report) throw new Error("This upload box didn’t accept the file. Download the PDF and drop it in by hand.");
      onReport(report);
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
      const file = await tailoredCvPdf(cv, profile, job.company);
      download(file.name, file.dataUrl);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy("");
    }
  }

  // Lever's apply page and some others don't show the description.
  if (job.description.trim().length < 40) {
    return (
      <Tray as="section" className={`rise ${stagger(5)}`} core="space-y-2">
        <SectionTitle>Tailored CV</SectionTitle>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Alfred couldn’t find the job description on this page. Paste it in{" "}
          <button type="button" className="font-semibold text-ink underline decoration-1 underline-offset-2" onClick={onOpenDocuments}>
            Documents
          </button>{" "}
          to tailor your CV for it.
        </p>
      </Tray>
    );
  }

  return (
    <Tray as="section" className={`rise ${stagger(5)}`} core="space-y-3">
      <SectionTitle tone={cv ? "ok" : "plain"}>Tailored CV for {target}</SectionTitle>

      {!cv ? (
        <>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Alfred reorders and rewords your experience to lead with what this job asks for. It never adds anything you haven’t done.
          </p>
          <Button className="w-full" icon={FileTextIcon} onClick={() => void tailor()} busy={busy === "tailor"}>
            Tailor my CV for this job{cost}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1.5 rounded-[var(--r-control)] bg-sunken p-3 ring-1 ring-line">
            <p className="text-[13px] font-semibold leading-snug">{cv.headline}</p>
            <ul className="space-y-1 text-[12px] leading-relaxed text-ink-soft">
              {cv.changes.slice(0, 2).map((change) => (
                <li key={change} className="flex gap-2">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warn" />
                  {change}
                </li>
              ))}
            </ul>
          </div>

          {cvField &&
            (attached ? (
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ok">
                <CheckCircleIcon aria-hidden className="h-4 w-4" weight="fill" /> Tailored CV attached to this application
              </p>
            ) : (
              <Button className="w-full" icon={PaperclipIcon} onClick={() => void attach()} busy={busy === "attach"}>
                Attach tailored CV
              </Button>
            ))}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" tone="quiet" icon={DownloadSimpleIcon} onClick={() => void downloadPdf()} busy={busy === "download"}>
              Download PDF
            </Button>
            <Button size="sm" tone="ghost" icon={ArrowsClockwiseIcon} onClick={() => void tailor()} busy={busy === "tailor"}>
              Retailor
            </Button>
            <Button size="sm" tone="ghost" onClick={onOpenDocuments}>
              See it in full
            </Button>
          </div>
        </>
      )}

      {error && <Notice tone="stop">{error}</Notice>}
    </Tray>
  );
}
