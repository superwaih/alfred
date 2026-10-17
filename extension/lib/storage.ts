import { storage } from "wxt/utils/storage";
import { emptyProfile, type Profile } from "@shared/profile";
import type { TailoredCv, CoverLetter } from "@shared/ai";

/** The user's profile. Lives only in this browser; never synced to Alfred's servers. */
export const profileItem = storage.defineItem<Profile>("local:profile", {
  fallback: emptyProfile(),
});

/** The user's master CV file, attached to upload fields on application forms. */
export type StoredFile = { name: string; type: string; dataUrl: string; size: number };
export const resumeFileItem = storage.defineItem<StoredFile | null>("local:resumeFile", {
  fallback: null,
});

export type Provider = "deepseek" | "anthropic" | "openai" | "gemini" | "openai-compatible";

export type Settings = {
  /**
   * "auto": use Alfred credits while there are enough, then the user's own key.
   * "own-key": always use the user's own key, never spend credits.
   */
  aiMode: "auto" | "own-key";
  provider: Provider;
  keys: Partial<Record<Provider, string>>;
  /** Model per provider; blank means the provider default. */
  models: Partial<Record<Provider, string>>;
  /** Base URL for OpenAI-compatible providers (OpenRouter, Groq, local servers…). */
  compatibleBaseUrl: string;
  /** Mark filled fields on the page with coloured outlines. */
  highlightFields: boolean;
};

export const DEFAULT_MODELS: Record<Provider, string> = {
  deepseek: "deepseek-flash",
  anthropic: "claude-opus-5-5",
  openai: "gpt-5",
  gemini: "gemini-2.5-pro",
  "openai-compatible": "",
};

export const settingsItem = storage.defineItem<Settings>("local:settings", {
  fallback: {
    aiMode: "auto",
    provider: "deepseek",
    keys: {},
    models: {},
    compatibleBaseUrl: "https://openrouter.ai/api/v1",
    highlightFields: true,
  },
});

export type Session = {
  token: string;
  user: { id: string; email: string; name: string; credits: number; ownKeyUnlocked?: boolean };
};

export const sessionItem = storage.defineItem<Session | null>("local:session", {
  fallback: null,
});

/** The last documents Alfred prepared, so they survive closing the panel. */
export type PreparedDocs = {
  jobKey: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  cv: TailoredCv | null;
  letter: CoverLetter | null;
  updatedAt: string;
};

export const preparedDocsItem = storage.defineItem<PreparedDocs | null>("local:preparedDocs", {
  fallback: null,
});

/** The panel's colour theme. */
export type ColorTheme = "lagos" | "clay" | "neon";

/** Stored value; "system" | "dark" | "light" are from older versions. */
export const themeItem = storage.defineItem<ColorTheme | "system" | "dark" | "light">("local:theme", {
  fallback: "lagos",
});

/** Maps older stored values onto the current themes. */
export function resolveTheme(value: string | undefined): ColorTheme {
  if (value === "clay" || value === "neon" || value === "lagos") return value;
  return value === "dark" ? "neon" : "lagos";
}

/**
 * First-run setup: done once the user has added their CV and pressed
 * "Start applying", or skipped for now. (`confirmed` is from the older
 * five-step setup; anyone who finished it counts as done.)
 */
export type SetupState = {
  done?: boolean;
  skipped: boolean;
  confirmed?: { details: boolean; experience: boolean; preferences: boolean };
};

export const setupItem = storage.defineItem<SetupState>("local:setup", {
  fallback: { done: false, skipped: false },
});
