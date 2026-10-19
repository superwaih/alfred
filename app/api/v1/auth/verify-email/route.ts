import { finishRegistration } from "@/lib/server/email-auth";
import { verifyEmailBody } from "@/lib/server/schemas";
import { handle, json, preflight, readJson } from "@/lib/server/http";
import { issueToken, publicUser } from "@/lib/server/auth";

export const OPTIONS = preflight;
export const POST = handle(async request => {
  const { challengeId, code } = await readJson(request, verifyEmailBody);
  const user = await finishRegistration(challengeId, code);
  return json(request, { token: await issueToken(user), user: publicUser(user) }, 201);
});
