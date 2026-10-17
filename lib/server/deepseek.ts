import "server-only";
import {
  buildUserPrompt,
  isTaskOutput,
  jsonInstruction,
  parseModelJson,
  SYSTEM_PROMPT,
  type AiTask,
  type TaskInput,
  type TaskOutput,
} from "@/shared/ai";
import { ApiError } from "./http";

const BASE_URL = "https://api.deepseek.com";

/** Alfred's own DeepSeek model for credits mode; override with DEEPSEEK_MODEL. */
export const CREDITS_MODEL = () => process.env.DEEPSEEK_MODEL || "deepseek-flash";

type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
};

/**
 * Runs one AI task on DeepSeek (credits mode) and returns its validated
 * structured output. DeepSeek's JSON mode takes no schema, so the schema is
 * written into the prompt and the result is checked here.
 */
export async function runTask<T extends AiTask>(task: T, input: TaskInput[T]): Promise<TaskOutput[T]> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("DEEPSEEK_API_KEY is not set; credits mode can't run AI tasks.");
    throw new ApiError(503, "ai_unavailable", "Alfred's AI is unavailable right now. You haven't been charged.");
  }

  const body = {
    model: CREDITS_MODEL(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(task, input) + jsonInstruction(task) },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
  };

  // JSON mode occasionally returns empty content; one retry covers it.
  for (let attempt = 1; attempt <= 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (error) {
      console.error("DeepSeek request failed:", error);
      throw new ApiError(502, "ai_error", "The AI service didn't respond. Try again.");
    }

    if (!response.ok) {
      const detail = ((await response.json().catch(() => null)) as ChatResponse | null)?.error?.message ?? "";
      console.error(`DeepSeek error ${response.status}:`, detail);
      if (response.status === 401 || response.status === 402) {
        // Bad key, or the DeepSeek account is out of balance: our problem, not the user's.
        throw new ApiError(503, "ai_unavailable", "Alfred's AI is unavailable right now. You haven't been charged.");
      }
      if (response.status === 429 || response.status === 503) {
        throw new ApiError(503, "busy", "Alfred is busy right now. Try again in a minute.");
      }
      throw new ApiError(502, "ai_error", "The AI service had a problem. Try again.");
    }

    const data = (await response.json()) as ChatResponse;
    const choice = data.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new ApiError(502, "truncated", "The answer was cut short. Try a shorter job description.");
    }
    if (choice?.finish_reason === "content_filter") {
      throw new ApiError(422, "refused", "The AI declined this request. Try rewording it.");
    }
    const content = choice?.message?.content ?? "";
    if (!content.trim()) continue;

    const parsed = parseModelJson(content);
    if (isTaskOutput(task, parsed)) return parsed;
    if (attempt === 2) throw new ApiError(502, "ai_error", "The AI returned an incomplete answer. Try again.");
  }
  throw new ApiError(502, "ai_error", "The AI returned an empty answer. Try again.");
}
