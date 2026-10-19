# Publishing Alfred

One build covers every Chromium browser. Chrome, Brave, Arc, Opera and Vivaldi
install it from the Chrome Web Store; Microsoft Edge users can too, but Edge
also has its own store (optional, step 7).

Browsers without Chrome's side panel API open Alfred in its own narrow window
instead (see `entrypoints/background.ts`), so the toolbar button always works.

## 1. Put the API online first

The extension talks to the Next.js app, so deploy that before submitting
(Vercel works). In the host's environment set everything from `.env.example`,
with production values:

- `NEXT_PUBLIC_SITE_URL` / `APP_URL`: the real site, e.g. `https://alfreed.space`
- `MONGODB_URI`, `AUTH_SECRET` (a new long secret, not the local one), `DEEPSEEK_API_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM` (a sending domain verified in Resend), `ADMIN_EMAIL`
- Polar: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_CREDIT_PACKS`,
  `POLAR_ENVIRONMENT=production`, and point Polar's webhook at
  `https://<site>/api/v1/webhooks/polar`
- `EXTENSION_ORIGINS`: fill in after step 4

Check `https://<site>/privacy` loads: the store asks for it.

## 2. Build the store zip

```bash
cd extension
echo "WXT_API_URL=https://alfreed.space" > .env.production
pnpm zip
```

The zip lands in `extension/.output/` (`alfred-extension-<version>-chrome.zip`).
Bump `version` in `extension/package.json` before every later upload; the
store rejects a version it has already seen.

## 3. Developer account

1. Go to https://chrome.google.com/webstore/devconsole and sign in with the
   Google account that should own Alfred (a team/brand account is better than
   a personal one).
2. Pay the one-time US$5 registration fee and turn on 2-step verification.
3. Verify the contact email shown in Account settings.

## 4. Create the item

1. **New item** → upload the zip.
2. The dashboard now shows the item's **ID** (32 letters). Add it to the API's
   environment and redeploy:
   `EXTENSION_ORIGINS=chrome-extension://<that-id>`
   Without this, sign-in from the published extension is blocked by CORS.

## 5. Fill in the listing

**Store listing**

- Name: Alfred
- Summary (132 chars max): *Fills job applications from your saved profile, tailors your CV and drafts cover letters. You review and submit.*
- Description: start from the landing page hero and FAQ. Say plainly that it
  never submits applications and works on Greenhouse, Lever, Workday and other
  careers sites.
- Category: Workflow & Planning (or Productivity)
- Icon: `public/icon/128.png`
- Screenshots: the five in `store-assets/` (`screenshot-1-fill.jpg` …
  `screenshot-5-setup.jpg`, 1280×800), uploaded in that order.
- Small promo tile: `store-assets/promo-small-440x280.jpg` (required).
- Marquee: `store-assets/promo-marquee-1400x560.jpg` (optional).
- Website: the site URL. Support: the contact email.

**Privacy practices** (this is where most rejections come from)

- Single purpose: *Alfred helps job seekers fill in online job applications from a profile they save, and prepares a tailored CV and cover letter for a specific job on request.*
- Permission justifications:
  - `storage`, `unlimitedStorage`: *Stores the user's profile, uploaded CV file and prepared documents locally in the browser. CV files can exceed the default storage quota.*
  - `sidePanel`: *Alfred's interface is a side panel shown beside the application form the user is filling in.*
  - `tabs`: *Finds the tab the user is applying in so Alfred can read that form, and reacts when the user switches tabs.*
  - `webNavigation`: *Lists the frames in the current tab, because many application forms (Greenhouse, Workday) are embedded in iframes.*
  - Host permission `<all_urls>`: *Job applications are hosted on thousands of company career sites and applicant tracking systems, so Alfred must be able to read and fill forms on whichever site the user is applying on. It reads a page only when the user opens Alfred there, and also calls Alfred's own API and, if the user adds a key, their chosen AI provider.*
- Remote code: **No, I am not using remote code.**
- Data usage: tick *Personally identifiable information* (name, email, CV
  details), *Authentication information* (password at sign-in), *Website
  content* (job descriptions and form questions). Leave the rest unticked.
  Certify all three statements (not sold, not used for unrelated purposes, not
  used for creditworthiness).
- Privacy policy URL: `https://<site>/privacy`

**Distribution**: Public, all regions (or start with Unlisted to test the
store build with a few people first).

## 6. Submit for review

Press **Submit for review**. Because of `<all_urls>`, expect an in-depth review:
usually a few days, occasionally longer. If it's rejected, the email names the
policy; fix that and resubmit with a bumped version.

When it's live, copy the listing URL into `INSTALL_URL` in `lib/site.ts` and
redeploy the site.

## 7. Optional: Microsoft Edge Add-ons

Edge already installs from the Chrome Web Store, but listing in Edge's own store
helps people find it there.

1. Register free at https://partner.microsoft.com/dashboard/microsoftedge.
2. Upload the same zip and reuse the listing text and screenshots.
3. Edge gives the extension a **different ID**: add it to `EXTENSION_ORIGINS`,
   comma-separated, e.g.
   `EXTENSION_ORIGINS=chrome-extension://<chrome-id>,chrome-extension://<edge-id>`

Opera has its own add-ons site too, but Opera users can install from the
Chrome Web Store directly, so it isn't needed.

## Every release after this

1. Bump `version` in `extension/package.json`.
2. `pnpm zip`
3. Developer console → Alfred → Package → Upload new package → Submit.
