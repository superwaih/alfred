import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { fullName, type Profile } from "@shared/profile";
import { preparedDocsItem, profileItem, type PreparedDocs } from "@/lib/storage";
import "@/assets/panel.css";

/**
 * A print-ready page for the tailored CV or cover letter. The user saves it as
 * a PDF from Chrome's print dialog, then uploads it wherever it's needed.
 */
function PrintPage() {
  const doc = new URLSearchParams(location.search).get("doc") === "letter" ? "letter" : "cv";
  const [docs, setDocs] = useState<PreparedDocs | null | undefined>();
  const [profile, setProfile] = useState<Profile>();

  useEffect(() => {
    void Promise.all([preparedDocsItem.getValue(), profileItem.getValue()]).then(([d, p]) => {
      setDocs(d);
      setProfile(p);
      document.title = `${fullName(p) || "Alfred"} — ${doc === "cv" ? "CV" : "Cover letter"}${d?.company ? ` for ${d.company}` : ""}`;
    });
  }, [doc]);

  if (docs === undefined || !profile) return null;
  const cv = docs?.cv;
  const letter = docs?.letter;
  if ((doc === "cv" && !cv) || (doc === "letter" && !letter)) {
    return <p className="p-8">Nothing to print yet. Prepare the document in Alfred first.</p>;
  }

  const contact = [profile.personal.email, profile.personal.phone, [profile.personal.city, profile.personal.country].filter(Boolean).join(", "), profile.links.linkedin, profile.links.portfolio]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-dvh bg-white text-[#1a1a1a] print:min-h-0">
      <div className="mx-auto flex max-w-[52rem] items-center justify-between gap-4 px-8 py-4 print:hidden">
        <p className="text-[13px]">Choose “Save as PDF” as the destination in the print dialog.</p>
        <button type="button" onClick={() => window.print()} className="h-10 rounded-full bg-[#1a1a1a] px-4 text-[14px] font-bold text-white">
          Print or save as PDF
        </button>
      </div>
      <article className="mx-auto max-w-[52rem] px-12 py-10 text-[11pt] leading-[1.45] print:px-0 print:py-0">
        <header className="mb-6">
          <h1 className="text-[22pt] font-black leading-none tracking-[-0.02em]">{fullName(profile)}</h1>
          {doc === "cv" && cv && <p className="mt-1 text-[12pt] font-bold">{cv.headline}</p>}
          <p className="mt-1 text-[10pt] text-[#55554f]">{contact}</p>
        </header>
        {doc === "cv" && cv ? (
          <>
            <p>{cv.summary}</p>
            <h2 className="mt-6 text-[10pt] font-black uppercase tracking-[0.04em]">Experience</h2>
            {cv.roles.map((role) => (
              <section key={`${role.company}-${role.title}-${role.dates}`} className="mt-3 break-inside-avoid">
                <p className="flex justify-between gap-4 font-bold">
                  <span>
                    {role.title}, {role.company}
                  </span>
                  <span className="shrink-0 font-normal text-[#55554f]">{role.dates}</span>
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {role.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            ))}
            <h2 className="mt-6 text-[10pt] font-black uppercase tracking-[0.04em]">Skills</h2>
            <p className="mt-1">{cv.skills.join(", ")}</p>
          </>
        ) : (
          letter && (
            <div className="space-y-4">
              <p>{new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
              <p>{letter.greeting}</p>
              {letter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="whitespace-pre-line">{letter.signOff}</p>
            </div>
          )
        )}
      </article>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrintPage />
  </StrictMode>,
);
