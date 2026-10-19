import "server-only";
import { z } from "zod";
import { TASK_COST, OWN_KEY_UNLOCK_COST } from "@/shared/ai";
import type { AppSettings } from "@/shared/admin";
import { settingsCollection } from "./db";
import { env } from "./env";

const cost = z.number().int().min(0).max(1000);
export const settingsSchema = z.object({
  registrationsOpen: z.boolean(),
  aiEnabled: z.boolean(),
  starterCredits: z.number().int().min(0).max(10000),
  ownKeyUnlockCost: cost,
  taskCosts: z.object({ "tailor-cv": cost, "cover-letter": cost, answer: cost, "parse-cv": cost }),
});

export async function appSettings(): Promise<AppSettings> {
  const saved = await (await settingsCollection()).findOne({ _id: "app" });
  return saved?.value ?? {
    registrationsOpen: true, aiEnabled: true, starterCredits: env.starterCredits(),
    ownKeyUnlockCost: OWN_KEY_UNLOCK_COST, taskCosts: { ...TASK_COST },
  };
}
