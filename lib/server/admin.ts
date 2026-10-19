import "server-only";
import { cookies } from "next/headers";
import type { AdminUser } from "@/shared/admin";
import type { UserDoc } from "./db";
import { userForToken } from "./auth";
import { env } from "./env";
import { ApiError } from "./http";

export const ADMIN_COOKIE = "alfred_admin";
export const adminCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 8 * 60 * 60 };

export function isOwner(user: Pick<UserDoc, "email">) {
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(owner && user.email === owner);
}

export function isAdmin(user: UserDoc) {
  return Boolean(user.emailVerifiedAt && !user.suspended && (isOwner(user) || user.role === "admin"));
}

/** Cookie-authenticated writes only accept this site's origin (including login). */
export function assertAdminOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(env.siteUrl()).origin) {
    throw new ApiError(403, "invalid_origin", "This action must be made from the Alfred admin page.");
  }
}

export async function requireAdmin(request: Request) {
  if (request.method !== "GET") assertAdminOrigin(request);
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) throw new ApiError(401, "unauthenticated", "Sign in to administration.");
  const user = await userForToken(token, "alfred-admin");
  if (!isAdmin(user)) throw new ApiError(403, "admin_required", "This account does not have admin access.");
  return user;
}

export function adminUser(user: UserDoc): AdminUser {
  return {
    id: user._id.toHexString(), email: user.email, name: user.name, role: isOwner(user) ? "admin" : user.role || "user",
    owner: isOwner(user), suspended: Boolean(user.suspended), emailVerified: Boolean(user.emailVerifiedAt),
    credits: user.credits, ownKeyUnlocked: Boolean(user.ownKeyUnlocked), createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
