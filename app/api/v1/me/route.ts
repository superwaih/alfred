import { publicUser, requireUser } from "@/lib/server/auth";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  return json(request, { user: publicUser(user) });
});
