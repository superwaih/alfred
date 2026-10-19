# Alfred for Chrome

The extension: a side panel that reads job application forms, fills them from the user's profile, drafts free-text answers, and tailors CVs and cover letters.

## Develop

```bash
cd extension
pnpm install
cp .env.example .env   # WXT_API_URL, defaults to http://localhost:3000
pnpm dev               # opens Chrome with the extension loaded and live reload
```

The WXT dev server runs on port 3200, leaving 3000 for Alfred's API. `pnpm dev` opens Google Chrome by default; on a machine without it, point WXT at another Chromium build in a git-ignored `web-ext.config.ts` (`binaries.chrome`).

To load a production build by hand: `pnpm build`, then in `chrome://extensions` turn on Developer mode and choose **Load unpacked** → `extension/.output/chrome-mv3`. `pnpm zip` makes the file to upload to the Chrome Web Store.

## How it's put together

| Path | Role |
| --- | --- |
| `entrypoints/content.ts` | Runs in every frame of every page; answers scan / fill requests from the panel. Never submits anything. |
| `lib/page/form.ts` | Finds form controls, works out each question's label, matches it to a profile field, fills it. |
| `lib/page/sites.ts` | What's specific to Greenhouse, Lever and Workday (attribute names, containers, job details); JSON-LD job data on any site. |
| `entrypoints/sidepanel/`, `components/` | The panel: Apply, Documents, Profile, Account. |
| `lib/ai.ts` | Chooses credits or the user's own key for each AI task. |
| `lib/providers.ts` | Own-key calls to Anthropic, OpenAI, Gemini and OpenAI-compatible APIs. |
| `entrypoints/print/` | Print-ready CV and cover letter, saved as PDF from Chrome's print dialog. |
| `../shared/` | Profile shape, field vocabulary and AI prompts, shared with the API. |

## What Alfred will and won't do on a form

- Fills fields the profile answers, including saved answers to common questions.
- Leaves salary, work authorisation, sponsorship and relocation empty and flags them, unless the user has saved a standing answer.
- Never overwrites a value the user already typed.
- Attaches the saved CV file to upload fields.
- Marks custom widgets it can't operate (e.g. Workday dropdowns) for the user to fill.
- Never presses Submit.

## Checks

```bash
pnpm compile   # type-check
pnpm build
```

## Accounts and email verification

Registration now sends a six-digit email OTP; the account is created after verification. Sign-in still uses email and password. **Forgot password** sends a reset OTP and lets the user choose a new password. Codes expire in ten minutes and can be resent (subject to server rate limits). Password resets sign out existing sessions.

Task prices and the personal-key unlock fee come from the server. The panel refreshes prices when opened, when focused, and every minute while signed in. Install the matching API version when updating this extension.
