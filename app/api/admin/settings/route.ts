import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/server/admin";
import { activity, settingsCollection, transaction } from "@/lib/server/db";
import { handle, json, readJson } from "@/lib/server/http";
import { settingsSchema } from "@/lib/server/settings";

export const POST = handle(async request => {
  const actor = await requireAdmin(request);
  const settings = await readJson(request, settingsSchema);
  const collection = await settingsCollection(), audit = await activity();
  await transaction(async session => {
    const before = await collection.findOne({ _id: "app" }, { session });
    await collection.updateOne({ _id: "app" }, { $set: { value: settings } }, { upsert: true, session });
    await audit.insertOne({ _id: new ObjectId(), action: "admin.settings", actor: actor.email, target: "app", detail: JSON.stringify({ before: before?.value ?? "defaults", after: settings }), createdAt: new Date() }, { session });
  });
  return json(request, { settings });
});
