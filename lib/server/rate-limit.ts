import "server-only";
import { createHmac } from "node:crypto";
import { rateLimits } from "./db";
import { env } from "./env";
import { ApiError } from "./http";

/** Fixed windows stored in MongoDB, shared by all server instances. */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const window = Math.floor(Date.now() / windowMs);
  const id = createHmac("sha256", env.authSecret()).update(`${key}:${window}`).digest("hex");
  const row = await (await rateLimits()).findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } },
    { upsert: true, returnDocument: "after" },
  );
  if (row && row.count > limit) throw new ApiError(429, "rate_limited", "Too many attempts. Please wait before trying again.");
}
