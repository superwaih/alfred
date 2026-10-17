import { TASK_COST, type AiTask } from "@shared/ai";
import { sessionItem, settingsItem } from "@/lib/storage";
import { useStored } from "./use-stored";

/**
 * " · 3 credits" when the task will be paid from Alfred credits, "" when it
 * will run on the user's own key (so nothing implies a charge that won't happen).
 */
export function useCostLabel(task: AiTask): string {
  const [settings] = useStored(settingsItem);
  const [session] = useStored(sessionItem);
  if (!settings || settings.aiMode === "own-key" || !session) return "";
  const cost = TASK_COST[task];
  if (session.user.credits < cost && settings.keys[settings.provider]) return "";
  return ` · ${cost} credit${cost === 1 ? "" : "s"}`;
}
