import { OWN_KEY_UNLOCK_COST, TASK_COST } from "@/shared/ai";
import { requireUser } from "@/lib/server/auth";
import { hasUsedFreeCvImport, recentLedger } from "@/lib/server/credits";
import { env } from "@/lib/server/env";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  return json(request, {
    credits: user.credits,
    costs: TASK_COST,
    freeCvImport: !(await hasUsedFreeCvImport(user._id)),
    ownKeyUnlocked: Boolean(user.ownKeyUnlocked),
    ownKeyUnlockCost: OWN_KEY_UNLOCK_COST,
    packs: env.creditPacks().map(({ id, credits, label, price }) => ({ id, credits, label, price })),
    history: await recentLedger(user._id),
  });
});
