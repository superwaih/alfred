# Email setup for alfreed.space

Alfred uses email in two directions:

| Direction | Service | What it does |
| --- | --- | --- |
| Sending | **Resend** | Sends sign-up and password-reset codes from `Alfred <auth@alfreed.space>` |
| Receiving | **Hostinger** | The `hello@alfreed.space` inbox: support, privacy and account-deletion requests |

Both only work if the right DNS records exist **where the domain's DNS actually lives**.

## Where the DNS lives

`alfreed.space` uses Vercel's nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). That is how the website went live.

Once nameservers point to Vercel, **only records added in Vercel count**. Records in Hostinger's DNS panel are ignored.

Add every record below in: **Vercel → Domains → alfreed.space → DNS Records → Add**.

## The problem (checked 27 Oct 2026)

Vercel's DNS zone has no mail records at all:

| Record | Needed for | Status |
| --- | --- | --- |
| MX | Receiving at hello@alfreed.space | Missing: incoming mail bounces |
| `resend._domainkey` TXT | Signing Alfred's emails (DKIM) | Missing |
| `send` / `rsend` CNAME | Resend sending (SPF) | Missing |
| `_dmarc` TXT | Telling Gmail/Outlook how to treat our mail | Missing |

Resend still shows the domain as "verified" because it checked before the nameservers moved. Without these records, verification codes will start landing in spam, and Resend may mark the domain as failed.

## 1. Receiving mail (Hostinger)

Copy the exact values from **Hostinger → Emails → alfreed.space → DNS settings**. They are normally:

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | `@` | `mx1.hostinger.com` | 5 |
| MX | `@` | `mx2.hostinger.com` | 10 |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | |

If Hostinger also lists DKIM records (CNAMEs such as `hostingermail-a._domainkey`), add those too, exactly as shown.

## 2. Sending mail (Resend)

Copy these from **Resend → Domains → alfreed.space**. The DKIM value is long; copy all of it.

| Type | Name | Value |
| --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEB…` (full value from Resend) |
| CNAME | `send` | `send.forge.rmta.net` |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` |

## 3. DMARC (both)

| Type | Name | Value |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@alfreed.space` |

`p=none` only asks for reports and changes nothing about delivery. After a few weeks of clean reports, it can be tightened to `p=quarantine`.

## 4. Check it worked

DNS changes usually show up within minutes, but can take up to a few hours.

1. In Resend, press **Verify DNS records**. All three should stay green.
2. Send an email from Gmail to `hello@alfreed.space`. It should arrive in Hostinger webmail.
3. Sign up in Alfred, or trigger a password reset, with a Gmail address. The code should arrive in the inbox. In Gmail: open the email → ⋮ → **Show original**, and check that **SPF, DKIM and DMARC all say PASS**.

To look up records from a terminal, query Google's DNS directly:

```bash
dig @8.8.8.8 MX alfreed.space +short
dig @8.8.8.8 TXT resend._domainkey.alfreed.space +short
dig @8.8.8.8 TXT _dmarc.alfreed.space +short
```

## App settings that go with this

Set these in Vercel's environment variables, and in `.env` for local development:

```
RESEND_API_KEY=re_…                       # create a new key; the old one was exposed
EMAIL_FROM=Alfred <auth@alfreed.space>
ADMIN_EMAIL=hello@alfreed.space
```

The email templates live in `lib/server/email.ts`.

## Before submitting to the Chrome Web Store

Store reviewers create an account, so their verification code must arrive. Finish steps 1–4 before pressing **Submit for review**.
