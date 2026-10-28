import type { FieldKey } from "@shared/fields";
import type { JobInfo, SiteKind } from "../messages";

/** Application platforms that embed their forms in iframes on company sites. */
export const FORM_HOSTS = /(^|\.)(greenhouse\.io|lever\.co|myworkdayjobs\.com|myworkday\.com|ashbyhq\.com|smartrecruiters\.com|workable\.com|recruitee\.com|bamboohr\.com|jobvite\.com|icims\.com|teamtailor\.com|personio\.(de|com))$/;

export function detectSite(url: URL, doc: Document): SiteKind {
  const host = url.hostname;
  if (/(^|\.)greenhouse\.io$/.test(host) || doc.querySelector("#grnhse_app, form#application-form[action*='greenhouse']")) {
    return "greenhouse";
  }
  if (/(^|\.)lever\.co$/.test(host)) return "lever";
  if (/(^|\.)myworkdayjobs\.com$/.test(host) || /(^|\.)myworkday\.com$/.test(host) || doc.querySelector("[data-automation-id='jobPostingHeader'], [data-automation-id^='legalNameSection']")) {
    return "workday";
  }
  return "generic";
}

/**
 * Field hints from attributes each platform uses consistently. These win over
 * label matching because they are the platform's own names for the field.
 */
const NAME_HINTS: Record<SiteKind, Record<string, FieldKey>> = {
  greenhouse: {
    first_name: "firstName",
    last_name: "lastName",
    preferred_name: "preferredName",
    email: "email",
    phone: "phone",
    resume: "resume",
    cover_letter: "coverLetter",
    "job_application[first_name]": "firstName",
    "job_application[last_name]": "lastName",
    "job_application[email]": "email",
    "job_application[phone]": "phone",
    "job_application[location]": "location",
    candidate_location: "location",
  },
  lever: {
    name: "fullName",
    email: "email",
    phone: "phone",
    org: "currentCompany",
    location: "location",
    resume: "resume",
    "urls[LinkedIn]": "linkedin",
    "urls[GitHub]": "github",
    "urls[Github]": "github",
    "urls[Portfolio]": "portfolio",
    "urls[Twitter]": "website",
    "urls[Other]": "website",
    comments: "whyCompany",
  },
  workday: {
    "legalNameSection_firstName": "firstName",
    "legalNameSection_lastName": "lastName",
    "legalNameSection_preferredName": "preferredName",
    email: "email",
    "phone-number": "phone",
    phoneNumber: "phone",
    "addressSection_addressLine1": "address",
    "addressSection_city": "city",
    "addressSection_postalCode": "postalCode",
    "file-upload-input-ref": "resume",
    linkedinQuestion: "linkedin",
  },
  generic: {},
};

export function hintFor(site: SiteKind, el: Element): FieldKey | null {
  const hints = NAME_HINTS[site];
  for (const attr of ["name", "id", "data-automation-id", "autocomplete"]) {
    const value = el.getAttribute(attr);
    if (value && hints[value]) return hints[value];
  }
  return autocompleteHint(el.getAttribute("autocomplete"));
}

/** The HTML autocomplete attribute is a reliable signal on any site. */
function autocompleteHint(value: string | null): FieldKey | null {
  switch ((value ?? "").toLowerCase()) {
    case "given-name":
      return "firstName";
    case "family-name":
      return "lastName";
    case "name":
      return "fullName";
    case "email":
      return "email";
    case "tel":
    case "tel-national":
      return "phone";
    case "address-line1":
    case "street-address":
      return "address";
    case "address-level2":
      return "city";
    case "address-level1":
      return "state";
    case "postal-code":
      return "postalCode";
    case "country":
    case "country-name":
      return "country";
    case "organization":
      return "currentCompany";
    case "organization-title":
      return "currentTitle";
    case "url":
      return "website";
    default:
      return null;
  }
}

/** The element on each platform that wraps one question and its label. */
export function questionContainer(site: SiteKind, el: Element): Element | null {
  switch (site) {
    case "greenhouse":
      return el.closest(".field, .application-field, .text-input-wrapper, .select__container, [class*='question'], fieldset");
    case "lever":
      return el.closest(".application-question, .application-field, li");
    case "workday":
      return el.closest("[data-automation-id^='formField'], [data-automation-id*='Question'], fieldset");
    default:
      return el.closest("fieldset, [role='group'], .form-group, .field, .form-field, .question, li, p, div");
  }
}

/** Reads the job posting from the page, preferring structured data. */
export function readJob(site: SiteKind, doc: Document, url: URL): JobInfo {
  const fromLd = jobFromJsonLd(doc);
  const text = (selector: string) => cleanText(doc.querySelector(selector)?.textContent ?? "");

  let title = fromLd?.title ?? "";
  let company = fromLd?.company ?? "";
  let description = fromLd?.description ?? "";

  if (site === "greenhouse") {
    title ||= text(".app-title, .job__title h1, h1");
    company ||= text(".company-name, .job__header .company") || companyFromTitle(doc.title);
    description ||= text("#content, .job__description, .job-post-content");
  } else if (site === "lever") {
    title ||= text(".posting-headline h2, .posting-header h2, h2");
    company ||= doc.querySelector<HTMLImageElement>(".main-header-logo img")?.alt?.replace(/ logo$/i, "") || companyFromTitle(doc.title);
    description ||= text(".posting-page .section-wrapper, [data-qa='job-description'], .content");
  } else if (site === "workday") {
    title ||= text("[data-automation-id='jobPostingHeader'], h2");
    company ||= companyFromTitle(doc.title);
    description ||= text("[data-automation-id='jobPostingDescription']");
  } else {
    title ||= text("h1") || doc.title;
    company ||= doc.querySelector<HTMLMetaElement>("meta[property='og:site_name']")?.content ?? "";
  }

  return {
    title: title.slice(0, 200),
    company: cleanCompany(company).slice(0, 200),
    description: description.slice(0, 20000),
    url: url.href,
  };
}

function cleanCompany(name: string): string {
  return name
    .replace(/^\s*at\s+/i, "")
    .replace(/\s+(careers|jobs|job board|hiring)\s*$/i, "")
    .trim();
}

function companyFromTitle(title: string): string {
  // "Job Application for Designer at Ledgerline" / "Ledgerline - Designer"
  const at = /\bat ([^|–—-]+)/i.exec(title);
  if (at?.[1]) return at[1].trim();
  return title.split(/[|–—-]/)[0]?.trim() ?? "";
}

type LdJob = { title: string; company: string; description: string };

function jobFromJsonLd(doc: Document): LdJob | null {
  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>("script[type='application/ld+json']"))) {
    try {
      const data: unknown = JSON.parse(script.textContent ?? "");
      const nodes = Array.isArray(data) ? data : [data, ...((data as { "@graph"?: unknown[] })?.["@graph"] ?? [])];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const n = node as Record<string, unknown>;
        const type = n["@type"];
        if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) {
          const org = n.hiringOrganization as { name?: string } | undefined;
          return {
            title: String(n.title ?? ""),
            company: String(org?.name ?? ""),
            description: htmlToText(String(n.description ?? "")),
          };
        }
      }
    } catch {
      // Malformed JSON-LD is common; ignore it and fall back to the page.
    }
  }
  return null;
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return cleanText(doc.body.textContent ?? "");
}

export function cleanText(text: string): string {
  return text.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();
}
