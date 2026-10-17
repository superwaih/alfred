import { currentRole, fullName, type Profile, type Stance, yearsOfExperience } from "./profile";
import { formatUrl } from "./url";

/**
 * Every kind of question Alfred knows how to recognise on an application form,
 * the words forms use for it, and what Alfred does with it.
 *
 * - "fill": answer straight from the profile.
 * - "ask": never guess; leave empty and flag for the user unless the profile
 *   holds an explicit answer (salary, visa and sponsorship questions).
 * - "draft": free text Alfred can write with AI, always marked as a draft.
 * - "file": a document upload (the CV).
 */
export type FieldPolicy = "fill" | "ask" | "draft" | "file";

export type FieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "preferredName"
  | "email"
  | "phone"
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "address"
  | "location"
  | "linkedin"
  | "portfolio"
  | "github"
  | "website"
  | "currentTitle"
  | "currentCompany"
  | "yearsExperience"
  | "noticePeriod"
  | "school"
  | "degree"
  | "salary"
  | "workAuthorization"
  | "sponsorship"
  | "relocation"
  | "coverLetter"
  | "whyCompany"
  | "resume";

export type FieldSpec = {
  key: FieldKey;
  label: string;
  policy: FieldPolicy;
  /** Lower-case phrases; a label containing one is a candidate match. */
  phrases: string[];
  /** Tokens that rule a candidate out, e.g. "company" keeps "name" off fullName. */
  exclude?: string[];
};

export const FIELD_SPECS: FieldSpec[] = [
  { key: "firstName", label: "First name", policy: "fill", phrases: ["first name", "given name", "firstname", "forename", "legal first"] },
  { key: "lastName", label: "Last name", policy: "fill", phrases: ["last name", "surname", "family name", "lastname", "legal last"] },
  { key: "preferredName", label: "Preferred name", policy: "fill", phrases: ["preferred name", "preferred first", "nickname", "goes by"] },
  {
    key: "fullName",
    label: "Full name",
    policy: "fill",
    phrases: ["full name", "your name", "legal name", "name"],
    exclude: ["company", "employer", "school", "university", "reference", "referrer", "first", "last", "preferred", "user", "manager", "file"],
  },
  { key: "email", label: "Email", policy: "fill", phrases: ["email", "e-mail"], exclude: ["confirm", "reference"] },
  { key: "phone", label: "Phone", policy: "fill", phrases: ["phone", "mobile", "telephone", "cell"], exclude: ["type", "extension", "country code"] },
  { key: "address", label: "Street address", policy: "fill", phrases: ["street address", "address line 1", "address 1", "home address", "street"] },
  { key: "city", label: "City", policy: "fill", phrases: ["city", "town"] },
  { key: "state", label: "State or region", policy: "fill", phrases: ["state", "province", "region", "county"], exclude: ["statement", "united states"] },
  { key: "postalCode", label: "Postal code", policy: "fill", phrases: ["postal code", "zip", "postcode"] },
  { key: "country", label: "Country", policy: "fill", phrases: ["country"], exclude: ["code", "phone"] },
  { key: "location", label: "Location", policy: "fill", phrases: ["location", "where are you based", "current location", "where do you live", "based in"], exclude: ["preferred", "relocat", "willing"] },
  { key: "linkedin", label: "LinkedIn", policy: "fill", phrases: ["linkedin"] },
  { key: "github", label: "GitHub", policy: "fill", phrases: ["github"] },
  { key: "portfolio", label: "Portfolio", policy: "fill", phrases: ["portfolio", "behance", "dribbble"] },
  { key: "website", label: "Website", policy: "fill", phrases: ["website", "personal site", "other url", "url", "blog"], exclude: ["linkedin", "github", "portfolio"] },
  { key: "currentTitle", label: "Current title", policy: "fill", phrases: ["current title", "job title", "current role", "current position", "present position", "title"], exclude: ["desired", "applying"] },
  { key: "currentCompany", label: "Current company", policy: "fill", phrases: ["current company", "current employer", "employer", "company name", "where do you work"], exclude: ["previous", "desired"] },
  { key: "yearsExperience", label: "Years of experience", policy: "fill", phrases: ["years of experience", "years experience", "how many years", "years of professional"] },
  { key: "noticePeriod", label: "Notice period", policy: "fill", phrases: ["notice period", "earliest start", "start date", "when can you start", "availability to start"] },
  { key: "school", label: "School", policy: "fill", phrases: ["school", "university", "college", "institution"] },
  { key: "degree", label: "Degree", policy: "fill", phrases: ["degree", "qualification"], exclude: ["level of"] },
  { key: "salary", label: "Salary expectation", policy: "ask", phrases: ["salary", "compensation", "pay expectation", "expected pay", "desired pay", "rate expectation", "remuneration"] },
  { key: "workAuthorization", label: "Work authorisation", policy: "ask", phrases: ["authorized to work", "authorised to work", "eligible to work", "right to work", "work permit", "legally"] },
  { key: "sponsorship", label: "Visa sponsorship", policy: "ask", phrases: ["sponsorship", "sponsor", "visa"] },
  { key: "relocation", label: "Relocation", policy: "ask", phrases: ["relocate", "relocation"] },
  { key: "coverLetter", label: "Cover letter", policy: "draft", phrases: ["cover letter", "covering letter", "motivation letter"] },
  { key: "whyCompany", label: "Why this company", policy: "draft", phrases: ["why do you want", "why are you interested", "why us", "why join", "what interests you", "why this role", "additional information", "anything else"] },
  { key: "resume", label: "Resume / CV", policy: "file", phrases: ["resume", "résumé", "cv", "curriculum vitae"] },
];

export const SPEC_BY_KEY: Record<FieldKey, FieldSpec> = Object.fromEntries(
  FIELD_SPECS.map((spec) => [spec.key, spec]),
) as Record<FieldKey, FieldSpec>;

/** Normalises a form label for matching: lower case, plain spaces, no asterisks. */
export function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[*✱＊:?()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type LabelMatch = { key: FieldKey; score: number };

/**
 * Scores a label against every spec. Longer, more specific phrases score
 * higher; an exact match beats a containment match.
 */
export function matchLabel(rawLabel: string): LabelMatch | null {
  const label = normaliseLabel(rawLabel);
  if (!label) return null;
  let best: LabelMatch | null = null;
  for (const spec of FIELD_SPECS) {
    if (spec.exclude?.some((word) => label.includes(word))) continue;
    for (const phrase of spec.phrases) {
      if (!containsPhrase(label, phrase)) continue;
      const exact = label === phrase;
      // Specific phrases (more characters) win over generic ones like "name".
      const score = (exact ? 1 : 0.6) + Math.min(phrase.length, 30) / 100 - Math.min(label.length, 120) / 1000;
      if (!best || score > best.score) best = { key: spec.key, score };
    }
  }
  return best;
}

function containsPhrase(label: string, phrase: string): boolean {
  if (phrase.length <= 3) {
    // Short phrases (cv, url, zip) must stand alone as words.
    return new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(label);
  }
  return label.includes(phrase);
}

function stanceAnswer(stance: Stance): string | null {
  if (stance === "yes") return "Yes";
  if (stance === "no") return "No";
  return null;
}

/**
 * The value Alfred would put in a field, or null when it should not answer
 * (missing from the profile, or a question the user must answer).
 */
export function valueFor(key: FieldKey, profile: Profile): string | null {
  const p = profile.personal;
  const role = currentRole(profile);
  const value = (() => {
    switch (key) {
      case "firstName":
        return p.firstName;
      case "lastName":
        return p.lastName;
      case "fullName":
        return fullName(profile);
      case "preferredName":
        return p.preferredName || p.firstName;
      case "email":
        return p.email;
      case "phone":
        return p.phone;
      case "address":
        return p.address;
      case "city":
        return p.city;
      case "state":
        return p.state;
      case "postalCode":
        return p.postalCode;
      case "country":
        return p.country;
      case "location":
        return [p.city, p.country].filter(Boolean).join(", ");
      case "linkedin":
        return formatUrl(profile.links.linkedin);
      case "github":
        return formatUrl(profile.links.github);
      case "portfolio":
        return formatUrl(profile.links.portfolio || profile.links.website);
      case "website":
        return formatUrl(profile.links.website || profile.links.portfolio);
      case "currentTitle":
        return role?.title ?? "";
      case "currentCompany":
        return role?.company ?? "";
      case "yearsExperience": {
        const years = yearsOfExperience(profile);
        return years === null ? "" : String(years);
      }
      case "noticePeriod":
        return profile.preferences.noticePeriod;
      case "school":
        return profile.education[0]?.school ?? "";
      case "degree":
        return profile.education[0] ? [profile.education[0].degree, profile.education[0].field].filter(Boolean).join(", ") : "";
      case "salary":
        return profile.preferences.salaryExpectation;
      case "workAuthorization":
        return stanceAnswer(profile.preferences.workAuthorization) ?? "";
      case "sponsorship":
        return stanceAnswer(profile.preferences.needsSponsorship) ?? "";
      case "relocation":
        return stanceAnswer(profile.preferences.willingToRelocate) ?? "";
      case "coverLetter":
      case "whyCompany":
      case "resume":
        return "";
    }
  })();
  return value && value.trim() ? value.trim() : null;
}

/** A saved answer whose question shares enough words with the form's label. */
export function savedAnswerFor(rawLabel: string, profile: Profile): string | null {
  const label = new Set(significantWords(rawLabel));
  if (label.size === 0) return null;
  let best: { answer: string; overlap: number } | null = null;
  for (const saved of profile.answers) {
    const words = significantWords(saved.question);
    if (words.length === 0) continue;
    const overlap = words.filter((word) => label.has(word)).length / words.length;
    if (overlap >= 0.7 && (!best || overlap > best.overlap)) best = { answer: saved.answer, overlap };
  }
  return best?.answer ?? null;
}

const STOP_WORDS = new Set(["the", "a", "an", "you", "your", "are", "do", "is", "to", "of", "in", "for", "and", "or", "this", "with", "have", "what", "how", "please"]);

function significantWords(text: string): string[] {
  return normaliseLabel(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}
