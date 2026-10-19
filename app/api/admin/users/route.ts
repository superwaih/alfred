import { type Filter } from "mongodb";
import { z } from "zod";
import { adminUser, requireAdmin } from "@/lib/server/admin";
import { users, type UserDoc } from "@/lib/server/db";
import { handle, json, readJson } from "@/lib/server/http";
import { applyUserAction, userActionBody } from "@/lib/server/user-management";

export const GET = handle(async request => {
  await requireAdmin(request);
  const params = new URL(request.url).searchParams;
  const query = z.string().max(100).parse(params.get("q") || "").trim();
  const page = z.coerce.number().int().min(1).max(10000).parse(params.get("page") || 1);
  const status = z.enum(["all", "active", "suspended"]).parse(params.get("status") || "all");
  const filter: Filter<UserDoc> = {};
  if (query) {
    const search = { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    filter.$or = [{ email: search }, { name: search }];
  }
  if (status !== "all") filter.suspended = status === "suspended" ? true : { $ne: true };
  const collection = await users();
  const [rows, total] = await Promise.all([
    collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).toArray(), collection.countDocuments(filter),
  ]);
  return json(request, { users: rows.map(adminUser), total, page, pages: Math.max(1, Math.ceil(total / 25)) });
});

export const POST = handle(async request => {
  const actor = await requireAdmin(request);
  const body = await readJson(request, userActionBody);
  const user = await applyUserAction(actor, body);
  return json(request, { user: user ? adminUser(user) : null });
});
