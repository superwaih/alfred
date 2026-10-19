import { browser } from "wxt/browser";

/** Chromium browsers without the side panel API (some versions of Opera, Arc, Vivaldi). */
const sidePanel = (browser as { sidePanel?: typeof browser.sidePanel }).sidePanel;

export default defineBackground(() => {
  if (sidePanel) {
    // Clicking the toolbar icon opens Alfred beside the page.
    void sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
      console.error("Alfred: could not set side panel behaviour", error);
    });
    return;
  }

  // Elsewhere, Alfred opens in a narrow window of its own, tied to the window it was opened from.
  let panelWindowId: number | undefined;
  browser.action.onClicked.addListener(async (tab) => {
    if (panelWindowId !== undefined) {
      try {
        await browser.windows.update(panelWindowId, { focused: true });
        return;
      } catch {
        panelWindowId = undefined;
      }
    }
    const opener = tab.windowId;
    const from = await browser.windows.get(opener).catch(() => undefined);
    const width = 420;
    const created = await browser.windows.create({
      url: browser.runtime.getURL(`/sidepanel.html?window=${opener}`),
      type: "popup",
      width,
      height: from?.height ?? 820,
      top: from?.top,
      left: from && from.left !== undefined && from.width !== undefined ? from.left + from.width - width : undefined,
    });
    panelWindowId = created?.id;
  });
  browser.windows.onRemoved.addListener((id) => {
    if (id === panelWindowId) panelWindowId = undefined;
  });
});
