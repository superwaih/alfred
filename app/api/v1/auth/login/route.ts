import { issueToken, publicUser, verifyPassword } from "@/lib/server/auth";
import { users } from "@/lib/server/db";
import { ApiError, handle, json, preflight, readJson } from "@/lib/server/http";
import { loginBody } from "@/lib/server/schemas";

export const OPTIONS = preflight;

export const POST = handle(async (request) => {
  const body = await readJson(request, loginBody);
  const user = await (await users()).findOne({ email: body.email });
  // Same message either way, so the form doesn't reveal which emails have accounts.
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new ApiError(401, "invalid_credentials", "That email and password don't match.");
  }
  return json(request, { token: await issueToken(user), user: publicUser(user) });
});
