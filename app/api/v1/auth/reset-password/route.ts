import { resetPassword } from "@/lib/server/email-auth";
import { resetPasswordBody } from "@/lib/server/schemas";
import { handle, json, preflight, readJson } from "@/lib/server/http";

export const OPTIONS = preflight;
export const POST = handle(async request => {
  const { challengeId, code, password } = await readJson(request, resetPasswordBody);
  await resetPassword(challengeId, code, password);
  return json(request, { ok: true });
});
