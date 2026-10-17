import { CHAPTERS, INSTALL_URL, PICTURE_CREDITS } from "@/lib/site";

// The name, built from blocks: each letter knocked out of its own colour.
const letters = [
  { letter: "A", block: "bg-danfo", height: "h-full" },
  { letter: "L", block: "bg-coral", height: "h-[74%]" },
  { letter: "F", block: "bg-naija", height: "h-[90%]" },
  { letter: "R", block: "bg-ground-ink", height: "h-[64%]" },
  { letter: "E", block: "bg-danfo", height: "h-[96%]" },
  { letter: "D", block: "bg-coral", height: "h-[80%]" },
];

export function SiteFooter() {
  return (
    <footer data-chapter="ground" className="px-4 pb-8 pt-24 sm:px-[3vw]">
      <div role="img" aria-label="Alfred" className="flex h-[22svh] items-end gap-1 lg:h-[34svh]">
        {letters.map(({ letter, block, height }) => (
          <span
            key={letter}
            aria-hidden
            className={`flex flex-1 items-end justify-center overflow-hidden ${block} ${height}`}
          >
            <span className="display translate-y-[0.08em] text-[clamp(3rem,13vw,13rem)] leading-[0.8] text-ground">
              {letter}
            </span>
          </span>
        ))}
      </div>

      <p className="mt-14 max-w-[56rem] text-lead font-bold leading-snug tracking-[-0.02em]">
        Alfred is a Chrome extension that fills job applications from your saved profile, tailors
        your CV and drafts your cover letter. You review it. You submit it.
      </p>

      <div className="mt-14 grid gap-10 text-small sm:grid-cols-2 lg:grid-cols-12">
        <nav aria-label="Chapters" className="lg:col-span-2">
          <ul className="space-y-2">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`} className="font-bold hover:text-signal">
                  {chapter.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lg:col-span-3">
          <p className="font-bold">Get Alfred</p>
          <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer" className="mt-2 block hover:text-signal">
            Chrome Web Store
          </a>
          <p className="mt-2 text-ground-soft">Works on supported job application pages.</p>
        </div>
        <div className="lg:col-span-4">
          <p className="font-bold">Pictures</p>
          <ul className="mt-2 space-y-2 text-ground-soft">
            {PICTURE_CREDITS.map((credit) => (
              <li key={credit.href}>
                <a href={credit.href} target="_blank" rel="noopener noreferrer" className="hover:text-ground-ink">
                  “{credit.title}”, {credit.creator}, {credit.licence}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-ground-soft lg:col-span-3">
          <p>Alfred is independent and not affiliated with DC or Warner Bros.</p>
          <p className="mt-2">The people and companies in the examples are fictional.</p>
        </div>
      </div>

      <div className="mt-14 flex items-center justify-between gap-4 text-small">
        <p className="text-ground-soft">© 2026 Alfred</p>
        <a
          href="#top"
          className="inline-flex h-10 items-center rounded-full bg-ground-ink px-4 font-bold text-ground transition-transform duration-300 ease-spring active:scale-[0.97]"
        >
          Back to top
        </a>
      </div>
    </footer>
  );
}
