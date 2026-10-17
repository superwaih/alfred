import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { ObjectId } from "mongodb";
import { users, type UserDoc } from "./db";
import { env } from "./env";
import { ApiError } from "./http";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const TOKEN_TTL = "30d";

/** Hashes a password as scrypt$N$r$p$salt$hash (salt and hash base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function issueToken(user: Pick<UserDoc, "_id" | "tokenVersion">): Promise<string> {
  return new SignJWT({ ver: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toHexString())
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .setAudience("alfred-extension")
    .sign(env.authSecret());
}

/** Resolves the signed-in user from the Authorization header, or throws 401. */
export async function requireUser(request: Request): Promise<UserDoc> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError(401, "unauthenticated", "Sign in to continue.");

  let subject: string | undefined;
  let version: unknown;
  try {
    const { payload } = await jwtVerify(token, env.authSecret(), { audience: "alfred-extension" });
    subject = payload.sub;
    version = payload.ver;
  } catch {
    throw new ApiError(401, "invalid_token", "Your session has expired. Sign in again.");
  }
  if (!subject || !ObjectId.isValid(subject)) throw new ApiError(401, "invalid_token", "Your session has expired. Sign in again.");

  const user = await (await users()).findOne({ _id: new ObjectId(subject) });
  if (!user || user.tokenVersion !== version) {
    throw new ApiError(401, "invalid_token", "Your session has expired. Sign in again.");
  }
  return user;
}

export function publicUser(user: UserDoc) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    credits: user.credits,
    ownKeyUnlocked: Boolean(user.ownKeyUnlocked),
  };
}
