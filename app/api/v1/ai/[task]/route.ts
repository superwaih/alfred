import { appSettings } from "@/lib/server/settings";
import { recordActivity } from "@/lib/server/activity";
import type { z } from "zod";
import { TASK_COST, type AiTask } from "@/shared/ai";
import { requireUser } from "@/lib/server/auth";
import { runTask } from "@/lib/server/deepseek";
import { debit, hasUsedFreeCvImport, recordFreeTask, refund } from "@/lib/server/credits";
import { ApiError, handle, json, preflight, readJson } from "@/lib/server/http";
import { taskBodies } from "@/lib/server/schemas";

export const OPTIONS = preflight;

function isTask(value: string): value is AiTask {
  return value in TASK_COST;
}

/** Runs an AI task on Alfred's credits: debit first, refund if the task fails. */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/ai/[task]">): Promise<Response> {
  const { task } = await ctx.params;
  return handle(async (req) => {
    if (!isTask(task)) throw new ApiError(404, "unknown_task", "Unknown task.");
    const user = await requireUser(req);
    const settings = await appSettings();
    if (!settings.aiEnabled) throw new ApiError(503, "ai_paused", "AI processing is temporarily paused. Try again later.");
    // Each task validates its own input shape; runTask is typed per task.
    const schema: z.ZodType<{ input: unknown }> = taskBodies[task];
    const { input } = await readJson(req, schema);

    async function observedTask() {
      try {
        const output = await runTask(task as AiTask, input as never);
        await recordActivity("ai.completed", user.email, task);
        return output;
      } catch (error) {
        await recordActivity("ai.failed", user.email, task, error instanceof ApiError ? error.code : "server_error");
        throw error;
      }
    }

    if (task === "parse-cv" && !(await hasUsedFreeCvImport(user._id))) {
      // First CV import: free, and only counted once it succeeds.
      const output = await observedTask();
      await recordFreeTask(user._id, task);
      return json(req, { output, credits: user.credits, charged: 0 });
    }

    const cost = settings.taskCosts[task];
    const balance = await debit(user._id, cost, task);
    try {
      const output = await observedTask();
      return json(req, { output, credits: balance, charged: cost });
    } catch (error) {
      await refund(user._id, cost, task);
      throw error;
    }
  })(request);
}
