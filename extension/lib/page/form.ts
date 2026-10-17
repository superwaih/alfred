import { matchLabel, savedAnswerFor, SPEC_BY_KEY, valueFor, type FieldKey } from "@shared/fields";
import type { Profile } from "@shared/profile";
import type { FieldReport, FieldStatus, PageReport, SiteKind } from "../messages";
import type { StoredFile } from "../storage";
import { cleanText, detectSite, hintFor, questionContainer, readJob } from "./sites";

type ControlKind = FieldReport["kind"];

type Control = {
  id: string;
  kind: ControlKind;
  /** The element itself, or every radio in a group (never empty). */
  elements: [HTMLElement, ...HTMLElement[]];
  label: string;
  required: boolean;
  key: FieldKey | null;
  options: string[];
  maxLength: number | null;
};

const SKIP_TYPES = new Set(["hidden", "submit", "button", "image", "reset", "password", "search"]);
const ID_ATTR = "data-alfred-id";
const STATUS_ATTR = "data-alfred-status";
let nextId = 1;

/** Statuses Alfred decided for each field in this page session. */
const decided = new Map<string, { status: FieldStatus; source: string }>();

// ---------------------------------------------------------------- scanning

function isVisible(el: HTMLElement): boolean {
  if (el.closest("[aria-hidden='true'], [hidden]")) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function looksLikeHoneypot(el: Element): boolean {
  const marker = `${el.getAttribute("name") ?? ""} ${el.id} ${el.className}`.toLowerCase();
  return /honeypot|hp_|bot[-_]?field|leave.?blank/.test(marker) || el.getAttribute("tabindex") === "-1";
}

function textOf(el: Element | null | undefined): string {
  return cleanText(el?.textContent ?? "");
}

/** The question a control belongs to, in the words the form uses. */
function labelFor(el: HTMLElement, site: SiteKind): string {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => textOf(document.getElementById(id)))
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }
  if (el.id) {
    const forLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (forLabel && textOf(forLabel)) return textOf(forLabel);
  }
  const wrapping = el.closest("label");
  if (wrapping && textOf(wrapping)) return textOf(wrapping);
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;

  const container = questionContainer(site, el);
  if (container) {
    const heading = container.querySelector("legend, label, .application-label, [class*='label'], [class*='question-text'], h3, h4");
    if (heading && textOf(heading)) return textOf(heading);
  }
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder;
  const name = el.getAttribute("name") ?? el.id;
  return name ? name.replace(/[_\-[\]]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim() : "";
}

function isRequired(el: HTMLElement, label: string): boolean {
  return (
    (el as HTMLInputElement).required ||
    el.getAttribute("aria-required") === "true" ||
    /[*✱＊]\s*$/.test(label) ||
    /\(required\)/i.test(label)
  );
}

function stamp(el: HTMLElement): string {
  let id = el.getAttribute(ID_ATTR);
  if (!id) {
    id = `f${nextId++}`;
    el.setAttribute(ID_ATTR, id);
  }
  return id;
}

function classify(site: SiteKind, el: HTMLElement, label: string, kind: ControlKind): FieldKey | null {
  const hinted = hintFor(site, el);
  if (hinted) return hinted;
  if (kind === "file") {
    const match = matchLabel(label);
    if (match?.key === "coverLetter") return "coverLetter";
    return "resume";
  }
  const match = matchLabel(label);
  return match && match.score >= 0.55 ? match.key : null;
}

function collectControls(site: SiteKind): Control[] {
  const controls: Control[] = [];
  const radioGroups = new Map<string, [HTMLInputElement, ...HTMLInputElement[]]>();

  const candidates = document.querySelectorAll<HTMLElement>(
    "input, textarea, select, [contenteditable='true'], [role='combobox'], button[aria-haspopup='listbox']",
  );

  for (const el of Array.from(candidates)) {
    if (looksLikeHoneypot(el)) continue;
    if (el instanceof HTMLInputElement) {
      const type = (el.type || "text").toLowerCase();
      if (SKIP_TYPES.has(type) || el.disabled || el.readOnly) continue;
      // File inputs are often hidden behind a custom drop zone; keep them.
      if (type !== "file" && !isVisible(el)) continue;
      if (type === "radio") {
        const group = el.name || stamp(el);
        const existing = radioGroups.get(group);
        if (existing) existing.push(el);
        else radioGroups.set(group, [el]);
        continue;
      }
      if (el.getAttribute("role") === "combobox" && site === "workday") {
        // Workday typeahead pickers don't accept typed values reliably.
        pushControl(controls, site, el, "custom");
        continue;
      }
      pushControl(controls, site, el, type === "file" ? "file" : type === "checkbox" ? "checkbox" : "text");
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.disabled || el.readOnly || !isVisible(el)) continue;
      pushControl(controls, site, el, "textarea");
    } else if (el instanceof HTMLSelectElement) {
      if (el.disabled || !isVisible(el)) continue;
      pushControl(controls, site, el, "select");
    } else if (el.isContentEditable) {
      if (!isVisible(el)) continue;
      pushControl(controls, site, el, "textarea");
    } else if (isVisible(el) && !el.closest("input")) {
      pushControl(controls, site, el, "custom");
    }
  }

  for (const radios of radioGroups.values()) {
    const first = radios[0];
    const container = first.closest("fieldset, [role='radiogroup']") ?? questionContainer(site, first);
    const legend = container?.querySelector("legend, label, [class*='label']");
    const label = textOf(legend) || labelFor(first, site);
    const id = stamp(first);
    radios.forEach((radio) => radio.setAttribute(ID_ATTR, id));
    controls.push({
      id,
      kind: "radio",
      elements: radios,
      label,
      required: radios.some((radio) => radio.required) || /[*✱＊]\s*$/.test(label),
      key: classify(site, first, label, "radio"),
      options: radios.map((radio) => labelFor(radio, site)),
      maxLength: null,
    });
  }
  return controls;
}

function pushControl(controls: Control[], site: SiteKind, el: HTMLElement, kind: ControlKind) {
  const label = labelFor(el, site);
  const maxLength = (el as HTMLInputElement).maxLength;
  controls.push({
    id: stamp(el),
    kind,
    elements: [el],
    label,
    required: isRequired(el, label),
    key: classify(site, el, label, kind),
    options: el instanceof HTMLSelectElement ? Array.from(el.options).map((option) => cleanText(option.text)) : [],
    maxLength: maxLength && maxLength > 0 ? maxLength : null,
  });
}

// ---------------------------------------------------------------- values

function currentValue(control: Control): string {
  const el = control.elements[0];
  switch (control.kind) {
    case "radio": {
      const index = control.elements.findIndex((radio) => radio instanceof HTMLInputElement && radio.checked);
      return index < 0 ? "" : control.options[index] ?? "on";
    }
    case "checkbox":
      return (el as HTMLInputElement).checked ? "Yes" : "";
    case "file":
      return Array.from((el as HTMLInputElement).files ?? []).map((file) => file.name).join(", ");
    case "select": {
      const select = el as HTMLSelectElement;
      const option = select.selectedOptions[0];
      // A first option like "Select…" or "--" is a placeholder, not an answer.
      if (!option || select.selectedIndex === 0 && (!option.value || /^(select|choose|please|--)/i.test(option.text.trim()))) return "";
      return cleanText(option.text);
    }
    case "custom":
      return cleanText(el.textContent ?? "").slice(0, 120);
    default:
      return el.isContentEditable ? cleanText(el.textContent ?? "") : (el as HTMLInputElement).value;
  }
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  el.focus();
  // Calling the prototype setter lets React-controlled inputs notice the change.
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.blur();
}

function bestOption(options: string[], value: string): number {
  const want = value.toLowerCase().trim();
  if (!want) return -1;
  const opts = options.map((option) => option.toLowerCase().trim());
  let index = opts.findIndex((option) => option === want);
  if (index < 0 && /^(yes|no)$/.test(want)) index = opts.findIndex((option) => option.startsWith(want));
  if (index < 0) index = opts.findIndex((option) => option.startsWith(want));
  if (index < 0) index = opts.findIndex((option) => option.length > 1 && (option.includes(want) || want.includes(option)));
  return index;
}

/** Puts a value into a control. Returns false if the control can't take it. */
function applyValue(control: Control, value: string): boolean {
  const el = control.elements[0];
  switch (control.kind) {
    case "text":
    case "textarea": {
      const text = control.maxLength ? value.slice(0, control.maxLength) : value;
      if (el.isContentEditable) {
        el.focus();
        el.textContent = text;
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        el.blur();
      } else {
        setNativeValue(el as HTMLInputElement, text);
      }
      return true;
    }
    case "select": {
      const select = el as HTMLSelectElement;
      const index = bestOption(control.options, value);
      if (index < 0) return false;
      select.focus();
      select.selectedIndex = index;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.blur();
      return true;
    }
    case "radio": {
      const radio = control.elements[bestOption(control.options, value)];
      if (!radio) return false;
      radio.click();
      return true;
    }
    case "checkbox": {
      const box = el as HTMLInputElement;
      const want = /^(yes|true)$/i.test(value);
      if (box.checked !== want) box.click();
      return true;
    }
    default:
      return false;
  }
}

function attachFile(control: Control, file: StoredFile): boolean {
  const input = control.elements[0] as HTMLInputElement;
  const [, base64 = ""] = file.dataUrl.split(",");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], file.name, { type: file.type }));
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return (input.files?.length ?? 0) > 0;
}

// ---------------------------------------------------------------- marks

const MARK_STYLE_ID = "alfred-mark-style";

function ensureMarkStyle() {
  if (document.getElementById(MARK_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = MARK_STYLE_ID;
  style.textContent = `
    [${STATUS_ATTR}="filled"], [${STATUS_ATTR}="attached"] { outline: 2px solid #149a52 !important; outline-offset: 2px !important; }
    [${STATUS_ATTR}="needs-you"], [${STATUS_ATTR}="unsupported"] { outline: 2px solid #f03d34 !important; outline-offset: 2px !important; }
    [${STATUS_ATTR}="draftable"] { outline: 2px dashed #f4b41a !important; outline-offset: 2px !important; }
    [${STATUS_ATTR}].alfred-pulse { animation: alfred-pulse 1.2s ease-out 2; }
    @keyframes alfred-pulse { 50% { outline-offset: 6px; } }
    @media (prefers-reduced-motion: reduce) { [${STATUS_ATTR}].alfred-pulse { animation: none; } }
  `;
  document.head.append(style);
}

function mark(control: Control, status: FieldStatus, enabled: boolean) {
  const target = control.kind === "radio" ? (control.elements[0].closest("fieldset, [role='radiogroup']") as HTMLElement | null) ?? control.elements[0] : control.elements[0];
  if (!enabled || status === "empty" || status === "kept") {
    target.removeAttribute(STATUS_ATTR);
    return;
  }
  ensureMarkStyle();
  target.setAttribute(STATUS_ATTR, status);
}

export function clearMarks() {
  document.querySelectorAll(`[${STATUS_ATTR}]`).forEach((el) => el.removeAttribute(STATUS_ATTR));
}

// ---------------------------------------------------------------- reports

function sourceFor(key: FieldKey | null): string {
  if (!key) return "";
  const spec = SPEC_BY_KEY[key];
  if (spec.policy === "ask") return "Your saved preference";
  if (key === "resume") return "Your saved CV";
  return "Your profile";
}

function toReport(control: Control): FieldReport {
  const spec = control.key ? SPEC_BY_KEY[control.key] : null;
  const value = currentValue(control);
  const remembered = decided.get(control.id);
  let status: FieldStatus;
  if (remembered && (value || remembered.status === "needs-you" || remembered.status === "draftable" || remembered.status === "unsupported")) {
    status = remembered.status;
  } else if (value) {
    status = "kept";
  } else {
    status = "empty";
  }
  return {
    id: control.id,
    label: control.label.slice(0, 200),
    key: control.key,
    policy: spec?.policy ?? "unknown",
    kind: control.kind,
    required: control.required,
    status,
    value: value.slice(0, 300),
    source: remembered?.source ?? "",
    options: control.options.slice(0, 50),
    maxLength: control.maxLength,
  };
}

export function scanPage(): PageReport {
  const url = new URL(location.href);
  const site = detectSite(url, document);
  const controls = collectControls(site);
  const fields = controls.map(toReport);
  const answerable = fields.filter((field) => field.kind !== "custom").length;
  return {
    site,
    url: url.href,
    isApplication: answerable >= 3 || controls.some((control) => control.key === "resume"),
    fields,
    job: readJob(site, document, url),
  };
}

/**
 * Fills every field Alfred can answer from the profile. Never overwrites a
 * value already in a field, never touches "ask" questions without an explicit
 * saved answer, and never submits anything.
 */
export function fillPage(profile: Profile, resume: StoredFile | null, highlight: boolean): PageReport {
  const url = new URL(location.href);
  const site = detectSite(url, document);
  const controls = collectControls(site);

  for (const control of controls) {
    const existing = currentValue(control);
    const spec = control.key ? SPEC_BY_KEY[control.key] : null;
    let status: FieldStatus = "empty";
    let source = "";

    if (control.kind === "custom") {
      status = control.required || control.key ? "unsupported" : "empty";
    } else if (existing) {
      status = "kept";
    } else if (control.kind === "file") {
      if (control.key === "resume" && resume && attachFile(control, resume)) {
        status = "attached";
        source = "Your saved CV";
      } else {
        status = control.required || control.key === "resume" ? "needs-you" : "empty";
      }
    } else {
      const saved = savedAnswerFor(control.label, profile);
      const fromProfile = control.key && spec?.policy !== "draft" ? valueFor(control.key, profile) : null;
      const value = fromProfile ?? saved;
      if (value && applyValue(control, value)) {
        status = "filled";
        source = fromProfile ? sourceFor(control.key) : "Your saved answer";
      } else if (spec?.policy === "draft" || (!control.key && control.kind === "textarea")) {
        status = "draftable";
      } else if (spec?.policy === "ask" || control.required) {
        status = "needs-you";
      }
    }

    decided.set(control.id, { status, source });
    mark(control, status, highlight);
  }

  return { ...scanPage(), site };
}

/** Writes a value the user (or a confirmed AI draft) chose into one field. */
export function setField(id: string, value: string, highlight: boolean): boolean {
  const site = detectSite(new URL(location.href), document);
  const control = collectControls(site).find((candidate) => candidate.id === id);
  if (!control || !applyValue(control, value)) return false;
  decided.set(id, { status: "filled", source: "You" });
  mark(control, "filled", highlight);
  return true;
}

/** Attaches the saved CV to one file field the user picked. */
export function attachCv(id: string, file: StoredFile, highlight: boolean, source = "Your saved CV"): boolean {
  const site = detectSite(new URL(location.href), document);
  const control = collectControls(site).find((candidate) => candidate.id === id);
  if (!control || control.kind !== "file" || !attachFile(control, file)) return false;
  decided.set(id, { status: "attached", source });
  mark(control, "attached", highlight);
  return true;
}

export function focusField(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[${ID_ATTR}="${CSS.escape(id)}"]`);
  if (!el) return false;
  const target = el.closest("fieldset") ?? el;
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
  target.classList.add("alfred-pulse");
  window.setTimeout(() => target.classList.remove("alfred-pulse"), 2600);
  return true;
}
