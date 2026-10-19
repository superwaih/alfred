import "server-only";

/** Reads a required environment variable, failing loudly at first use. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export type CreditPack = {
  id: string;
  /** Polar product id for this pack. */
  productId: string;
  credits: number;
  label: string;
  /** Display price, e.g. "$5". Polar holds the real price. */
  price: string;
};

export const env = {
  mongoUri: () => required("MONGODB_URI"),
  mongoDb: () => process.env.MONGODB_DB || "alfred",
  authSecret: () => {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return new TextEncoder().encode(secret);
  },
  starterCredits: () => Number(process.env.STARTER_CREDITS ?? 10),
  polarAccessToken: () => required("POLAR_ACCESS_TOKEN"),
  polarWebhookSecret: () => required("POLAR_WEBHOOK_SECRET"),
  polarEnvironment: (): "sandbox" | "production" =>
    process.env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
  /** JSON array of CreditPack, e.g. [{"id":"starter","productId":"…","credits":30,"label":"30 credits","price":"$5"}]. */
  creditPacks: (): CreditPack[] => {
    const raw = process.env.POLAR_CREDIT_PACKS;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CreditPack[];
    return parsed.filter((pack) => pack.id && pack.productId && pack.credits > 0);
  },
  siteUrl: () => process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Comma-separated extension origins allowed to call the API, e.g. chrome-extension://abc… */
  extensionOrigins: () =>
    (process.env.EXTENSION_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
};
