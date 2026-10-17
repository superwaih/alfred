import Anthropic from "@anthropic-ai/sdk";
import { buildUserPrompt, isTaskOutput, OUTPUT_SCHEMAS, SYSTEM_PROMPT, type AiTask, type TaskInput, type TaskOutput } from "@shared/ai";
import { DEFAULT_MODELS, type Provider, type Settings } from "./storage";

export class ProviderError extends Error {}

export const PROVIDER_LABELS: Record<Provider, string> = {
  deepseek: "DeepSeek",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  gemini: "Google Gemini",
  "openai-compatible": "OpenAI-compatible (OpenRouter, Groq, local…)",
};

/** Runs a task on the user's own key. The key goes straight to the provider, never to Alfred. */
export async function runTaskWithOwnKey<T extends AiTask>(
  settings: Settings,
  task: T,
  input: TaskInput[T],
): Promise<TaskOutput[T]> {
  const provider = settings.provider;
  const key = settings.keys[provider]?.trim();
  if (!key) throw new ProviderError(`Add your ${PROVIDER_LABELS[provider]} key in Account first.`);
  const model = settings.models[provider]?.trim() || DEFAULT_MODELS[provider];
  if (!model) throw new ProviderError("Choose a model for your provider in Account first.");

  const prompt = buildUserPrompt(task, input);
  const schema = OUTPUT_SCHEMAS[task];
  let text: string;
  switch (provider) {
    case "anthropic":
      text = await callAnthropic(key, model, prompt, schema);
      break;
    case "deepseek":
      // DeepSeek offers JSON mode only (no schema), so ask for JSON directly.
      text = await callOpenAiStyle("https://api.deepseek.com", key, model, prompt, schema, task, { jsonModeOnly: true });
      break;
    case "openai":
      text = await callOpenAiStyle("https://api.openai.com/v1", key, model, prompt, schema, task);
      break;
    case "openai-compatible":
      text = await callOpenAiStyle(settings.compatibleBaseUrl.replace(/\/+$/, ""), key, model, prompt, schema, task);
      break;
    case "gemini":
      text = await callGemini(key, model, prompt, schema);
      break;
  }

  const parsed = parseJson(text);
  if (!isTaskOutput(task, parsed)) {
    throw new ProviderError("The model's answer wasn't in the expected format. Try again, or choose a stronger model.");
  }
  return parsed;
}

async function callAnthropic(apiKey: string, model: string, prompt: string, schema: Record<string, unknown>): Promise<string> {
  // The key belongs to the user and stays in their browser.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const isDefault = model === DEFAULT_MODELS.anthropic;
  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // On the default model, rerun a declined request on Anthropic's
      // recommended fallback instead of failing.
      ...(isDefault ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      output_config: {
        ...(isDefault ? { effort: "medium" as const } : {}),
        format: { type: "json_schema", schema },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new ProviderError("Claude declined this request. Try rewording it.");
    if (response.stop_reason === "max_tokens") throw new ProviderError("The answer was cut short. Try a shorter job description.");
    return response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new ProviderError("Anthropic rejected your API key. Check it in Account.");
    if (error instanceof Anthropic.RateLimitError) throw new ProviderError("Your Anthropic account is rate limited or out of credit.");
    if (error instanceof Anthropic.NotFoundError) throw new ProviderError(`Anthropic doesn't recognise the model "${model}".`);
    if (error instanceof Anthropic.APIError) throw new ProviderError(`Anthropic error ${error.status ?? ""}: ${error.message}`);
    throw new ProviderError("Couldn't reach Anthropic. Check your connection.");
  }
}

async function callOpenAiStyle(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  schema: Record<string, unknown>,
  task: AiTask,
  { jsonModeOnly = false }: { jsonModeOnly?: boolean } = {},
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  const strict = { type: "json_schema", json_schema: { name: task.replace(/-/g, "_"), schema, strict: true } };
  // Fallback for providers without JSON-schema output: ask for JSON and spell out the shape.
  const loose = { type: "json_object" };
  const looseMessages = [
    messages[0],
    { role: "user", content: `${prompt}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(schema)}` },
  ];

  let response = jsonModeOnly
    ? await post(baseUrl, apiKey, { model, messages: looseMessages, response_format: loose, max_tokens: 8000 })
    : await post(baseUrl, apiKey, { model, messages, response_format: strict });
  if (!jsonModeOnly && response.status === 400) {
    response = await post(baseUrl, apiKey, { model, messages: looseMessages, response_format: loose });
  }
  if (!response.ok) throw new ProviderError(await describeHttpError(response, "The provider"));
  const body = (await response.json()) as { choices?: { message?: { content?: string; refusal?: string | null } }[] };
  const message = body.choices?.[0]?.message;
  if (message?.refusal) throw new ProviderError("The model declined this request.");
  return message?.content ?? "";
}

function post(baseUrl: string, apiKey: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new ProviderError("Couldn't reach the provider. Check the address and your connection.");
  });
}

async function callGemini(apiKey: string, model: string, prompt: string, schema: Record<string, unknown>): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(schema)}` }],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  ).catch(() => {
    throw new ProviderError("Couldn't reach Google. Check your connection.");
  });
  if (!response.ok) throw new ProviderError(await describeHttpError(response, "Google"));
  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  const candidate = body.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") throw new ProviderError("Gemini declined this request.");
  return candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function describeHttpError(response: Response, who: string): Promise<string> {
  if (response.status === 401 || response.status === 403) return `${who} rejected your API key. Check it in Account.`;
  if (response.status === 404) return `${who} doesn't recognise that model.`;
  if (response.status === 429) return `${who} says you're rate limited or out of credit.`;
  const text = await response.text().catch(() => "");
  return `${who} returned an error (${response.status}). ${text.slice(0, 160)}`;
}

/** Parses model JSON, tolerating a ```json fence some providers add. */
function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new ProviderError("The model's answer wasn't valid JSON. Try again.");
  }
}
