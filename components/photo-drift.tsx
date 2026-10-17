"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_OK } from "@/lib/gsap";

/**
 * A photograph that settles as it passes: a slow scale-down tied to scroll.
 * The frame clips it, so nothing around it moves.
 */
export function PhotoDrift({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = frame.current;
    const picture = el?.firstElementChild;
    if (!el || !picture) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        picture,
        { scale: 1.18, yPercent: -4 },
        {
          scale: 1,
          yPercent: 4,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={frame} className={`overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
