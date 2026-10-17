import { STAGGER } from "@/lib/site";

const questions = [
  {
    q: "Does Alfred submit applications for me?",
    a: "No. Alfred fills the form and drafts your documents, then stops. You read everything and press Submit yourself, every time.",
  },
  {
    q: "What if Alfred doesn’t know an answer?",
    a: "It leaves the field empty and flags it rather than guessing. Salary expectations are the usual one. A question worded so unusually that it can’t match it to your profile is another.",
  },
  {
    q: "Will the tailored CV make things up?",
    a: "No. It works only from the experience in your profile: reordering, rephrasing and putting the most relevant parts first. If you didn’t do it, it isn’t on the CV.",
  },
  {
    q: "What goes into my profile?",
    a: "The things every application asks for: contact details, work history, education, links and the answers you find yourself typing again and again. You fill it in once and update it when something changes.",
  },
  {
    q: "Which job sites does it work on?",
    a: "Alfred works on supported job application pages in Chrome. When it recognises a form, it tells you what it can fill before it touches anything.",
  },
  {
    q: "Is this only for people in Nigeria?",
    a: "Bombing is a Nigerian idea, but the paperwork is the same everywhere. Alfred is for anyone sending a lot of applications.",
  },
];

export function Questions() {
  return (
    <section
      id="questions"
      data-chapter="coral"
      aria-labelledby="questions-title"
      className="bg-coral px-4 py-24 text-night sm:px-[4vw] lg:py-32"
    >
      <h2 id="questions-title" data-reveal className="display text-head">
        Fair questions
      </h2>
      <dl className="mt-16 grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {questions.map((item, index) => (
          <div key={item.q} data-reveal className={STAGGER[(index % 3) + 1]}>
            <dt className="text-lead font-bold leading-tight tracking-[-0.02em]">{item.q}</dt>
            <dd className="mt-3 text-body">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
