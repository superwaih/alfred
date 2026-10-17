import { requireUser } from "@/lib/server/auth";
import { users } from "@/lib/server/db";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

/** Signs the user out everywhere by invalidating every token issued so far. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  await (await users()).updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  return json(request, { ok: true });
});
