"use client";

import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/** Lights on, lights off: the butler's switch. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "dark");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-small font-bold transition-[background-color,transform] duration-300 ease-spring hover:bg-current/10 active:scale-[0.97]"
    >
      <span
        aria-hidden
        className={`h-3.5 w-3.5 rounded-full border-2 border-current transition-colors duration-300 ${
          theme === "dark" ? "bg-transparent" : "bg-current"
        }`}
      />
      <span className="hidden sm:inline">{theme === "dark" ? "Lights on" : "Lights off"}</span>
    </button>
  );
}
