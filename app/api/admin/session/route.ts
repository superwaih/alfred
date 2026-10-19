import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCookieOptions, adminUser, assertAdminOrigin, isAdmin } from "@/lib/server/admin";
import { issueToken, verifyPassword } from "@/lib/server/auth";
import { users } from "@/lib/server/db";
import { ApiError, handle, json, readJson } from "@/lib/server/http";
import { loginBody } from "@/lib/server/schemas";
import { rateLimit } from "@/lib/server/rate-limit";
import { recordActivity } from "@/lib/server/activity";

export const POST = handle(async request => {
  assertAdminOrigin(request);
  const body = await readJson(request, loginBody);
  await rateLimit(`admin-login:${body.email}`, 10, 900_000);
  const user = await (await users()).findOne({ email: body.email });
  if (!user || !(await verifyPassword(body.password, user.passwordHash)) || !isAdmin(user)) {
    throw new ApiError(401, "invalid_credentials", "Sign in with a verified administrator account.");
  }
  (await cookies()).set(ADMIN_COOKIE, await issueToken(user, "alfred-admin"), adminCookieOptions);
  await (await users()).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await recordActivity("admin.login", user.email);
  return json(request, { user: adminUser(user) });
});

export const DELETE = handle(async request => {
  assertAdminOrigin(request);
  (await cookies()).set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  return json(request, { ok: true });
});
