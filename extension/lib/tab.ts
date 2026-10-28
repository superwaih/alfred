import { browser } from "wxt/browser";
import type { ContentRequest, ContentResponse, PageReport } from "./messages";
import { FORM_HOSTS } from "./page/sites";
import type { StoredFile } from "./storage";

export type ActivePage = {
  tabId: number;
  /** Frame holding the application form (0 is the top page). */
  frameId: number;
  report: PageReport;
};

export class PageUnavailable extends Error {}

/** Alfred hasn't been allowed on this page's site (or the form's iframe) yet. */
export class NeedsAccess extends Error {
  constructor(readonly origins: string[]) {
    super("Alfred needs your OK to read this site.");
  }
}

/** Built by WXT from entrypoints/content.ts. */
const CONTENT_SCRIPT = "/content-scripts/content.js";

/** The match pattern for a page's site, e.g. https://boards.greenhouse.io/*. */
export function sitePattern(url: string | undefined) {
  try {
    const { protocol, hostname } = new URL(url ?? "");
    return /^https?:$/.test(protocol) ? `${protocol}//${hostname}/*` : null;
  } catch {
    return null;
  }
}

export function siteName(pattern: string) {
  return pattern.replace(/^https?:\/\//, "").replace(/\/\*$/, "");
}

const allowed = (pattern: string) => browser.permissions.contains({ origins: [pattern] }).catch(() => false);

/** Asks for the given sites. Call straight from a click: the browser only shows the prompt after a user gesture. */
export function requestAccess(origins: string[]) {
  return browser.permissions.request({ origins }).catch(() => false);
}

/** Set when Alfred runs in its own window (browsers without a side panel): the window it serves. */
const servedWindow = Number(new URLSearchParams(globalThis.location?.search ?? "").get("window")) || undefined;

async function activeTab() {
  const [tab] = await browser.tabs.query(servedWindow ? { active: true, windowId: servedWindow } : { active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new PageUnavailable("Open a job application in this window.");
  if (!/^https?:/.test(tab.url)) throw new PageUnavailable("Alfred works on web pages. Open a job application to begin.");
  return tab as typeof tab & { id: number; url: string };
}

function send<T extends ContentRequest>(tabId: number, frameId: number, message: T): Promise<ContentResponse<T["type"]> | null> {
  return browser.tabs
    .sendMessage(tabId, message, { frameId })
    .then((response) => (response ?? null) as ContentResponse<T["type"]> | null)
    .catch(() => null);
}

const injecting = new Map<string, Promise<unknown>>();

/** Loads the content script into a frame that doesn't answer yet (first visit, or the page reloaded). */
async function scanFrame(tabId: number, frameId: number) {
  const scan = () => send(tabId, frameId, { type: "alfred:scan" }) as Promise<PageReport | null>;
  const first = await scan();
  if (first) return first;
  const key = `${tabId}:${frameId}`;
  if (!injecting.has(key)) {
    const run = browser.scripting
      .executeScript({ target: { tabId, frameIds: [frameId] }, files: [CONTENT_SCRIPT] })
      .catch(() => null)
      .finally(() => injecting.delete(key));
    injecting.set(key, run);
  }
  await injecting.get(key);
  return scan();
}

/**
 * Scans every frame in the active tab and returns the one with the form.
 * Job details come from whichever frame describes the job best.
 */
export async function scanActivePage(): Promise<ActivePage> {
  const tab = await activeTab();
  const frames = (await browser.webNavigation.getAllFrames({ tabId: tab.id }).catch(() => null)) ?? [{ frameId: 0, url: tab.url }];

  // Alfred reads only sites the user has allowed: the page itself, and any application platform framed inside it.
  const site = sitePattern(tab.url)!;
  const wanted = new Set([site]);
  for (const frame of frames) {
    const pattern = sitePattern(frame.url);
    if (pattern && FORM_HOSTS.test(new URL(frame.url).hostname)) wanted.add(pattern);
  }
  const missing = (await Promise.all([...wanted].map(async (pattern) => ((await allowed(pattern)) ? null : pattern)))).filter(
    (pattern): pattern is string => Boolean(pattern),
  );
  if (missing.length > 0) throw new NeedsAccess(missing);

  const results = await Promise.all(
    frames.map(async (frame) => {
      const pattern = frame.frameId === 0 ? site : sitePattern(frame.url);
      const readable = pattern !== null && (wanted.has(pattern) || (await allowed(pattern)));
      return { frameId: frame.frameId, report: readable ? await scanFrame(tab.id, frame.frameId) : null };
    }),
  );
  const answered = results.filter((result): result is { frameId: number; report: PageReport } => Boolean(result.report));
  if (answered.length === 0) {
    throw new PageUnavailable("Alfred can't read this page. Reload it and try again.");
  }

  const [form] = [...answered].sort((a, b) => b.report.fields.length - a.report.fields.length);
  if (!form) throw new PageUnavailable("Alfred can't read this page yet. Reload it and try again.");
  const top = answered.find((result) => result.frameId === 0) ?? form;
  const job = top.report.job.description.length > form.report.job.description.length ? top.report.job : form.report.job;
  return { tabId: tab.id, frameId: form.frameId, report: { ...form.report, job: { ...job, url: tab.url } } };
}

export async function fillActivePage(page: ActivePage): Promise<PageReport> {
  const report = (await send(page.tabId, page.frameId, { type: "alfred:fill" })) as PageReport | null;
  if (!report) throw new PageUnavailable("The page stopped responding. Reload it and try again.");
  return { ...report, job: page.report.job };
}

export async function setFieldOnPage(page: ActivePage, id: string, value: string): Promise<PageReport | null> {
  const result = await send(page.tabId, page.frameId, { type: "alfred:set-field", id, value });
  return result && "report" in result ? { ...result.report, job: page.report.job } : null;
}

export async function attachCvOnPage(page: ActivePage, id: string, file?: StoredFile): Promise<PageReport | null> {
  const result = await send(page.tabId, page.frameId, { type: "alfred:attach-cv", id, file });
  return result && "report" in result && result.ok ? { ...result.report, job: page.report.job } : null;
}

export async function focusFieldOnPage(page: ActivePage, id: string): Promise<void> {
  await send(page.tabId, page.frameId, { type: "alfred:focus-field", id });
}
