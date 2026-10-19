import { INSTALL_URL, STAGGER } from "@/lib/site";
import { ActionLink } from "./action-link";
import { HeroCard } from "./hero-card";

export function Hero() {
  return (
    <section
      id="top"
      data-chapter="ground"
      aria-labelledby="hero-title"
      className="relative flex min-h-[100dvh] flex-col px-4 pb-10 pt-[calc(4rem+9vh)] sm:px-[3vw] lg:pb-[6vh]"
    >
      <h1 id="hero-title" className="display text-[17vw] sm:text-display">
        <span className="block text-ground-ink">Job hunt.</span>
        <span className="block text-signal">Handled.</span>
      </h1>

      <div className="mt-10 flex flex-1 flex-col gap-12 lg:mt-0 lg:flex-row lg:items-end lg:justify-between">
        <div data-reveal className={`max-w-[38rem] lg:pb-2 ${STAGGER[1]}`}>
          <p className="text-lead leading-snug text-ground-ink">
            Save your details once. Alfred fills the application forms, tailors your CV and drafts
            the cover letter.
          </p>
          <p className="mt-5 max-w-[34rem] text-body text-ground-ink">
            It’s a browser extension for people applying to a lot of jobs, and it runs in Chrome,
            Edge, Brave, Arc, Opera or any other browser built on Chromium. On an application page
            it fills every question it can answer from your profile, asks you about the ones it
            can’t, and leaves the Submit button to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ActionLink href={INSTALL_URL}>Add to your browser</ActionLink>
            <a
              href="#how-it-goes"
              className="text-body font-bold underline decoration-2 underline-offset-[6px] transition-colors hover:text-signal"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Z-axis cascade: the card leans on the poster on large screens only. */}
        <div
          data-reveal
          className={`w-full max-w-[24rem] text-ground-ink lg:-mt-[14vh] lg:mr-[1vw] lg:w-[23rem] lg:-rotate-[4deg] ${STAGGER[2]}`}
        >
          <HeroCard />
          <p className="mt-4 text-small text-ground-soft lg:rotate-[4deg]">
            Try it: press “Fill it, Alfred”, then answer the one question it leaves for you.
          </p>
        </div>
      </div>
    </section>
  );
}
