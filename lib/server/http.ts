import "server-only";
import { z } from "zod";
import { env } from "./env";

/** An error with an HTTP status and a stable code the extension can switch on. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = env.extensionOrigins();
  if (allowed.includes(origin)) return origin;
  // In development any unpacked extension may call the local API.
  if (process.env.NODE_ENV !== "production" && origin.startsWith("chrome-extension://")) return origin;
  return null;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = allowedOrigin(request);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders(request), "Cache-Control": "no-store" } });
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Wraps a handler so thrown ApiErrors and validation errors become JSON responses. */
export function handle(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request);
    } catch (error) {
      if (error instanceof ApiError) {
        return json(request, { error: { code: error.code, message: error.message } }, error.status);
      }
      if (error instanceof z.ZodError) {
        return json(
          request,
          { error: { code: "invalid_request", message: error.issues.map((issue) => issue.message).join("; ") } },
          400,
        );
      }
      console.error(error);
      // In development, say what actually failed (a missing setting, a database
      // that can't be reached); in production, never expose internals.
      const detail = process.env.NODE_ENV !== "production" && error instanceof Error ? ` (${error.message})` : "";
      return json(request, { error: { code: "server_error", message: `Something went wrong on our side.${detail}` } }, 500);
    }
  };
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "The request body must be JSON.");
  }
  return schema.parse(body);
}
