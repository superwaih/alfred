import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { z } from "zod";
import { isAdmin, isOwner } from "./admin";
import { activity, ledger, transaction, users, type UserDoc } from "./db";
import { ApiError } from "./http";

const id = z.string().regex(/^[a-f0-9]{24}$/);
export const userActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), id, suspended: z.boolean() }),
  z.object({ action: z.literal("role"), id, role: z.enum(["admin", "user"]) }),
  z.object({ action: z.literal("revoke"), id }),
  z.object({ action: z.literal("credits"), id, delta: z.number().int().min(-100000).max(100000).refine(v => v !== 0), note: z.string().trim().min(5).max(300), requestId: z.uuid() }),
]);

export async function applyUserAction(actor: UserDoc, body: z.infer<typeof userActionBody>): Promise<UserDoc | null> {
  if (!isAdmin(actor)) throw new ApiError(403, "admin_required", "Administrator access required.");
  const collection = await users(), audit = await activity(), entries = await ledger();
  const targetId = new ObjectId(body.id);
  let result: UserDoc | null = null;
  try {
    await transaction(async session => {
      const target = await collection.findOne({ _id: targetId }, { session });
      if (!target) throw new ApiError(404, "not_found", "User not found.");
      if ((body.action === "suspend" || body.action === "role") && (target._id.equals(actor._id) || isOwner(target))) {
        throw new ApiError(400, "protected_admin", "You cannot suspend or change the role of yourself or the initial administrator.");
      }
      let detail = "";
      if (body.action === "credits") {
        result = await collection.findOneAndUpdate(
          { _id: targetId, ...(body.delta < 0 ? { credits: { $gte: -body.delta } } : {}) },
          { $inc: { credits: body.delta } }, { session, returnDocument: "after" },
        );
        if (!result) throw new ApiError(400, "negative_balance", "This adjustment would make the balance negative.");
        await entries.insertOne({ _id: new ObjectId(), userId: targetId, delta: body.delta, reason: "admin", note: body.note, actorId: actor._id, orderId: `admin:${body.requestId}`, createdAt: new Date() }, { session });
        detail = `${body.delta > 0 ? "+" : ""}${body.delta} credits: ${body.note}`;
      } else if (body.action === "role") {
        if (body.role === "admin" && !target.emailVerifiedAt) throw new ApiError(400, "email_unverified", "The user must verify their email before becoming an administrator.");
        result = await collection.findOneAndUpdate({ _id: targetId }, { $set: { role: body.role }, $inc: { tokenVersion: 1 } }, { session, returnDocument: "after" });
        detail = `${target.role || "user"} → ${body.role}`;
      } else if (body.action === "suspend") {
        result = await collection.findOneAndUpdate({ _id: targetId }, { $set: { suspended: body.suspended }, $inc: { tokenVersion: 1 } }, { session, returnDocument: "after" });
        detail = body.suspended ? "Account suspended" : "Account restored";
      } else {
        result = await collection.findOneAndUpdate({ _id: targetId }, { $inc: { tokenVersion: 1 } }, { session, returnDocument: "after" });
        detail = "All sessions revoked";
      }
      await audit.insertOne({ _id: new ObjectId(), action: `admin.${body.action}`, actor: actor.email, target: target.email, detail, createdAt: new Date() }, { session });
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new ApiError(409, "duplicate_adjustment", "This adjustment was already applied. Refresh to see the current balance.");
    throw error;
  }
  return result;
}
