import { browser } from "wxt/browser";

export default defineBackground(() => {
  // Clicking the toolbar icon opens Alfred beside the page.
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    console.error("Alfred: could not set side panel behaviour", error);
  });
});
