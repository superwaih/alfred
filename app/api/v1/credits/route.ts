import { appSettings } from "@/lib/server/settings";
import { requireUser } from "@/lib/server/auth";
import { hasUsedFreeCvImport, recentLedger } from "@/lib/server/credits";
import { handle, json, preflight } from "@/lib/server/http";

export const OPTIONS = preflight;

export const GET = handle(async (request) => {
  const user = await requireUser(request);
  const settings = await appSettings();
  return json(request, {
    credits: user.credits,
    costs: settings.taskCosts,
    freeCvImport: !(await hasUsedFreeCvImport(user._id)),
    // A free unlock needs no step: everyone can use their own key.
    ownKeyUnlocked: Boolean(user.ownKeyUnlocked) || settings.ownKeyUnlockCost === 0,
    ownKeyUnlockCost: settings.ownKeyUnlockCost,
    history: await recentLedger(user._id),
  });
});
