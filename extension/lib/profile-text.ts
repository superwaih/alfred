import { profileAsText, type Profile } from "@shared/profile";

/** What the AI sees of the candidate: the structured profile plus their own CV text. */
export function profileTextFor(profile: Profile): string {
  const base = profileAsText(profile);
  const cv = profile.resumeText.trim();
  return (cv ? `${base}\n\nFULL CV AS WRITTEN BY THE CANDIDATE:\n${cv}` : base).slice(0, 30000);
}

/** Enough of a profile to fill a form with. */
export function profileReady(profile: Profile): boolean {
  return Boolean(profile.personal.firstName && profile.personal.email);
}
