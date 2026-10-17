import "server-only";
import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";
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
  createdAt: Date;
};

export type LedgerReason = "starter" | "purchase" | "task" | "refund" | "unlock";

export type LedgerDoc = {
  _id: ObjectId;
  userId: ObjectId;
  delta: number;
  reason: LedgerReason;
  task?: string;
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
