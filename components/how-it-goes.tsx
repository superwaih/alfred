import { candidate } from "@/lib/demo-data";
import { STAGGER } from "@/lib/site";
import { ApplicationCard, SubmitButton, type CardField } from "./application-card";

type Stage = {
  chapter: string;
  field: string;
  ink: string;
  clause: string;
  detail: string;
  note: string;
  fields: CardField[];
  submit: { active: boolean; label?: string };
};

const blank = (label: string): CardField => ({ label, state: "empty" });

const stages: Stage[] = [
  {
    chapter: "night",
    field: "bg-night",
    ink: "text-bone",
    clause: "First, you open an application.",
    detail: "Alfred recognises a supported application page and counts what it’s asking. Nothing is filled until you ask it to.",
    note: "12 questions found",
    fields: [blank("Full name"), blank("Email"), blank("Expected salary (₦)")],
    submit: { active: false },
  },
  {
    chapter: "coral",
    field: "bg-coral",
    ink: "text-night",
    clause: "Then Alfred fills what it knows.",
    detail: "Your name, contact details, work history, links and notice period go into the matching fields, straight from the profile you saved.",
    note: "11 answered from your profile",
    fields: [
      { label: "Full name", value: candidate.name, state: "filled" },
      { label: "Email", value: candidate.email, state: "filled" },
      blank("Expected salary (₦)"),
    ],
    submit: { active: false },
  },
  {
    chapter: "bone",
    field: "bg-bone",
    ink: "text-night",
    clause: "Then it asks what it shouldn’t guess.",
    detail: "Salary expectations, or any question it can’t match with confidence, stay empty and flagged, so you know exactly where to look.",
    note: "One for you: salary",
    fields: [
      { label: "Full name", value: candidate.name, state: "filled" },
      { label: "Email", value: candidate.email, state: "filled" },
      { label: "Expected salary (₦)", value: "", state: "needs-you" },
    ],
    submit: { active: false },
  },
  {
    chapter: "naija",
    field: "bg-naija",
    ink: "text-night",
    clause: "Then you read it and press Submit.",
    detail: "Read it through, change anything you like, then submit. Alfred never presses the button for you, on any application.",
    note: "Ready for your review",
    fields: [
      { label: "Full name", value: candidate.name, state: "filled" },
      { label: "Email", value: candidate.email, state: "filled" },
      { label: "Expected salary (₦)", value: "1,450,000", state: "answered" },
    ],
    submit: { active: true, label: "Submit application" },
  },
];

export function HowItGoes() {
  return (
    <section id="how-it-goes" aria-labelledby="how-title" className="grid lg:grid-cols-4">
      {stages.map((stage, index) => (
        <div
          key={stage.chapter}
          data-chapter={stage.chapter}
          className={`group relative flex min-h-[64svh] flex-col px-5 py-12 lg:min-h-[max(100svh,58rem)] lg:px-7 lg:pb-10 lg:pt-24 ${stage.field} ${stage.ink}`}
        >
          {index === 0 && (
            <h2 id="how-title" className="display text-head">
              How it goes
            </h2>
          )}

          {/* Phone: clause first, card below. Desktop: every card at the same height, clause at the foot. */}
          <div data-reveal className="order-1 mt-6 lg:order-3 lg:mt-auto lg:pt-10">
            <h3 className="max-w-[15ch] text-lead font-bold leading-[1.05] tracking-[-0.02em]">
              {stage.clause}
            </h3>
            <p className="mt-3 max-w-[30ch] text-body">{stage.detail}</p>
          </div>

          <div
            data-reveal
            className={`order-2 mt-8 w-[260px] transition-transform duration-150 ease-spring group-hover:-translate-y-1.5 lg:absolute lg:left-1/2 lg:top-[27%] lg:mt-0 lg:-translate-x-1/2 ${STAGGER[1]}`}
          >
            <ApplicationCard
              compact
              note={stage.note}
              fields={stage.fields}
              footer={<SubmitButton active={stage.submit.active} label={stage.submit.label} />}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
