import { browser } from "wxt/browser";
import type { ContentRequest, ContentResponse, PageReport } from "./messages";
import type { StoredFile } from "./storage";

export type ActivePage = {
  tabId: number;
  /** Frame holding the application form (0 is the top page). */
  frameId: number;
  report: PageReport;
};

export class PageUnavailable extends Error {}

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
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

/**
 * Scans every frame in the active tab and returns the one with the form.
 * Job details come from whichever frame describes the job best.
 */
export async function scanActivePage(): Promise<ActivePage> {
  const tab = await activeTab();
  const frames = (await browser.webNavigation.getAllFrames({ tabId: tab.id }).catch(() => null)) ?? [{ frameId: 0 }];
  const results = await Promise.all(
    frames.map(async (frame) => ({ frameId: frame.frameId, report: (await send(tab.id, frame.frameId, { type: "alfred:scan" })) as PageReport | null })),
  );
  const answered = results.filter((result): result is { frameId: number; report: PageReport } => Boolean(result.report));
  if (answered.length === 0) {
    throw new PageUnavailable("Alfred can't read this page yet. If you just installed Alfred, reload the page.");
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
