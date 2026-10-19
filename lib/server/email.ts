import "server-only";
import { ApiError } from "./http";

export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }

export async function sendOtp(email: string, code: string, purpose: "register" | "reset") {
  if (!emailConfigured()) throw new ApiError(503, "email_unavailable", "Email is not configured yet. Please contact support.");
  const action = purpose === "register" ? "verify your email" : "reset your password";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM, to: [email], subject: `Your Alfred ${purpose === "register" ? "verification" : "password reset"} code`,
      text: `Your code to ${action} is ${code}. It expires in 10 minutes and can only be used once. If you didn't request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new ApiError(503, "email_failed", "We couldn't send the email. Please try again later.");
}
