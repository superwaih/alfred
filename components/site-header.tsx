"use client";

import { useEffect, useRef, useState } from "react";
import { INSTALL_URL } from "@/lib/site";
import { ActionLink } from "./action-link";
import { Wordmark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

/**
 * A plain bar that takes the field and ink of whichever chapter sits beneath
 * it. Chapters mark themselves with data-chapter.
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState("ground");

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"));
    // A band one pixel tall halfway down the header decides the chapter.
    const line = header.offsetHeight / 2;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setChapter((entry.target as HTMLElement).dataset.chapter ?? "ground");
          }
        }
      },
      { rootMargin: `-${line}px 0px -${window.innerHeight - line - 1}px 0px` },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={ref} data-on={chapter} className="chapter-header fixed inset-x-0 top-0 z-30">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-danfo focus:px-4 focus:py-2 focus:text-night"
      >
        Skip to content
      </a>
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-[3vw]">
        <a href="#top" aria-label="Alfred, back to top" className="text-xl">
          <Wordmark />
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <ActionLink href={INSTALL_URL} size="sm" tone="bg-[var(--h-ink)] text-[var(--h-bg)]">
            Add to Chrome
          </ActionLink>
        </div>
      </div>
    </header>
  );
}
