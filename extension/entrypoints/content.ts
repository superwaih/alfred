import { browser } from "wxt/browser";
import type { ContentRequest, PageChanged } from "@/lib/messages";
import { attachCv, clearMarks, fillPage, focusField, scanPage, setField } from "@/lib/page/form";
import { profileItem, resumeFileItem, settingsItem } from "@/lib/storage";

export default defineContentScript({
  matches: ["<all_urls>"],
  // Greenhouse and others embed application forms in iframes on company sites.
  allFrames: true,
  runAt: "document_idle",
  main(ctx) {
    browser.runtime.onMessage.addListener((message: ContentRequest, _sender, sendResponse) => {
      if (!message || typeof message !== "object" || !String(message.type).startsWith("alfred:")) return false;
      void handle(message).then(sendResponse, (error: unknown) => {
        console.error("Alfred:", error);
        sendResponse(null);
      });
      return true; // keeps the channel open for the async response
    });

    // Multi-step forms (Workday especially) swap fields without a page load.
    let timer: number | undefined;
    let lastUrl = location.href;
    const observer = new MutationObserver((mutations) => {
      const fieldsChanged = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) => node instanceof Element && (node.matches("input, select, textarea") || node.querySelector("input, select, textarea")),
        ),
      );
      if (!fieldsChanged && location.href === lastUrl) return;
      lastUrl = location.href;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const note: PageChanged = { type: "alfred:page-changed", url: location.href };
        browser.runtime.sendMessage(note).catch(() => {
          // No side panel open to hear it; that's fine.
        });
      }, 700);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    ctx.onInvalidated(() => {
      observer.disconnect();
      window.clearTimeout(timer);
    });
  },
});

async function handle(message: ContentRequest) {
  switch (message.type) {
    case "alfred:scan":
      return scanPage();
    case "alfred:fill": {
      const [profile, resume, settings] = await Promise.all([
        profileItem.getValue(),
        resumeFileItem.getValue(),
        settingsItem.getValue(),
      ]);
      return fillPage(profile, resume, settings.highlightFields);
    }
    case "alfred:set-field": {
      const settings = await settingsItem.getValue();
      const ok = setField(message.id, message.value, settings.highlightFields);
      return { ok, report: scanPage() };
    }
    case "alfred:attach-cv": {
      const [saved, settings] = await Promise.all([resumeFileItem.getValue(), settingsItem.getValue()]);
      const file = message.file ?? saved;
      const ok = file ? attachCv(message.id, file, settings.highlightFields, message.file ? "Tailored CV" : "Your saved CV") : false;
      return { ok, report: scanPage() };
    }
    case "alfred:focus-field":
      return { ok: focusField(message.id) };
    case "alfred:clear-marks":
      clearMarks();
      return { ok: true };
  }
}
