import "server-only";
import { createPolar, webhooks } from "@polar-sh/sdk/2026-10";
import { env } from "./env";

let polar: ReturnType<typeof createPolar> | null = null;

export function polarClient() {
  polar ??= createPolar({
    accessToken: env.polarAccessToken(),
    environment: env.polarEnvironment(),
  });
  return polar;
}

export { webhooks };
