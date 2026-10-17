import { ObjectId, MongoServerError } from "mongodb";
import { hashPassword, issueToken, publicUser } from "@/lib/server/auth";
import { ledger, users, type UserDoc } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { ApiError, handle, json, preflight, readJson } from "@/lib/server/http";
import { registerBody } from "@/lib/server/schemas";

export const OPTIONS = preflight;

export const POST = handle(async (request) => {
  const body = await readJson(request, registerBody);
  const starter = env.starterCredits();
  const user: UserDoc = {
    _id: new ObjectId(),
    email: body.email,
    name: body.name,
    passwordHash: await hashPassword(body.password),
    credits: starter,
    tokenVersion: 1,
    createdAt: new Date(),
  };
  try {
    await (await users()).insertOne(user);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new ApiError(409, "email_taken", "There's already an account with that email. Sign in instead.");
    }
    throw error;
  }
  if (starter > 0) {
    await (await ledger()).insertOne({ _id: new ObjectId(), userId: user._id, delta: starter, reason: "starter", createdAt: new Date() });
  }
  return json(request, { token: await issueToken(user), user: publicUser(user) }, 201);
});
