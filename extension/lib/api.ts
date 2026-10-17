import type { AiTask, TaskInput, TaskOutput } from "@shared/ai";
import { sessionItem, type Session } from "./storage";

/** Alfred's API. Set WXT_API_URL in extension/.env for production builds. */
export const API_URL = (import.meta.env.WXT_API_URL as string | undefined) || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.auth !== false) {
    const session = await sessionItem.getValue();
    if (session) headers.set("Authorization", `Bearer ${session.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "offline", "Couldn't reach Alfred. Check your connection and try again.");
  }

  const body = (await response.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!response.ok) {
    if (response.status === 401 && init.auth !== false) await sessionItem.setValue(null);
    throw new ApiError(response.status, body?.error?.code ?? "error", body?.error?.message ?? "Something went wrong.");
  }
  return body as T;
}

export async function register(email: string, password: string, name: string): Promise<Session> {
  const session = await request<Session>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
    auth: false,
  });
  await sessionItem.setValue(session);
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const session = await request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  await sessionItem.setValue(session);
  return session;
}

/** Signs out here; with everywhere=true, also ends every other session. */
export async function signOut(everywhere = false): Promise<void> {
  if (everywhere) await request("/auth/logout", { method: "POST" }).catch(() => undefined);
  await sessionItem.setValue(null);
}

export type CreditsInfo = {
  credits: number;
  costs: Record<AiTask, number>;
  /** True until the account's first (free) CV import. */
  freeCvImport: boolean;
  ownKeyUnlocked: boolean;
  ownKeyUnlockCost: number;
  packs: { id: string; credits: number; label: string; price: string }[];
  history: { delta: number; reason: string; task: string | null; createdAt: string }[];
};

export async function fetchCredits(): Promise<CreditsInfo> {
  const info = await request<CreditsInfo>("/credits");
  await updateBalance(info.credits);
  const session = await sessionItem.getValue();
  if (session && session.user.ownKeyUnlocked !== info.ownKeyUnlocked) {
    await sessionItem.setValue({ ...session, user: { ...session.user, ownKeyUnlocked: info.ownKeyUnlocked } });
  }
  return info;
}

/** Pays the one-time unlock for "use my own API key". */
export async function unlockOwnKey(): Promise<void> {
  const { user } = await request<{ user: Session["user"] }>("/own-key/unlock", { method: "POST" });
  const session = await sessionItem.getValue();
  if (session) await sessionItem.setValue({ ...session, user });
}

export async function startCheckout(packId: string): Promise<string> {
  const { url } = await request<{ url: string }>("/credits/checkout", {
    method: "POST",
    body: JSON.stringify({ packId }),
  });
  return url;
}

export async function runTaskWithCredits<T extends AiTask>(task: T, input: TaskInput[T]): Promise<TaskOutput[T]> {
  const result = await request<{ output: TaskOutput[T]; credits: number }>(`/ai/${task}`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
  await updateBalance(result.credits);
  return result.output;
}

async function updateBalance(credits: number) {
  const session = await sessionItem.getValue();
  if (session) await sessionItem.setValue({ ...session, user: { ...session.user, credits } });
}
