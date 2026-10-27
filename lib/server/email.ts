import "server-only";
import { ApiError } from "./http";

export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }

type Purpose = "register" | "reset";

const COPY: Record<Purpose, { subject: string; heading: string; intro: string; preheader: string }> = {
  register: {
    subject: "Your Alfred verification code",
    heading: "Confirm your email",
    intro: "Enter this code in Alfred to finish creating your account.",
    preheader: "Your code to confirm your email. It expires in 10 minutes.",
  },
  reset: {
    subject: "Your Alfred password reset code",
    heading: "Reset your password",
    intro: "Enter this code in Alfred, then choose a new password.",
    preheader: "Your code to reset your password. It expires in 10 minutes.",
  },
};

/** Plain text for clients that don't show HTML, and for spam filters that read both. */
export function otpText(code: string, purpose: Purpose) {
  const copy = COPY[purpose];
  return `${copy.heading}\n\n${copy.intro}\n\n${code}\n\nThe code expires in 10 minutes and works once. If you didn't ask for it, ignore this email; nothing changes until the code is used.\n\nAlfred · Your job hunt. Handled.`;
}

/**
 * The code email, in Alfred's poster colours. Built the way email clients need:
 * tables, inline styles, system fonts, and a light layout that survives the
 * clients that force dark mode.
 */
export function otpHtml(code: string, purpose: Purpose) {
  const copy = COPY[purpose];
  const digits = code.replace(/\D/g, "").slice(0, 6);
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
  const site = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://alfreed.space";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${copy.subject}</title>
</head>
<body style="margin:0;padding:0;background:#e7e7e2;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e7e7e2;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
      <tr><td style="background:#f4b41a;border-radius:16px 16px 0 0;padding:22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-family:${font};font-size:20px;font-weight:900;letter-spacing:-1px;color:#1a1a1a;">ALFRED</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px 8px;">
        <h1 style="margin:0 0 10px;font-family:${font};font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;color:#1a1a1a;">${copy.heading}</h1>
        <p style="margin:0 0 24px;font-family:${font};font-size:15px;line-height:1.5;color:#55554f;">${copy.intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="background:#1a1a1a;border-radius:12px;padding:22px 12px;">
            <span style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:36px;line-height:1;font-weight:700;letter-spacing:10px;color:#f4b41a;">${digits}</span>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-family:${font};font-size:13px;line-height:1.5;color:#55554f;">Expires in <strong style="color:#1a1a1a;">10 minutes</strong> and works once.</p>
      </td></tr>
      <tr><td style="background:#ffffff;padding:20px 28px 28px;border-radius:0 0 16px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e7e7e2;padding-top:18px;font-family:${font};font-size:12px;line-height:1.55;color:#55554f;">
          Didn’t ask for this? Ignore this email. Nothing changes until the code is used, and Alfred will never ask you for it.
        </td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0;font-family:${font};font-size:12px;line-height:1.5;color:#55554f;">
        <strong style="color:#1a1a1a;">Your job hunt. Handled.</strong><br>
        <a href="${site}" style="color:#55554f;text-decoration:underline;">${site.replace(/^https?:\/\//, "")}</a> · <a href="${site}/privacy" style="color:#55554f;text-decoration:underline;">Privacy</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendOtp(email: string, code: string, purpose: Purpose) {
  if (!emailConfigured()) throw new ApiError(503, "email_unavailable", "Email is not configured yet. Please contact support.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: COPY[purpose].subject,
      html: otpHtml(code, purpose),
      text: otpText(code, purpose),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ApiError(503, "email_failed", "We couldn't send the email. Please try again later.");
}
