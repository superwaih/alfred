import type { ParsedCv } from "@shared/ai";
import type { Profile } from "@shared/profile";
import { formatLinks } from "@shared/url";

function uid() {
  return crypto.randomUUID();
}

/** Copies what the CV states into the profile; existing answers win unless told otherwise. */
export function mergeCvIntoProfile(profile: Profile, cv: ParsedCv, cvText: string, replaceHistory: boolean): Profile {
  const keep = (current: string, incoming: string) => current || incoming;
  return {
    ...profile,
    personal: {
      ...profile.personal,
      firstName: keep(profile.personal.firstName, cv.firstName),
      lastName: keep(profile.personal.lastName, cv.lastName),
      email: keep(profile.personal.email, cv.email),
      phone: keep(profile.personal.phone, cv.phone),
      city: keep(profile.personal.city, cv.city),
      country: keep(profile.personal.country, cv.country),
    },
    links: formatLinks({
      linkedin: keep(profile.links.linkedin, cv.linkedin),
      portfolio: keep(profile.links.portfolio, cv.portfolio),
      github: keep(profile.links.github, cv.github),
      website: keep(profile.links.website, cv.website),
    }),
    headline: keep(profile.headline, cv.headline),
    summary: keep(profile.summary, cv.summary),
    work: replaceHistory || profile.work.length === 0 ? cv.work.map((w) => ({ ...w, id: uid() })) : profile.work,
    education: replaceHistory || profile.education.length === 0 ? cv.education.map((e) => ({ ...e, id: uid() })) : profile.education,
    skills: profile.skills.length ? profile.skills : cv.skills,
    resumeText: cvText,
  };
}
