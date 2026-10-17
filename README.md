# Alfred

Alfred is a Chrome extension that fills job applications from a saved profile, tailors your CV and drafts cover letters. The user always reviews and presses Submit.

This repository holds three parts:

| Folder | What it is |
| --- | --- |
| `app/`, `components/` | The landing page and the API (Next.js 16). |
| `app/api/v1/` | The API the extension calls: accounts, credits, Polar checkout and webhooks, AI tasks on DeepSeek. |
| `extension/` | The Chrome extension (WXT, Manifest V3, React). See [extension/README.md](extension/README.md). |
| `shared/` | Code both sides use: the profile shape, the field vocabulary, AI prompts and output schemas. |

## Running locally

```bash
pnpm install
cp .env.example .env.local   # then fill it in
pnpm dev                     # site and API on http://localhost:3000
```

The API needs MongoDB (`MONGODB_URI`), an `AUTH_SECRET` of 32+ characters, and a `DEEPSEEK_API_KEY` for credits mode. Payments need a Polar access token, webhook secret and one Polar product per credit pack (`POLAR_CREDIT_PACKS`). Every variable is described in `.env.example`.

Then run the extension (see its README) and point it at `http://localhost:3000`.

## How AI is paid for

- **Credits** (default): new accounts get `STARTER_CREDITS`. Tasks are charged before they run and refunded if they fail. Credits are bought through Polar; the `order.paid` webhook grants them once per order.
- **Own key**: users can add a DeepSeek, Anthropic, OpenAI, Gemini or any OpenAI-compatible key in the extension. Calls go straight from the browser to that provider; Alfred's servers never see the key. In "auto" mode the extension uses credits first and falls back to the user's key when credits run out.

Form filling itself never uses AI and is always free.

## Polar setup

1. Create one product per credit pack in Polar and put their ids in `POLAR_CREDIT_PACKS`.
2. Add a webhook endpoint at `https://<your-domain>/api/v1/webhooks/polar` for the `order.paid` event, and copy its secret to `POLAR_WEBHOOK_SECRET`.
3. Use `POLAR_ENVIRONMENT=sandbox` until you've tested a purchase end to end.

## Checks

```bash
pnpm lint && npx tsc --noEmit && pnpm build
```
