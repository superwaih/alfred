import { OWN_KEY_UNLOCK_COST } from "@/shared/ai";
import { publicUser, requireUser } from "@/lib/server/auth";
import { unlockOwnKey } from "@/lib/server/credits";
import { users } from "@/lib/server/db";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

/** One-time unlock of "use my own API key", paid in credits. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const result = await unlockOwnKey(user._id, OWN_KEY_UNLOCK_COST);
  const fresh = (await (await users()).findOne({ _id: user._id })) ?? user;
  return json(request, { user: publicUser(fresh), charged: result.charged });
});
