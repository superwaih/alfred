import { startChallenge } from "@/lib/server/email-auth";
import { handle, json, preflight, readJson } from "@/lib/server/http";
import { registerBody } from "@/lib/server/schemas";

export const OPTIONS = preflight;
export const POST = handle(async request => {
  const body = await readJson(request, registerBody);
  return json(request, await startChallenge(body.email, "register", body), 202);
});
