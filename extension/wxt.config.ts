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
  manifest: {
    name: "Alfred",
    description:
      "Fills job applications from your saved profile, tailors your CV and drafts cover letters. You review and submit.",
    permissions: ["storage", "unlimitedStorage", "sidePanel", "tabs", "webNavigation"],
    // Alfred reads application forms on any job site you open, and calls
    // Alfred's API or the AI provider you chose.
    host_permissions: ["<all_urls>"],
    action: { default_title: "Open Alfred" },
  },
});
