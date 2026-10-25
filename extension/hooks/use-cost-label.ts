import { type AiTask } from "@shared/ai";
import { billingItem, sessionItem, settingsItem } from "@/lib/storage";
import { useStored } from "./use-stored";

/**
 * " · 3 credits" when the task will be paid from Alfred credits, "" when it
 * will run on the user's own key (so nothing implies a charge that won't happen).
 */
export function useCostLabel(task: AiTask): string {
  return useCostTotal([task]);
}

/** The same label for several tasks run together, e.g. " · 3 credits" for drafting three answers. */
export function useCostTotal(tasks: AiTask[]): string {
  const [settings] = useStored(settingsItem);
  const [session] = useStored(sessionItem);
  const [billing] = useStored(billingItem);
  if (!tasks.length || !settings || settings.aiMode === "own-key" || !session || !billing) return "";
  const cost = tasks.reduce((sum, task) => sum + (task === "parse-cv" && billing.freeCvImport ? 0 : billing.costs[task]), 0);
  if (session.user.credits < cost && session.user.ownKeyUnlocked && settings.keys[settings.provider]) return "";
  return ` · ${cost} credit${cost === 1 ? "" : "s"}`;
}
