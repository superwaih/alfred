import type { Profile } from "@shared/profile";
import { formatUrl } from "@shared/url";

/**
 * An instant, offline first pass over CV text: the things a CV states in a
 * recognisable shape (email, phone, profile links, the name on the first
 * line). Only fills fields that are still empty. The AI pass does the rest.
 */
export function prefillFromCvText(profile: Profile, text: string): Profile {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(text)?.[0] ?? "";
  const phone = /(\+?\d[\d\s().-]{7,}\d)/.exec(text)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const link = (pattern: RegExp) => formatUrl(pattern.exec(text)?.[0]?.replace(/[).,;]+$/, "") ?? "");
  const linkedin = link(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i);
  const github = link(/(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i);
  const portfolio =
    link(/(https?:\/\/)?(www\.)?(behance\.net|dribbble\.com)\/[A-Za-z0-9_-]+\/?/i) ||
    // Any other web address in the CV is most likely a portfolio or personal site.
    (text.match(/https?:\/\/[^\s<>"')]+/gi) ?? [])
      .map((url) => url.replace(/[).,;]+$/, ""))
      .find((url) => !/linkedin\.com|github\.com|mailto:|google\.com\/maps|wa\.me|calendly\.com/i.test(url)) ||
    "";

  // The name is usually the first short line made of two to four words.
  const nameLine = lines.slice(0, 3).find((line) => /^[\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,3}$/u.test(line) && !line.includes("@"));
  const [firstName = "", ...rest] = nameLine ? nameLine.split(/\s+/) : [];
  const lastName = rest.join(" ");

  const keep = (current: string, found: string) => current || found;
  return {
    ...profile,
    personal: {
      ...profile.personal,
      firstName: keep(profile.personal.firstName, titleCase(firstName)),
      lastName: keep(profile.personal.lastName, titleCase(lastName)),
      email: keep(profile.personal.email, email),
      phone: keep(profile.personal.phone, phone),
    },
    links: {
      ...profile.links,
      linkedin: keep(profile.links.linkedin, linkedin),
      github: keep(profile.links.github, github),
      portfolio: keep(profile.links.portfolio, portfolio),
    },
    resumeText: text,
  };
}

/** "ADAEZE" → "Adaeze"; leaves mixed-case names (McDonald, de la Cruz) alone. */
function titleCase(word: string): string {
  if (!word || word !== word.toUpperCase()) return word;
  return word
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
