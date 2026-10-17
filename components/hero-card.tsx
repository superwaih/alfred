"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { candidate } from "@/lib/demo-data";
import { ApplicationCard, SubmitButton, type CardField } from "./application-card";

const known = [
  { label: "Full name", value: candidate.name },
  { label: "Email", value: candidate.email },
  { label: "Phone", value: candidate.phone },
  { label: "Years of experience", value: candidate.years },
];

/** Keeps digits only and groups them in threes: 1450000 → 1,450,000. */
function groupThousands(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * The page's live thing: the visitor asks Alfred to fill the form. Four
 * answers come from the saved profile; the salary is left for them.
 */
export function HeroCard() {
  const [filled, setFilled] = useState(false);
  const [salary, setSalary] = useState("");
  const reduceMotion = useReducedMotion();
  const answered = salary.trim().length > 0;

  const fields: CardField[] = [
    ...known.map((field, index) => ({
      label: field.label,
      state: filled ? ("filled" as const) : ("empty" as const),
      value: filled ? (
        <motion.span
          className="block truncate"
          initial={reduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 0.55, delay: index * 0.12, ease: [0.32, 0.72, 0, 1] }}
        >
          {field.value}
        </motion.span>
      ) : null,
    })),
    {
      label: "Expected monthly salary (₦)",
      state: !filled ? "empty" : answered ? "answered" : "needs-you",
      value: filled ? (
        <input
          aria-label="Expected monthly salary in naira"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Your figure"
          value={salary}
          onChange={(event) => setSalary(groupThousands(event.target.value))}
          className="w-full bg-transparent font-bold tabular-nums text-ink outline-none placeholder:font-normal placeholder:text-[#9a4a3a]"
        />
      ) : null,
    },
  ];

  const note = !filled
    ? "5 questions here. I know 4 of them."
    : answered
      ? "All answered. Read it over, then Submit."
      : "Salary is your call, not mine.";

  return (
    <ApplicationCard
      note={<span aria-live="polite">{note}</span>}
      fields={fields}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFilled((value) => !value);
              setSalary("");
            }}
            aria-pressed={filled}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[8px] bg-danfo px-3.5 text-[13px] font-bold text-night transition-transform duration-300 ease-spring hover:-translate-y-px active:scale-[0.97]"
          >
            {filled ? "Clear" : "Fill it, Alfred"}
          </button>
          <SubmitButton active={filled && answered} />
        </div>
      }
    />
  );
}
