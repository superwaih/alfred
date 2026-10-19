import { BROWSERS, INSTALL_URL } from "@/lib/site";
import { ArrowUpRight } from "./brand";

/** The whole band is the link. On hover and focus the field and the word swap, instantly. */
export function InstallBand() {
  return (
    <a
      href={INSTALL_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-chapter="danfo"
      className="group relative flex min-h-[46svh] flex-col justify-between bg-danfo px-4 pb-6 pt-28 text-night outline-offset-[-6px] hover:bg-night hover:text-danfo focus-visible:bg-night focus-visible:text-danfo sm:px-[3vw] lg:min-h-[72svh]"
    >
      <span className="flex items-start justify-between gap-6">
        <span className="max-w-[54rem] text-lead font-bold leading-snug tracking-[-0.02em]">
          Your job hunt, handled. Add Alfred to your browser, save your profile once, and let the
          next application start from your answers instead of a blank page.
          <span className="mt-4 block text-small font-bold uppercase tracking-[0.12em]">
            {BROWSERS.join(" · ")} · any Chromium browser
          </span>
        </span>
        <ArrowUpRight className="h-8 w-8 shrink-0 transition-transform duration-500 ease-spring group-hover:-translate-y-1 group-hover:translate-x-1 lg:h-12 lg:w-12" />
      </span>
      <span className="display block text-[23vw] leading-[0.78]">Install</span>
      <span className="sr-only">(opens the Chrome Web Store in a new tab. It installs into any Chromium browser.)</span>
    </a>
  );
}
