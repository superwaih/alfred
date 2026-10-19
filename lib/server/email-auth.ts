import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { challenges, ledger, transaction, users, type AuthChallenge, type UserDoc } from "./db";
import { env } from "./env";
import { ApiError } from "./http";
import { sendOtp } from "./email";
import { rateLimit } from "./rate-limit";
import { appSettings } from "./settings";
import { hashPassword } from "./auth";
import { recordActivity } from "./activity";

export function otpHash(id: string, code: string) {
  return createHmac("sha256", env.authSecret()).update(`${id}:${code}`).digest("hex");
}

export async function startChallenge(email: string, purpose: AuthChallenge["purpose"], registration?: { name: string; password: string }) {
  await rateLimit(`email-minute:${email}`, 1, 60_000);
  await rateLimit(`email-hour:${email}`, 5, 3_600_000);
  await rateLimit("email-global", 300, 900_000);
  const existing = await (await users()).findOne({ email });
  const id = randomBytes(32).toString("hex");
  if (purpose === "reset" && (!existing || existing.suspended)) return { challengeId: id };
  if (purpose === "register") {
    if (existing) throw new ApiError(409, "email_taken", "There's already an account with that email. Sign in or reset your password.");
    if (!(await appSettings()).registrationsOpen) throw new ApiError(403, "registration_closed", "New registrations are currently paused.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challenge: AuthChallenge = {
    _id: id, email, purpose, codeHash: otpHash(id, code), attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60_000),
    ...(registration ? { name: registration.name, passwordHash: await hashPassword(registration.password) } : {}),
  };
  const collection = await challenges();
  await collection.deleteMany({ email, purpose });
  await collection.insertOne(challenge);
  try { await sendOtp(email, code, purpose); }
  catch (error) { await collection.deleteOne({ _id: id }); throw error; }
  return { challengeId: id };
}

/** Attempts and consumption are atomic: concurrent submissions cannot reuse a code. */
export async function consumeChallenge(id: string, code: string, purpose: AuthChallenge["purpose"]) {
  const collection = await challenges();
  const challenge = await collection.findOneAndUpdate(
    { _id: id, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } }, { returnDocument: "after" },
  );
  const invalid = () => new ApiError(400, "invalid_code", "That code is incorrect, expired, or already used. Request a new code.");
  if (!challenge) throw invalid();
  const actual = Buffer.from(otpHash(id, code), "hex");
  const expected = Buffer.from(challenge.codeHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw invalid();
  const consumed = await collection.findOneAndDelete({ _id: id, codeHash: challenge.codeHash, expiresAt: { $gt: new Date() } });
  if (!consumed) throw invalid();
  return consumed;
}

export async function finishRegistration(id: string, code: string): Promise<UserDoc> {
  const challenge = await consumeChallenge(id, code, "register");
  const settings = await appSettings();
  if (!settings.registrationsOpen) throw new ApiError(403, "registration_closed", "New registrations are currently paused.");
  if (!challenge.passwordHash) throw new ApiError(400, "invalid_code", "Request a new verification code.");
  const user: UserDoc = {
    _id: new ObjectId(), email: challenge.email, name: challenge.name || "", passwordHash: challenge.passwordHash,
    credits: settings.starterCredits, tokenVersion: 1, emailVerifiedAt: new Date(), createdAt: new Date(), lastLoginAt: new Date(),
  };
  const userCollection = await users();
  const ledgerCollection = await ledger();
  try {
    await transaction(async session => {
      await userCollection.insertOne(user, { session });
      if (user.credits) await ledgerCollection.insertOne({ _id: new ObjectId(), userId: user._id, delta: user.credits, reason: "starter", createdAt: new Date() }, { session });
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new ApiError(409, "email_taken", "This account already exists. Sign in instead.");
    throw error;
  }
  await recordActivity("account.registered", user.email);
  return user;
}

export async function resetPassword(id: string, code: string, password: string) {
  const challenge = await consumeChallenge(id, code, "reset");
  const user = await (await users()).findOneAndUpdate(
    { email: challenge.email, suspended: { $ne: true } },
    { $set: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after" },
  );
  if (!user) throw new ApiError(400, "invalid_code", "This reset is no longer available.");
  await recordActivity("account.password_reset", user.email);
}
