import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

const sharedDir = fileURLToPath(new URL("../shared", import.meta.url));

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  alias: { "@shared": sharedDir },
  // Port 3000 belongs to Alfred's API (the Next.js app), so WXT runs elsewhere.
  dev: { server: { port: 3200, origin: "http://localhost:3200" } },
  vite: () => ({
    plugins: [tailwindcss()],
    // The shared profile and AI modules live beside the extension, in ../shared.
    server: { fs: { allow: [".", sharedDir] } },
  }),
  hooks: {
    // WXT grants a runtime content script's matches up front; Alfred asks per site instead.
    "build:manifestGenerated": (_wxt, manifest) => {
      manifest.host_permissions = manifest.host_permissions?.filter((pattern: string) => pattern !== "<all_urls>");
    },
  },
  manifest: {
    name: "Alfred",
    description:
      "Fills job applications from your saved profile, tailors your CV and drafts cover letters. You review and submit.",
    permissions: ["storage", "unlimitedStorage", "sidePanel", "tabs", "webNavigation", "scripting"],
    // The AI providers Alfred can call with the user's own key. Alfred's API answers with CORS instead.
    host_permissions: [
      "https://api.anthropic.com/*",
      "https://api.deepseek.com/*",
      "https://api.openai.com/*",
      "https://generativelanguage.googleapis.com/*",
    ],
    // Job sites are asked for one at a time, the first time the user opens Alfred on them.
    optional_host_permissions: ["https://*/*", "http://*/*"],
    action: { default_title: "Open Alfred" },
    // The side panel API arrived in Chrome 114; older Chromium builds use Alfred's own window instead.
    minimum_chrome_version: "110",
  },
});
