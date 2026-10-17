/**
 * Illustrative content for the product demonstrations. The candidate, company
 * and job are fictional so every chapter tells the same story.
 */

export const candidate = {
  name: "Adaeze Okafor",
  email: "adaeze@okafor.studio",
  phone: "+234 803 555 0142",
  location: "Lagos, Nigeria",
  years: "6",
  notice: "4 weeks",
  portfolio: "okafor.studio",
} as const;

export const job = {
  company: "Ledgerline",
  role: "Lead Product Designer",
  host: "ledgerline.jobs/apply",
} as const;

export type Topic = "payments" | "merchants" | "research" | "systems";

/** Words in a job ad that point at each part of the candidate's experience. */
export const topicKeywords: Record<Topic, string[]> = {
  payments: ["payment", "payout", "checkout", "transfer", "fintech", "card"],
  merchants: ["merchant", "small business", "small-business", "shop", "retailer", "seller"],
  research: ["research", "field", "interview", "user testing", "outside lagos"],
  systems: ["design system", "component", "consistency", "library"],
};

export const topicColour: Record<Topic, string> = {
  payments: "var(--danfo)",
  merchants: "color-mix(in oklab, var(--naija) 45%, white)",
  research: "color-mix(in oklab, var(--coral) 45%, white)",
  systems: "#c9c2b2",
};

export type CvLine = { id: string; text: string; topic?: Topic };

export const cvRoles: { title: string; dates: string; lines: CvLine[] }[] = [
  {
    title: "Senior Product Designer, Tisa Logistics",
    dates: "2022 to now",
    lines: [
      { id: "mentor", text: "Mentored two junior designers through their first year." },
      { id: "dashboard", text: "Designed the dashboard small retailers use to book and pay for deliveries.", topic: "merchants" },
      { id: "field", text: "Ran field research with drivers and shop owners in Kano, Aba and Ibadan.", topic: "research" },
      { id: "payouts", text: "Led the redesign of driver payouts: bank linking, schedules and receipts.", topic: "payments" },
    ],
  },
  {
    title: "Product Designer, Pocket",
    dates: "2019 to 2022",
    lines: [
      { id: "onboarding", text: "Redesigned onboarding for first-time account holders." },
      { id: "system", text: "Built and maintained Pocket’s design system across web and Android.", topic: "systems" },
      { id: "topup", text: "Designed the card top-up and bill payment flows.", topic: "payments" },
    ],
  },
];

export const coverLetter: CvLine[] = [
  { id: "l1", text: "I’ve spent three years making payments feel boring in the best way, most recently redesigning driver payouts at Tisa.", topic: "payments" },
  { id: "l2", text: "I designed the dashboard small retailers use to book and pay for deliveries, so I know who a merchant tool is really for.", topic: "merchants" },
  { id: "l3", text: "Much of that started outside Lagos, sitting with drivers in Kano and shop owners in Aba.", topic: "research" },
  { id: "l4", text: "Before Tisa I looked after Pocket’s design system, which is why your product’s consistency caught my eye.", topic: "systems" },
];

export const defaultJobAd =
  "We’re hiring a Lead Product Designer for merchant payments. You’ve shipped checkout or payout flows, you design for small-business owners, and you’ve done user research outside Lagos.";
