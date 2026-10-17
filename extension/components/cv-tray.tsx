import { useRef, useState, type DragEvent } from "react";
import { ArrowsClockwiseIcon, CheckCircleIcon, CircleIcon, FileArrowUpIcon, TextAlignLeftIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { Profile } from "@shared/profile";
import { runAi } from "@/lib/ai";
import { CV_ACCEPT, CvReadError, extractCvText } from "@/lib/cv-file";
import { prefillFromCvText } from "@/lib/cv-heuristics";
import { mergeCvIntoProfile } from "@/lib/merge-cv";
import { resumeFileItem, type StoredFile } from "@/lib/storage";
import type { ProfileUpdate } from "@/hooks/use-profile-editor";
import { useStored } from "@/hooks/use-stored";
import { Button, controlClass, errorMessage, Notice, stagger, Tray } from "./ui";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Stage = "idle" | "working" | "done" | "failed";

type Props = {
  profile: Profile;
  update: ProfileUpdate;
  /** Without its own tray, for use inside another card (setup steps). */
  bare?: boolean;
};

/**
 * One place for the CV. Uploading it does everything: the file is kept to
 * attach to application forms, its text is read here in the browser, the
 * obvious fields (name, email, phone, links) are filled at once, and the AI
 * fills experience, education and skills straight after. Pasting text stays
 * as a fallback for scanned PDFs.
 */
export function CvTray({ profile, update, bare = false }: Props) {
  const [file, setFile] = useStored(resumeFileItem);
  const [text, setText] = useState(profile.resumeText);
  const [stages, setStages] = useState<{ read: Stage; contact: Stage; ai: Stage }>({ read: "idle", contact: "idle", ai: "idle" });
  const [summary, setSummary] = useState("");
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const busy = stages.read === "working" || stages.ai === "working";

  /** Fills the profile from CV text: instant local pass, then the AI pass. */
  async function prefill(cvText: string) {
    setError("");
    setSummary("");
    update((previous) => prefillFromCvText(previous, cvText));
    setStages((s) => ({ ...s, contact: "done", ai: "working" }));

    try {
      const { output } = await runAi("parse-cv", { cvText });
      let replaceHistory = true;
      update((previous) => {
        if (previous.work.length > 0 || previous.education.length > 0) {
          replaceHistory = window.confirm(
            "Replace your experience and education with what's in this CV? Choose Cancel to keep yours and only fill empty fields.",
          );
        }
        return mergeCvIntoProfile(previous, output, cvText, replaceHistory);
      });
      setStages((s) => ({ ...s, ai: "done" }));
      const parts = [
        output.work.length && `${output.work.length} ${output.work.length === 1 ? "role" : "roles"}`,
        output.education.length && `${output.education.length} ${output.education.length === 1 ? "school" : "schools"}`,
        output.skills.length && `${output.skills.length} skills`,
      ].filter(Boolean);
      setSummary(parts.length ? `Filled from your CV: ${parts.join(", ")}.` : "Filled what your CV states.");
    } catch (err) {
      setStages((s) => ({ ...s, ai: "failed" }));
      setError(`Your contact details are filled in. Alfred couldn’t read your experience yet: ${errorMessage(err)}`);
    }
  }

  async function take(picked: File) {
    setError("");
    setSummary("");
    if (picked.size > MAX_FILE_BYTES) {
      setError("That file is over 5 MB. Most application forms won't accept it either.");
      return;
    }
    setStages({ read: "working", contact: "idle", ai: "idle" });
    let extracted: string | null = null;
    try {
      extracted = await extractCvText(picked).catch((err: unknown) => {
        // Keep the file for attaching even if its text can't be read.
        if (err instanceof CvReadError) {
          setError(err.message);
          setPasting(true);
          return null;
        }
        throw err;
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(picked);
      });
      const stored: StoredFile = { name: picked.name, type: picked.type || "application/pdf", dataUrl, size: picked.size };
      await setFile(stored);
      setStages((s) => ({ ...s, read: extracted ? "done" : "failed" }));
    } catch (err) {
      setStages((s) => ({ ...s, read: "failed" }));
      setError(errorMessage(err));
      return;
    }
    if (extracted) {
      setText(extracted);
      await prefill(extracted);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) void take(dropped);
  }

  const started = stages.read !== "idle";
  // Inside setup the summary below says what was found, so the progress list
  // and success note only show while reading or if something went wrong.
  const allDone = stages.read === "done" && stages.contact === "done" && stages.ai === "done";
  const showProgress = started && !(bare && allDone);

  const content = (
    <>
      {!bare && (
        <div>
          <p className="text-[15px] font-semibold tracking-[-0.02em]">Your CV</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            Upload it once. Alfred fills your profile from it and attaches it to forms that ask for one.
          </p>
        </div>
      )}

      {file ? (
        <div className="flex items-center gap-3 rounded-[var(--r-card)] bg-sunken p-3 ring-1 ring-line">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--r-control)] bg-field ring-1 ring-line">
            <CheckCircleIcon className="h-5 w-5 text-ok" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{file.name}</p>
            <p className="text-[12px] text-ink-faint">
              {Math.max(1, Math.round(file.size / 1024))} KB{words ? ` · ${words.toLocaleString()} words` : ""}
            </p>
          </div>
          <Button size="sm" tone="ghost" onClick={() => input.current?.click()} disabled={busy}>
            Replace
          </Button>
          <button
            type="button"
            aria-label="Remove CV file"
            title="Remove CV file"
            onClick={() => void resumeFileItem.setValue(null)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stop transition-colors hover:bg-field"
          >
            <TrashIcon aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="cv-upload"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-[var(--r-card)] border border-dashed px-4 py-7 text-center transition-[background-color,border-color] duration-300 ease-spring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--focus)] ${
            dragging ? "border-[var(--action)] bg-field" : "border-[var(--line)] bg-sunken hover:bg-field"
          }`}
        >
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-action text-action-ink">
            <FileArrowUpIcon className="h-6 w-6" weight="regular" />
          </span>
          <span className="text-[14px] font-semibold">Upload your CV</span>
          <span className="text-[12px] text-ink-faint">PDF or Word (.docx), up to 5 MB. Or drop it here.</span>
        </label>
      )}
      {/* One file input: the drop zone's label and the Replace button both open it. */}
      <input
        id="cv-upload"
        ref={input}
        type="file"
        accept={CV_ACCEPT}
        className="sr-only"
        aria-label="Upload your CV"
        onChange={(event) => {
          const picked = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (picked) void take(picked);
        }}
      />

      {showProgress && (
        <ol aria-live="polite" aria-label="Reading your CV" className="space-y-2 rounded-[var(--r-card)] bg-sunken p-3 ring-1 ring-line">
          <StageRow stage={stages.read} label="Read the file" />
          <StageRow stage={stages.contact} label="Found your name, contact details and links" />
          <StageRow stage={stages.ai} label="Filled your experience, education and skills" />
        </ol>
      )}

      {summary && !bare && <Notice tone="ok">{summary} Check each section below; anything your CV didn’t say is left empty.</Notice>}
      {error && <Notice tone="warn">{error}</Notice>}

      {stages.ai === "failed" && text.trim().length >= 40 && (
        <Button tone="quiet" icon={ArrowsClockwiseIcon} onClick={() => void prefill(text)}>
          Try reading it again
        </Button>
      )}

      {pasting ? (
        <div className="space-y-2">
          <label htmlFor="cv-text" className="block text-[12px] font-semibold text-ink-soft">
            CV text
          </label>
          <textarea
            id="cv-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            placeholder="Open your CV, select all, copy, and paste it here."
            className={`${controlClass} min-h-32 resize-y py-3 text-[13px] leading-relaxed`}
          />
          <Button
            size="sm"
            disabled={text.trim().length < 40 || busy}
            onClick={() => {
              setStages({ read: "done", contact: "idle", ai: "idle" });
              void prefill(text);
            }}
          >
            Fill my profile from this text
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPasting(true)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <TextAlignLeftIcon aria-hidden className="h-4 w-4" />
          {text ? "See or edit the text Alfred read" : "Paste text instead"}
        </button>
      )}
    </>
  );

  return bare ? (
    <div className="space-y-4">{content}</div>
  ) : (
    <Tray className={`rise ${stagger(1)}`} core="space-y-4">
      {content}
    </Tray>
  );
}

function StageRow({ stage, label }: { stage: Stage; label: string }) {
  return (
    <li className={`flex items-center gap-2.5 text-[13px] ${stage === "idle" ? "text-ink-faint" : "text-ink"}`}>
      {stage === "working" ? (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent text-ink-soft" />
      ) : stage === "done" ? (
        <CheckCircleIcon aria-hidden className="h-4 w-4 text-ok" weight="fill" />
      ) : stage === "failed" ? (
        <WarningCircleIcon aria-hidden className="h-4 w-4 text-warn" />
      ) : (
        <CircleIcon aria-hidden className="h-4 w-4" />
      )}
      <span>{label}</span>
      <span className="sr-only">{stage === "working" ? "in progress" : stage === "done" ? "done" : stage === "failed" ? "didn't finish" : "waiting"}</span>
    </li>
  );
}
