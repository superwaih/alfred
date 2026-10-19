"use client";

import { LayoutGroup, motion, MotionConfig } from "motion/react";
import { useMemo, useState } from "react";
import {
  candidate,
  coverLetter,
  cvRoles,
  defaultJobAd,
  topicColour,
  topicKeywords,
  type CvLine,
  type Topic,
} from "@/lib/demo-data";

function topicsIn(text: string): Set<Topic> {
  const lower = text.toLowerCase();
  const found = new Set<Topic>();
  (Object.keys(topicKeywords) as Topic[]).forEach((topic) => {
    if (topicKeywords[topic].some((word) => lower.includes(word))) found.add(topic);
  });
  return found;
}

/** Lines the job asks about move to the top; everything else keeps its order. */
function lead(lines: CvLine[], wanted: Set<Topic>) {
  return [...lines].sort(
    (a, b) => Number(Boolean(b.topic && wanted.has(b.topic))) - Number(Boolean(a.topic && wanted.has(a.topic))),
  );
}

export function Tailoring() {
  const [ad, setAd] = useState(defaultJobAd);
  const [doc, setDoc] = useState<"cv" | "letter">("cv");
  const wanted = useMemo(() => topicsIn(ad), [ad]);

  const line = (item: CvLine) =>
    item.topic && wanted.has(item.topic) ? (
      <span className="hl" style={{ "--hl": topicColour[item.topic] } as React.CSSProperties}>
        {item.text}
      </span>
    ) : (
      item.text
    );

  return (
    <MotionConfig reducedMotion="user">
      <section id="tailoring" aria-labelledby="tailoring-title" className="grid lg:grid-cols-2">
        {/* What the user hands over: the job ad, raw. */}
        <div data-chapter="night" className="relative flex min-h-[62svh] flex-col bg-night px-5 pb-36 pt-24 text-bone lg:min-h-[100svh] lg:px-[4vw] lg:pb-44 lg:pt-28">
          <p className="max-w-[34rem] text-lead font-bold leading-snug tracking-[-0.02em]">
            One CV for every job reads like one CV for every job.
          </p>
          <p className="mt-4 max-w-[34rem] text-body text-bone">
            Alfred reads the job description, works out what the employer is really asking for,
            and leads with the parts of your experience that answer it. The CV is reordered and
            reworded. The cover letter is written to this company, not “to whom it may concern”.
          </p>
          <label htmlFor="job-ad" className="mt-10 font-bold text-body text-bone">
            Try it: this is the job ad. Change it and watch the CV.
          </label>
          <textarea
            id="job-ad"
            data-ui
            value={ad}
            onChange={(event) => setAd(event.target.value)}
            rows={7}
            spellCheck={false}
            className="mt-4 w-full max-w-[34ch] resize-none rounded-[10px] bg-white/[0.06] p-4 text-[clamp(1.125rem,1.4vw,1.375rem)] leading-snug text-bone [color-scheme:dark] outline-none transition-colors focus:bg-white/[0.1]"
          />
          <h2
            id="tailoring-title"
            className="display absolute bottom-8 left-5 text-[11vw] lg:left-[4vw] lg:text-head"
          >
            Tailored<span className="sr-only"> to the job</span>
          </h2>
        </div>

        {/* What Alfred makes of it. */}
        <div data-chapter="bone" className="relative flex min-h-[62svh] flex-col items-center bg-bone px-5 pb-28 pt-16 text-night lg:min-h-[100svh] lg:items-start lg:px-[4vw] lg:pt-28">
          <p aria-hidden className="display mb-8 self-start text-[11vw] lg:hidden">
            to the job.
          </p>
          <div data-ui className="w-full max-w-[30rem] overflow-hidden rounded-[14px] bg-paper text-ink">
            <div className="flex bg-night p-1 text-[13px] font-bold text-bone" role="group" aria-label="Document">
              {(["cv", "letter"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={doc === value}
                  onClick={() => setDoc(value)}
                  className={`flex-1 rounded-[10px] py-2 transition-colors duration-300 ease-spring ${
                    doc === value ? "bg-danfo text-night" : "hover:bg-white/10"
                  }`}
                >
                  {value === "cv" ? "CV for Ledgerline" : "Cover letter, draft"}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 pt-4 text-[13px] leading-snug" aria-live="polite">
              {doc === "cv" ? (
                <LayoutGroup>
                  <p className="text-lg font-black tracking-[-0.02em]">{candidate.name}</p>
                  <p className="text-ink-soft">
                    Product Designer · {candidate.location} · {candidate.portfolio}
                  </p>
                  {cvRoles.map((role) => (
                    <div key={role.title} className="mt-4">
                      <p className="flex justify-between gap-3 font-bold">
                        <span>{role.title}</span>
                        <span className="shrink-0 font-normal text-ink-soft">{role.dates}</span>
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {lead(role.lines, wanted).map((item) => (
                          <motion.li
                            layout="position"
                            key={item.id}
                            transition={{ type: "spring", stiffness: 380, damping: 34 }}
                            className="pl-3 [text-indent:-0.75rem]"
                          >
                            – {line(item)}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </LayoutGroup>
              ) : (
                <div className="space-y-2.5 text-[14px]">
                  <p>Dear Ledgerline hiring team,</p>
                  {lead(coverLetter, wanted).map((item) => (
                    <p key={item.id}>{line(item)}</p>
                  ))}
                  <p>— {candidate.name}</p>
                </div>
              )}
              <p className="mt-4 bg-field px-3 py-2 text-ink-soft">
                Rewritten from your profile. Alfred reorders and rephrases; it never adds experience
                you don’t have.
              </p>
            </div>
          </div>
          <p
            aria-hidden
            className="display absolute bottom-8 right-5 hidden text-head lg:right-[4vw] lg:block"
          >
            to the job.
          </p>
        </div>
      </section>
    </MotionConfig>
  );
}
