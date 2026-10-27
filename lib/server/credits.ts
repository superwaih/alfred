import "server-only";
import { ObjectId } from "mongodb";
import { ledger, users, type LedgerReason } from "./db";
import { ApiError } from "./http";

/**
 * Takes credits for a task atomically: the balance can never go below zero,
 * even with concurrent requests. Returns the new balance.
 */
export async function debit(userId: ObjectId, amount: number, task: string): Promise<number> {
  const updated = await (await users()).findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw new ApiError(402, "insufficient_credits", "You're out of credits. Add your own API key in Account to keep using AI.");
  }
  await record(userId, -amount, "task", { task });
  return updated.credits;
}

/** Gives credits back when a paid task fails on our side. */
export async function refund(userId: ObjectId, amount: number, task: string): Promise<void> {
  await (await users()).updateOne({ _id: userId }, { $inc: { credits: amount } });
  await record(userId, amount, "refund", { task });
}

async function record(
  userId: ObjectId,
  delta: number,
  reason: LedgerReason,
  extra: { task?: string; orderId?: string } = {},
): Promise<void> {
  await (await ledger()).insertOne({ _id: new ObjectId(), userId, delta, reason, ...extra, createdAt: new Date() });
}

/**
 * Unlocks "use my own API key" for a one-time fee. Atomic: the balance check,
 * the charge and the flag happen in one update, so it can't be paid twice.
 * Returns the new balance; already-unlocked accounts are not charged again.
 */
export async function unlockOwnKey(userId: ObjectId, cost: number): Promise<{ credits: number; charged: number }> {
  const collection = await users();
  const updated = await collection.findOneAndUpdate(
    { _id: userId, ownKeyUnlocked: { $ne: true }, credits: { $gte: cost } },
    { $inc: { credits: -cost }, $set: { ownKeyUnlocked: true } },
    { returnDocument: "after" },
  );
  if (updated) {
    await record(userId, -cost, "unlock");
    return { credits: updated.credits, charged: cost };
  }
  const current = await collection.findOne({ _id: userId });
  if (current?.ownKeyUnlocked) return { credits: current.credits, charged: 0 };
  throw new ApiError(402, "insufficient_credits", `Unlocking your own API key costs ${cost} credits.`);
}

/** Records a task that cost nothing, so the free CV import is used up only once it succeeds. */
export async function recordFreeTask(userId: ObjectId, task: string): Promise<void> {
  await record(userId, 0, "task", { task });
}

/** Each account's first CV import is free, so setting up never costs credits. */
export async function hasUsedFreeCvImport(userId: ObjectId): Promise<boolean> {
  return (await (await ledger()).countDocuments({ userId, reason: "task", task: "parse-cv" }, { limit: 1 })) > 0;
}

export async function recentLedger(userId: ObjectId, limit = 20) {
  const rows = await (await ledger()).find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map((row) => ({
    delta: row.delta,
    reason: row.reason,
    task: row.task ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}
