"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/** Media query under which scroll-linked motion is allowed. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
