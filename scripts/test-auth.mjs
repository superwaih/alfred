/** Integration checks in a uniquely named, temporary database. Never sends email. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createJiti } from "jiti";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI to a test-capable MongoDB replica set.");
const databaseName = `alfred_test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
process.env.MONGODB_DB = databaseName;
process.env.AUTH_SECRET = "integration-tests-only-secret-with-more-than-32-characters";
process.env.STARTER_CREDITS = "10";
process.env.ADMIN_EMAIL = "owner@example.test";
process.env.RESEND_API_KEY = "test-key-never-sent";
process.env.EMAIL_FROM = "Alfred <auth@example.test>";
process.env.NEXT_PUBLIC_SITE_URL = "https://alfreed.space";
process.env.APP_URL = "https://alfreed.space";
const originalFetch = globalThis.fetch;
const emails = [];
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), "https://api.resend.com/emails", "Tests must never make unexpected external requests");
  emails.push(JSON.parse(init.body));
  return Response.json({ id: randomUUID() });
};
const jiti = createJiti(import.meta.url, { alias: { "@": resolve("."), "server-only": createRequire(import.meta.url).resolve("server-only") } });
const db = await jiti.import("../lib/server/db.ts");
const auth = await jiti.import("../lib/server/auth.ts");
const emailAuth = await jiti.import("../lib/server/email-auth.ts");
const admin = await jiti.import("../lib/server/admin.ts");
const management = await jiti.import("../lib/server/user-management.ts");
const settings = await jiti.import("../lib/server/settings.ts");
const limits = await jiti.import("../lib/server/rate-limit.ts");
const cleanup = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const code = () => emails.at(-1).text.match(/\b\d{6}\b/)[0];
const rejectCode = (expected) => error => error.code === expected;
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }

try {
  await cleanup.connect();
  const userCollection = await db.users();
  let user, owner, token;
  await check("registration requires OTP; wrong code rejected; no account before verification", async () => {
    const result = await emailAuth.startChallenge("owner@example.test", "register", { name: "Owner", password: "original-password" });
    assert.equal(await userCollection.countDocuments(), 0);
    const sentCode = code();
    const stored = await (await db.challenges()).findOne({ _id: result.challengeId });
    assert.notEqual(stored.codeHash, sentCode);
    await assert.rejects(emailAuth.finishRegistration(result.challengeId, sentCode === "000000" ? "000001" : "000000"), rejectCode("invalid_code"));
    owner = await emailAuth.finishRegistration(result.challengeId, sentCode);
    assert.ok(owner.emailVerifiedAt); assert.equal(owner.credits, 10); assert.ok(admin.isAdmin(owner));
    await assert.rejects(emailAuth.finishRegistration(result.challengeId, sentCode), rejectCode("invalid_code"));
  });
  await check("password sign-in and token audiences remain distinct", async () => {
    assert.ok(await auth.verifyPassword("original-password", owner.passwordHash));
    assert.equal(await auth.verifyPassword("wrong-password", owner.passwordHash), false);
    token = await auth.issueToken(owner);
    assert.equal((await auth.userForToken(token, "alfred-extension")).email, owner.email);
    await assert.rejects(auth.userForToken(token, "alfred-admin"), rejectCode("invalid_token"));
    const adminToken = await auth.issueToken(owner, "alfred-admin");
    await assert.rejects(auth.userForToken(adminToken, "alfred-extension"), rejectCode("invalid_token"));
  });
  await check("unverified and ordinary users cannot become admins by logging in", async () => {
    assert.equal(admin.isAdmin({ ...owner, emailVerifiedAt: undefined }), false);
    const result = await emailAuth.startChallenge("user@example.test", "register", { name: "User", password: "another-password" });
    user = await emailAuth.finishRegistration(result.challengeId, code());
    assert.equal(admin.isAdmin(user), false);
    await assert.rejects(management.applyUserAction(user, { action: "revoke", id: owner._id.toHexString() }), rejectCode("admin_required"));
  });
  await check("OTP expires and locks after five incorrect attempts", async () => {
    const challenge = { _id: "a".repeat(64), email: "expired@example.test", purpose: "reset", codeHash: emailAuth.otpHash("a".repeat(64), "123456"), attempts: 0, expiresAt: new Date(Date.now() - 1000) };
    await (await db.challenges()).insertOne(challenge);
    await assert.rejects(emailAuth.consumeChallenge(challenge._id, "123456", "reset"), rejectCode("invalid_code"));
    await (await db.challenges()).updateOne({ _id: challenge._id }, { $set: { expiresAt: new Date(Date.now() + 60000) } });
    for (let i = 0; i < 5; i++) await assert.rejects(emailAuth.consumeChallenge(challenge._id, "000000", "reset"), rejectCode("invalid_code"));
    await assert.rejects(emailAuth.consumeChallenge(challenge._id, "123456", "reset"), rejectCode("invalid_code"));
  });
  await check("password reset revokes existing sessions and cannot be replayed", async () => {
    await (await db.rateLimits()).deleteMany({});
    const result = await emailAuth.startChallenge(owner.email, "reset");
    const sentCode = code();
    await assert.rejects(emailAuth.consumeChallenge(result.challengeId, sentCode, "register"), rejectCode("invalid_code"));
    await emailAuth.resetPassword(result.challengeId, sentCode, "replacement-password");
    await assert.rejects(auth.userForToken(token, "alfred-extension"), rejectCode("invalid_token"));
    owner = await userCollection.findOne({ _id: owner._id });
    assert.ok(await auth.verifyPassword("replacement-password", owner.passwordHash));
    await assert.rejects(emailAuth.resetPassword(result.challengeId, sentCode, "third-password"), rejectCode("invalid_code"));
  });
  await check("unknown reset email returns a generic challenge without sending mail", async () => {
    const before = emails.length;
    assert.ok((await emailAuth.startChallenge("missing@example.test", "reset")).challengeId);
    assert.equal(emails.length, before);
  });
  await check("credit adjustment is audited, idempotent, and never goes negative", async () => {
    const action = { action: "credits", id: user._id.toHexString(), delta: 5, note: "Support adjustment", requestId: randomUUID() };
    const changed = await management.applyUserAction(owner, action);
    assert.equal(changed.credits, 15);
    await assert.rejects(management.applyUserAction(owner, action), rejectCode("duplicate_adjustment"));
    assert.equal((await userCollection.findOne({ _id: user._id })).credits, 15);
    await assert.rejects(management.applyUserAction(owner, { ...action, delta: -16, requestId: randomUUID() }), rejectCode("negative_balance"));
    assert.equal(await (await db.ledger()).countDocuments({ reason: "admin", userId: user._id }), 1);
    assert.equal(await (await db.activity()).countDocuments({ action: "admin.credits" }), 1);
  });
  await check("suspension, restoration, and session revocation are enforced", async () => {
    const oldToken = await auth.issueToken(user);
    await management.applyUserAction(owner, { action: "suspend", id: user._id.toHexString(), suspended: true });
    await assert.rejects(auth.userForToken(oldToken, "alfred-extension"), rejectCode("invalid_token"));
    const suspended = await userCollection.findOne({ _id: user._id });
    await assert.rejects(auth.userForToken(await auth.issueToken(suspended), "alfred-extension"), rejectCode("account_suspended"));
    user = await management.applyUserAction(owner, { action: "suspend", id: user._id.toHexString(), suspended: false });
    const fresh = await auth.issueToken(user);
    assert.ok(await auth.userForToken(fresh, "alfred-extension"));
    await management.applyUserAction(owner, { action: "revoke", id: user._id.toHexString() });
    await assert.rejects(auth.userForToken(fresh, "alfred-extension"), rejectCode("invalid_token"));
  });
  await check("owner protections and verified admin promotion", async () => {
    await assert.rejects(management.applyUserAction(owner, { action: "suspend", id: owner._id.toHexString(), suspended: true }), rejectCode("protected_admin"));
    await assert.rejects(management.applyUserAction(owner, { action: "role", id: owner._id.toHexString(), role: "user" }), rejectCode("protected_admin"));
    user = await management.applyUserAction(owner, { action: "role", id: user._id.toHexString(), role: "admin" });
    assert.ok(admin.isAdmin(user));
    await userCollection.updateOne({ _id: user._id }, { $unset: { emailVerifiedAt: "" } });
    await assert.rejects(management.applyUserAction(owner, { action: "role", id: user._id.toHexString(), role: "admin" }), rejectCode("email_unverified"));
  });
  await check("registration settings and starter credits are applied", async () => {
    const defaults = await settings.appSettings();
    await (await db.settingsCollection()).updateOne({ _id: "app" }, { $set: { value: { ...defaults, registrationsOpen: false } } }, { upsert: true });
    await assert.rejects(emailAuth.startChallenge("paused@example.test", "register", { name: "Paused", password: "long-password" }), rejectCode("registration_closed"));
    await (await db.settingsCollection()).updateOne({ _id: "app" }, { $set: { value: { ...defaults, starterCredits: 4 } } });
    const result = await emailAuth.startChallenge("four@example.test", "register", { name: "Four", password: "long-password" });
    assert.equal((await emailAuth.finishRegistration(result.challengeId, code())).credits, 4);
    assert.equal(settings.settingsSchema.safeParse({ ...defaults, starterCredits: -1 }).success, false);
  });
  await check("rate limits and same-origin admin writes", async () => {
    await limits.rateLimit("test-limit", 1, 60000);
    await assert.rejects(limits.rateLimit("test-limit", 1, 60000), rejectCode("rate_limited"));
    assert.throws(() => admin.assertAdminOrigin(new Request("https://alfreed.space/api/admin/settings", { method: "POST", headers: { origin: "https://attacker.test" } })), rejectCode("invalid_origin"));
    admin.assertAdminOrigin(new Request("https://alfreed.space/api/admin/settings", { method: "POST", headers: { origin: "https://alfreed.space" } }));
  });
  console.log(`${checks} integration checks passed. No real email sent.`);
} finally {
  globalThis.fetch = originalFetch;
  assert.ok(databaseName.startsWith("alfred_test_"));
  for (const name of ["users", "ledger", "activity", "settings", "authChallenges", "rateLimits"]) await cleanup.db(databaseName).collection(name).deleteMany({});
  await cleanup.close();
  const appClient = await globalThis.alfredMongo;
  if (appClient) await appClient.close();
}
