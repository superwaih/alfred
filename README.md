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

## Administration

Open `/admin` on the Next.js site. The dashboard provides account search, verified/admin status, suspension/restoration, session revocation, audited credit adjustments, recent server activity, the credit ledger, and operational settings. Light and dark modes are supported.

1. Set `ADMIN_EMAIL=admin@alfreed.space` on the server. This address is the protected initial owner; setting it does not create an account or bypass email verification.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` using a verified sending domain in [Resend](https://resend.com/docs/api-reference/emails/send-email). For example, `EMAIL_FROM=Alfred <auth@alfreed.space>` once that domain is verified. Keep credentials in environment variables, not the admin UI.
3. Set `NEXT_PUBLIC_SITE_URL` before building to the exact site origin, including scheme and port (or set `APP_URL` as a runtime server override). Admin writes reject other origins. Production requires HTTPS.
4. Run `pnpm seed:admin` to provision the initial owner without email delivery. This explicit server-side bootstrap creates a verified admin, grants starter credits, records an audit entry, and prints a generated password once. Save it securely and sign in at `/admin`. Re-running preserves existing accounts and passwords. Alternatively, choose **Create an account**, register the owner email, and enter the emailed OTP. For an existing account, use **Forgot password**.
5. Promote other email-verified users from **Users → Manage**. The initial owner cannot be suspended or demoted through the UI.

MongoDB must support transactions (MongoDB Atlas or a local replica set). User changes and their audit records commit together. Credit adjustments require a reason, cannot make a balance negative, and carry an idempotency key to prevent duplicate charges on retry.

**Settings** control new registrations, starter credits, server-paid AI availability, per-task prices, and the personal-key unlock fee. Existing credit balances are unchanged when starter credits change. The first successful CV import remains free. Polar controls purchase pack pricing. Configuration indicators show whether server credentials exist, not live provider uptime.

Only server-side operations appear in administration. Users' CV files, saved profiles, local form-filling activity, and personal AI provider keys remain in the browser. Requests made directly with personal keys are not tracked here. The activity and ledger views show the latest 50 entries; user search is paginated.

## Email authentication

Normal sign-in remains **email + password**. Registration creates an account only after OTP verification. **Forgot password** sends a reset OTP; setting a new password revokes existing extension and admin sessions. Codes expire after ten minutes, are stored as keyed hashes, allow five attempts, and are single-use. Resends invalidate earlier codes. Email requests and password sign-in are rate-limited through MongoDB across server instances.

New API flow:

- `POST /api/v1/auth/register` with `email`, `password`, `name` returns `challengeId` (no session yet).
- `POST /api/v1/auth/verify-email` with `challengeId`, `code` returns the extension session.
- `POST /api/v1/auth/login` remains email/password sign-in.
- `POST /api/v1/auth/forgot-password` with `email` returns a generic response and `challengeId`.
- `POST /api/v1/auth/reset-password` with `challengeId`, `code`, `password` changes the password; sign in again afterward.

Existing password accounts can still sign in. Unverified accounts cannot gain administrator access. Deploy the updated extension alongside the API because registration now has a verification step. There is no development OTP bypass or code returned in API responses.

### Authentication integration tests

With a test-capable MongoDB connection in `.env`, run `pnpm test:auth`. The runner creates a uniquely named `alfred_test_*` database, intercepts all email delivery, exercises authentication/access-control/credit operations, and deletes its test records afterward. It never reads or writes application accounts. The database user needs read/write and transaction access to that temporary database. Empty test collections/indexes can remain when the database role does not permit dropping a database.
