import type { FieldKey, FieldPolicy } from "@shared/fields";
import type { StoredFile } from "./storage";

/** Where the open page's form comes from. */
export type SiteKind = "greenhouse" | "lever" | "workday" | "generic";

/**
 * - filled: Alfred put a value in.
 * - kept: the field already had a value, so Alfred left it alone.
 * - needs-you: Alfred won't or can't answer; the user must.
 * - draftable: free text Alfred can draft with AI on request.
 * - attached: a file was attached.
 * - unsupported: a control Alfred can't operate (custom widgets); user fills it.
 */
export type FieldStatus = "empty" | "filled" | "kept" | "needs-you" | "draftable" | "attached" | "unsupported";

export type FieldReport = {
  /** Stable id Alfred stamps on the element (data-alfred-id). */
  id: string;
  label: string;
  key: FieldKey | null;
  policy: FieldPolicy | "unknown";
  kind: "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "custom";
  required: boolean;
  status: FieldStatus;
  /** The value now in the field (truncated for display). */
  value: string;
  /** Where the value came from, for the "from your profile" label. */
  source: string;
  /** Choices, for selects and radio groups. */
  options: string[];
  maxLength: number | null;
};

export type JobInfo = {
  title: string;
  company: string;
  description: string;
  url: string;
};

export type PageReport = {
  site: SiteKind;
  url: string;
  /** True when the page looks like an application form at all. */
  isApplication: boolean;
  fields: FieldReport[];
  job: JobInfo;
};

/** Messages the side panel sends to the content script in the active tab. */
export type ContentRequest =
  | { type: "alfred:scan" }
  | { type: "alfred:fill" }
  | { type: "alfred:clear-marks" }
  | { type: "alfred:set-field"; id: string; value: string }
  /** Attaches a CV to one upload field: the given file, or the saved one. */
  | { type: "alfred:attach-cv"; id: string; file?: StoredFile }
  | { type: "alfred:focus-field"; id: string };

export type ContentResponse<T extends ContentRequest["type"]> = T extends "alfred:set-field" | "alfred:attach-cv"
  ? { ok: boolean; report: PageReport }
  : T extends "alfred:focus-field" | "alfred:clear-marks"
    ? { ok: boolean }
    : PageReport;

/** Sent by the content script when the form changes (multi-step forms). */
export type PageChanged = { type: "alfred:page-changed"; url: string };
