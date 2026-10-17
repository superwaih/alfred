/**
 * The candidate profile: everything a user tells Alfred once. Shared by the
 * extension (where it lives, in chrome.storage.local) and the API (which only
 * ever sees the parts a request needs).
 */

export type WorkEntry = {
  id: string;
  title: string;
  company: string;
  location: string;
  /** "2022-03" style; free text is tolerated. */
  start: string;
  end: string;
  current: boolean;
  /** One achievement or responsibility per line. */
  highlights: string[];
};

export type EducationEntry = {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
};

/** An answer the user gives often, matched against form questions by wording. */
export type SavedAnswer = {
  id: string;
  question: string;
  answer: string;
};

/** Yes / no / leave-it-to-me for questions with legal or money weight. */
export type Stance = "yes" | "no" | "ask";

export type Profile = {
  personal: {
    firstName: string;
    lastName: string;
    preferredName: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    address: string;
  };
  links: {
    linkedin: string;
    portfolio: string;
    github: string;
    website: string;
  };
  headline: string;
  summary: string;
  work: WorkEntry[];
  education: EducationEntry[];
  skills: string[];
  preferences: {
    noticePeriod: string;
    /** Left empty on purpose: Alfred asks rather than guesses salary. */
    salaryExpectation: string;
    workAuthorization: Stance;
    needsSponsorship: Stance;
    willingToRelocate: Stance;
  };
  answers: SavedAnswer[];
  /** Plain text of the master CV, used for tailoring. */
  resumeText: string;
  updatedAt: string;
};

export function emptyProfile(): Profile {
  return {
    personal: {
      firstName: "",
      lastName: "",
      preferredName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      address: "",
    },
    links: { linkedin: "", portfolio: "", github: "", website: "" },
    headline: "",
    summary: "",
    work: [],
    education: [],
    skills: [],
    preferences: {
      noticePeriod: "",
      salaryExpectation: "",
      workAuthorization: "ask",
      needsSponsorship: "ask",
      willingToRelocate: "ask",
    },
    answers: [],
    resumeText: "",
    updatedAt: new Date(0).toISOString(),
  };
}

/** Whole years of experience across work entries, overlaps counted once. */
export function yearsOfExperience(profile: Profile, now = new Date()): number | null {
  const ranges = profile.work
    .map((entry) => {
      const start = parseMonth(entry.start);
      const end = entry.current ? now : parseMonth(entry.end);
      return start && end && end > start ? ([start.getTime(), end.getTime()] as const) : null;
    })
    .filter((range): range is readonly [number, number] => range !== null)
    .sort((a, b) => a[0] - b[0]);
  const [first, ...rest] = ranges;
  if (!first) return null;

  let total = 0;
  let [curStart, curEnd] = first;
  for (const [start, end] of rest) {
    if (start <= curEnd) {
      curEnd = Math.max(curEnd, end);
    } else {
      total += curEnd - curStart;
      [curStart, curEnd] = [start, end];
    }
  }
  total += curEnd - curStart;
  return Math.floor(total / (365.25 * 24 * 3600 * 1000));
}

function parseMonth(value: string): Date | null {
  const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), match[2] ? Number(match[2]) - 1 : 0, 1);
}

export function fullName(profile: Profile): string {
  return [profile.personal.firstName, profile.personal.lastName].filter(Boolean).join(" ");
}

export function currentRole(profile: Profile): WorkEntry | undefined {
  return profile.work.find((entry) => entry.current) ?? profile.work[0];
}

/** A plain-text rendering of the profile, used when no master CV text exists. */
export function profileAsText(profile: Profile): string {
  const lines: string[] = [];
  lines.push(fullName(profile));
  if (profile.headline) lines.push(profile.headline);
  const contact = [profile.personal.email, profile.personal.phone, profile.personal.city, profile.personal.country]
    .filter(Boolean)
    .join(" · ");
  if (contact) lines.push(contact);
  if (profile.summary) lines.push("", "SUMMARY", profile.summary);
  if (profile.work.length) {
    lines.push("", "EXPERIENCE");
    for (const entry of profile.work) {
      lines.push(`${entry.title}, ${entry.company} (${entry.start} to ${entry.current ? "present" : entry.end})`);
      for (const highlight of entry.highlights) lines.push(`- ${highlight}`);
    }
  }
  if (profile.education.length) {
    lines.push("", "EDUCATION");
    for (const entry of profile.education) {
      lines.push(`${entry.degree} ${entry.field}, ${entry.school} (${entry.start} to ${entry.end})`);
    }
  }
  if (profile.skills.length) lines.push("", "SKILLS", profile.skills.join(", "));
  return lines.join("\n");
}
