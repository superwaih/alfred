import { adminUser, requireAdmin } from "@/lib/server/admin";
import { activity, ledger, users } from "@/lib/server/db";
import { emailConfigured } from "@/lib/server/email";
import { handle, json } from "@/lib/server/http";
import { appSettings } from "@/lib/server/settings";
import type { AdminSnapshot } from "@/shared/admin";

export const GET = handle(async request => {
  const viewer = await requireAdmin(request);
  const u = await users(), l = await ledger(), a = await activity();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const [total, suspended, verified, balances, tasksToday, failuresToday, spending, settings, events, rows] = await Promise.all([
    u.countDocuments(), u.countDocuments({ suspended: true }), u.countDocuments({ emailVerifiedAt: { $exists: true } }),
    u.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$credits" } } }]).toArray(),
    l.countDocuments({ reason: "task", createdAt: { $gte: today } }),
    a.countDocuments({ action: "ai.failed", createdAt: { $gte: today } }),
    // Task charges are negative and refunds positive, so their sum is minus what was spent.
    l.aggregate<{ total: number }>([{ $match: { reason: { $in: ["task", "refund"] } } }, { $group: { _id: null, total: { $sum: "$delta" } } }]).toArray(),
    appSettings(), a.find().sort({ createdAt: -1 }).limit(50).toArray(), l.find().sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  const actors = await u.find({ _id: { $in: rows.map(row => row.userId) } }, { projection: { email: 1 } }).toArray();
  const emails = new Map(actors.map(user => [user._id.toHexString(), user.email]));
  const result: AdminSnapshot = {
    viewer: adminUser(viewer),
    metrics: { users: total, suspended, verified, credits: balances[0]?.total ?? 0, tasksToday, failuresToday, creditsSpent: -(spending[0]?.total ?? 0) },
    settings, services: { email: emailConfigured(), ai: Boolean(process.env.DEEPSEEK_API_KEY) },
    activity: events.map(row => ({ id: row._id.toHexString(), action: row.action, actor: row.actor, target: row.target, detail: row.detail, createdAt: row.createdAt.toISOString() })),
    ledger: rows.map(row => ({ id: row._id.toHexString(), email: emails.get(row.userId.toHexString()) || "Deleted user", delta: row.delta, reason: row.reason, task: row.task ?? null, createdAt: row.createdAt.toISOString() })),
  };
  return json(request, result);
});
