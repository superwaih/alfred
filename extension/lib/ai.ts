import { TASK_COST, type AiTask, type TaskInput, type TaskOutput } from "@shared/ai";
import { ApiError, runTaskWithCredits } from "./api";
import { runTaskWithOwnKey } from "./providers";
import { sessionItem, settingsItem } from "./storage";

export type AiResult<T extends AiTask> = { output: TaskOutput[T]; via: "credits" | "own-key" };

/** Thrown when there's no way to run a task: signed out or out of credits, and no usable own key. */
export class NoAiAvailable extends Error {
  constructor(readonly reason: "signed-out" | "out-of-credits" | "no-key" | "locked") {
    super(
      reason === "signed-out"
        ? "Sign in to use Alfred's credits."
        : reason === "out-of-credits"
          ? "You're out of credits. Buy more, or unlock your own API key in Account."
          : reason === "locked"
            ? "Using your own API key needs a one-time unlock in Account."
            : "Add your own API key in Account, or switch back to Alfred credits.",
    );
  }
}

/**
 * Runs an AI task the way the user set it up:
 * - "auto": Alfred credits while the balance covers the task, then the user's own key.
 * - "own-key": always the user's own key.
 */
export async function runAi<T extends AiTask>(task: T, input: TaskInput[T]): Promise<AiResult<T>> {
  const [settings, session] = await Promise.all([settingsItem.getValue(), sessionItem.getValue()]);
  // Own keys work only once the account has paid the one-time unlock.
  const unlocked = Boolean(session?.user.ownKeyUnlocked);
  const hasKey = unlocked && Boolean(settings.keys[settings.provider]?.trim());

  if (settings.aiMode === "own-key") {
    if (!unlocked) throw new NoAiAvailable("locked");
    if (!hasKey) throw new NoAiAvailable("no-key");
    return { output: await runTaskWithOwnKey(settings, task, input), via: "own-key" };
  }

  // The first CV import is free on the server, so try it even on an empty balance.
  if (session && (session.user.credits >= TASK_COST[task] || task === "parse-cv")) {
    try {
      return { output: await runTaskWithCredits(task, input), via: "credits" };
    } catch (error) {
      const outOfCredits = error instanceof ApiError && error.code === "insufficient_credits";
      if (!outOfCredits || !hasKey) throw error;
    }
  }

  if (hasKey) return { output: await runTaskWithOwnKey(settings, task, input), via: "own-key" };
  throw new NoAiAvailable(session ? "out-of-credits" : "signed-out");
}
