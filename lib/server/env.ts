import "server-only";

/** Reads a required environment variable, failing loudly at first use. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  mongoUri: () => required("MONGODB_URI"),
  mongoDb: () => process.env.MONGODB_DB || "alfred",
  authSecret: () => {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
    return new TextEncoder().encode(secret);
  },
  starterCredits: () => Number(process.env.STARTER_CREDITS ?? 10),
  siteUrl: () => process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Comma-separated extension origins allowed to call the API, e.g. chrome-extension://abc… */
  extensionOrigins: () =>
    (process.env.EXTENSION_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
};
