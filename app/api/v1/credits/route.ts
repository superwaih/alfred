import { appSettings } from "@/lib/server/settings";
import { requireUser } from "@/lib/server/auth";
import { hasUsedFreeCvImport, recentLedger } from "@/lib/server/credits";
import { env } from "@/lib/server/env";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const settings = await appSettings();
  return json(request, {
    credits: user.credits,
    costs: settings.taskCosts,
    freeCvImport: !(await hasUsedFreeCvImport(user._id)),
    ownKeyUnlocked: Boolean(user.ownKeyUnlocked),
    ownKeyUnlockCost: settings.ownKeyUnlockCost,
    packs: env.creditPacks().map(({ id, credits, label, price }) => ({ id, credits, label, price })),
    history: await recentLedger(user._id),
  });
});
