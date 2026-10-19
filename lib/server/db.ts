import "server-only";
import { MongoClient, type Collection, type Db, type ObjectId, type ClientSession } from "mongodb";
import { env } from "./env";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  credits: number;
  /** Bumped on "sign out everywhere"; tokens carrying an older version are rejected. */
  tokenVersion: number;
  /** Paid the one-time unlock to use their own AI key. */
  ownKeyUnlocked?: boolean;
  role?: "admin" | "user";
  suspended?: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
};

export type LedgerReason = "starter" | "purchase" | "task" | "refund" | "unlock" | "admin";

export type LedgerDoc = {
  _id: ObjectId;
  userId: ObjectId;
  delta: number;
  reason: LedgerReason;
  task?: string;
  note?: string;
  actorId?: ObjectId;
  /** Polar order id for purchases; unique, so a webhook retry can't grant twice. */
  orderId?: string;
  createdAt: Date;
};

// One client per server process, kept across hot reloads in development.
const globalForMongo = globalThis as unknown as { alfredMongo?: Promise<MongoClient> };

function client(): Promise<MongoClient> {
  globalForMongo.alfredMongo ??= new MongoClient(env.mongoUri()).connect();
  return globalForMongo.alfredMongo;
}

let indexesReady: Promise<void> | null = null;

async function db(): Promise<Db> {
  const database = (await client()).db(env.mongoDb());
  indexesReady ??= Promise.all([
    database.collection("authChallenges").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("activity").createIndex({ createdAt: -1 }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("ledger").createIndex({ userId: 1, createdAt: -1 }),
    database.collection("ledger").createIndex({ orderId: 1 }, { unique: true, partialFilterExpression: { orderId: { $type: "string" } } }),
  ]).then(() => undefined);
  await indexesReady;
  return database;
}

export async function users(): Promise<Collection<UserDoc>> {
  return (await db()).collection<UserDoc>("users");
}

export async function ledger(): Promise<Collection<LedgerDoc>> {
  return (await db()).collection<LedgerDoc>("ledger");
}

export type AuthChallenge = {
  _id: string;
  email: string;
  purpose: "register" | "reset";
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  name?: string;
  passwordHash?: string;
};

export type ActivityDoc = {
  _id: ObjectId;
  action: string;
  actor: string;
  target: string;
  detail: string;
  createdAt: Date;
};

export async function challenges() { return (await db()).collection<AuthChallenge>("authChallenges"); }
export async function rateLimits() { return (await db()).collection<{ _id: string; count: number; expiresAt: Date }>("rateLimits"); }
export async function activity() { return (await db()).collection<ActivityDoc>("activity"); }
export async function settingsCollection() {
  return (await db()).collection<{ _id: "app"; value: import("@/shared/admin").AppSettings }>("settings");
}

/** Keep administrative changes and their audit records in the same commit. */
export async function transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = (await client()).startSession();
  try { return await session.withTransaction(() => work(session)); }
  finally { await session.endSession(); }
}
