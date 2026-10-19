/** Explicit operator bootstrap. Never overwrites an existing account. */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createJiti } from "jiti";
import { ObjectId } from "mongodb";

const jiti = createJiti(import.meta.url, { alias: { "@": resolve("."), "server-only": createRequire(import.meta.url).resolve("server-only") } });
const db = await jiti.import("../lib/server/db.ts");
const auth = await jiti.import("../lib/server/auth.ts");
const { isAdmin } = await jiti.import("../lib/server/admin.ts");
const { appSettings } = await jiti.import("../lib/server/settings.ts");

try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Set ADMIN_EMAIL before seeding.");
  const users = await db.users();
  if (await users.findOne({ email })) {
    console.log(`Account ${email} already exists; its password and permissions were preserved.`);
  } else {
    const password = randomBytes(24).toString("base64url");
    const now = new Date();
    const settings = await appSettings();
    const user = {
      _id: new ObjectId(), email, name: "Alfred Admin",
      passwordHash: await auth.hashPassword(password),
      credits: settings.starterCredits, tokenVersion: 0,
      role: "admin", suspended: false, emailVerifiedAt: now, createdAt: now,
    };
    const ledger = await db.ledger();
    const activity = await db.activity();
    await db.transaction(async session => {
      await users.insertOne(user, { session });
      await ledger.insertOne({ _id: new ObjectId(), userId: user._id, delta: user.credits, reason: "starter", createdAt: now }, { session });
      await activity.insertOne({ _id: new ObjectId(), action: "admin.seed", actor: "operator", target: email, detail: "Initial administrator provisioned by server seed script.", createdAt: now }, { session });
    });
    const saved = await users.findOne({ _id: user._id });
    if (!saved || !isAdmin(saved) || !await auth.verifyPassword(password, saved.passwordHash)) {
      throw new Error("Seeded account verification failed.");
    }
    console.log(`Admin created and credentials verified.\nEmail: ${email}\nPassword: ${password}\nSign in at /admin. Store this password securely; it is displayed only on creation.`);
  }
} finally {
  if (globalThis.alfredMongo) await (await globalThis.alfredMongo).close();
}
