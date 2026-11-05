import { EMAIL_VERIFICATION, registerWithoutCode, startChallenge } from "@/lib/server/email-auth";
import { handle, json, preflight, readJson } from "@/lib/server/http";
import { issueToken, publicUser } from "@/lib/server/auth";
import { registerBody } from "@/lib/server/schemas";

export const OPTIONS = preflight;
export const POST = handle(async request => {
  const body = await readJson(request, registerBody);
  if (EMAIL_VERIFICATION) return json(request, await startChallenge(body.email, "register", body), 202);
  // Without email codes the account is ready now, so the response is a signed-in session.
  const user = await registerWithoutCode(body.email, body.name, body.password);
  return json(request, { token: await issueToken(user), user: publicUser(user) }, 201);
});
