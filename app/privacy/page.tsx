import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy — Alfred",
  description: "What the Alfred browser extension and its website collect, where it goes, and how to have it deleted.",
};

const UPDATED = "18 October 2026";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "The short version",
    body: (
      <>
        <p>
          Your profile, your CV file and any personal AI key stay in your browser. Alfred’s server keeps your account
          (name, email, a hashed password and your credit balance) and a log of what you spent credits on. When you
          ask Alfred to write something, the text it needs goes to an AI provider to be written, and isn’t kept
          afterwards. We don’t sell data, show ads, or track you across sites.
        </p>
      </>
    ),
  },
  {
    title: "Kept in your browser",
    body: (
      <ul>
        <li>Your profile: contact details, work history, education, links, skills and saved answers.</li>
        <li>The CV file you upload, and the text read from it.</li>
        <li>Tailored CVs and cover letters Alfred prepared for you.</li>
        <li>Your settings, and your own AI provider key if you add one.</li>
      </ul>
    ),
  },
  {
    title: "Kept on Alfred’s server",
    body: (
      <ul>
        <li>Your account: name, email address, a scrypt hash of your password, whether you verified your email, and when you last signed in.</li>
        <li>Your credit balance and a ledger of each change: purchases, refunds and which kind of AI task used credits.</li>
        <li>An activity log of sign-ins and AI tasks (the task name and whether it worked, never its content).</li>
        <li>Short-lived sign-in codes and rate-limit counters, which delete themselves.</li>
      </ul>
    ),
  },
  {
    title: "What the extension reads on web pages",
    body: (
      <p>
        Alfred can run on any site so it works on any careers page, but it only reads a page when you open its side
        panel there. It reads the form’s questions and the job’s title, company and description, so it can match them
        to your profile. Page content is sent off your device only when you ask for an AI task, and then only the job
        details that task needs.
      </p>
    ),
  },
  {
    title: "AI providers",
    body: (
      <>
        <p>
          When you use Alfred credits, the request (the relevant parts of your profile and the job description) goes
          through Alfred’s server to DeepSeek, which writes the result. Alfred doesn’t store the request or the result
          on its server.
        </p>
        <p>
          When you use your own key, the extension sends the request straight from your browser to the provider you
          chose (DeepSeek, Anthropic, OpenAI, Google or another compatible service), under that provider’s terms.
          Alfred’s server never sees it.
        </p>
      </>
    ),
  },
  {
    title: "Other services",
    body: (
      <ul>
        <li>Polar handles credit purchases. Alfred never sees your card details; it receives the order and the credits bought.</li>
        <li>Resend delivers sign-in and password-reset codes to your email address.</li>
        <li>A MongoDB database host stores the account data listed above.</li>
      </ul>
    ),
  },
  {
    title: "Your choices",
    body: (
      <>
        <p>
          You can edit or clear your profile in the extension at any time; removing the extension deletes everything
          kept in your browser. To delete your account and its history from Alfred’s server, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on the account and we’ll do it within
          30 days.
        </p>
        <p>
          Alfred’s use of information received from Google APIs adheres to the Chrome Web Store User Data Policy,
          including the Limited Use requirements. Data is used only to provide Alfred’s single purpose: helping you fill
          in job applications and prepare documents for them.
        </p>
      </>
    ),
  },
  {
    title: "Changes",
    body: <p>If this policy changes, the date below changes with it, and anything significant is announced in the extension.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-ground px-4 pb-24 pt-8 text-ground-ink sm:px-[4vw]">
      <Link href="/" className="text-xl" aria-label="Alfred, home">
        <Wordmark />
      </Link>
      <h1 className="display mt-20 text-head">Privacy</h1>
      <p className="mt-6 max-w-[40rem] text-lead font-bold leading-snug tracking-[-0.02em]">
        What Alfred keeps, where it goes, and how to get rid of it.
      </p>
      <div className="mt-16 max-w-[44rem] space-y-14">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lead font-bold leading-tight tracking-[-0.02em]">{section.title}</h2>
            <div className="mt-4 space-y-4 text-body text-ground-soft [&_a]:font-bold [&_a]:text-ground-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
              {section.body}
            </div>
          </section>
        ))}
        <p className="text-small text-ground-soft">Last updated {UPDATED}.</p>
      </div>
    </main>
  );
}
