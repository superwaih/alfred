import { type AiTask } from "@shared/ai";
import { billingItem, sessionItem, settingsItem } from "@/lib/storage";
import { useStored } from "./use-stored";

/**
 * " · 3 credits" when the task will be paid from Alfred credits, "" when it
 * will run on the user's own key (so nothing implies a charge that won't happen).
 */
export function useCostLabel(task: AiTask): string {
  const [settings] = useStored(settingsItem);
  const [session] = useStored(sessionItem);
  const [billing] = useStored(billingItem);
  if (!settings || settings.aiMode === "own-key" || !session || !billing) return "";
  const cost = task === "parse-cv" && billing.freeCvImport ? 0 : billing.costs[task];
  if (session.user.credits < cost && session.user.ownKeyUnlocked && settings.keys[settings.provider]) return "";
  return ` · ${cost} credit${cost === 1 ? "" : "s"}`;
}
