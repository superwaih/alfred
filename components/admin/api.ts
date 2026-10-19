export class AdminApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init.headers } });
  const data = await response.json();
  if (!response.ok) throw new AdminApiError(response.status, data.error?.message || "The request failed. Try again.");
  return data as T;
}

export const errorText = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Try again.";
