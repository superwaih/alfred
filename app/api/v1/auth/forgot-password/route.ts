import { startChallenge } from "@/lib/server/email-auth";
import { emailBody } from "@/lib/server/schemas";
import { handle, json, preflight, readJson } from "@/lib/server/http";

export const OPTIONS = preflight;
export const POST = handle(async request => {
  const { email } = await readJson(request, emailBody);
  const challenge = await startChallenge(email, "reset");
  return json(request, { ...challenge, message: "If that account exists, a reset code has been sent." }, 202);
});
