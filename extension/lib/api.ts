import type { AiTask, TaskInput, TaskOutput } from "@shared/ai";
import { billingItem, sessionItem, type Session } from "./storage";

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

export async function register(email: string, password: string, name: string): Promise<{ challengeId: string }> {
  return request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }), auth: false });
}

export async function verifyRegistration(challengeId: string, code: string): Promise<Session> {
  const session = await request<Session>("/auth/verify-email", { method: "POST", body: JSON.stringify({ challengeId, code }), auth: false });
  await billingItem.setValue(null);
  await sessionItem.setValue(session);
  return session;
}

export async function forgotPassword(email: string): Promise<{ challengeId: string }> {
  return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }), auth: false });
}

export async function resetPassword(challengeId: string, code: string, password: string): Promise<void> {
  await request("/auth/reset-password", { method: "POST", body: JSON.stringify({ challengeId, code, password }), auth: false });
}

export async function signIn(email: string, password: string): Promise<Session> {
  const session = await request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  await billingItem.setValue(null);
  await sessionItem.setValue(session);
  return session;
}

/** Signs out here; with everywhere=true, also ends every other session. */
export async function signOut(everywhere = false): Promise<void> {
  if (everywhere) await request("/auth/logout", { method: "POST" }).catch(() => undefined);
  await sessionItem.setValue(null);
  await billingItem.setValue(null);
}

export type CreditsInfo = {
  credits: number;
  costs: Record<AiTask, number>;
  /** True until the account's first (free) CV import. */
  freeCvImport: boolean;
  ownKeyUnlocked: boolean;
  ownKeyUnlockCost: number;
  history: { delta: number; reason: string; task: string | null; createdAt: string }[];
};

export async function fetchCredits(): Promise<CreditsInfo> {
  const info = await request<CreditsInfo>("/credits");
  await billingItem.setValue({ costs: info.costs, ownKeyUnlockCost: info.ownKeyUnlockCost, freeCvImport: info.freeCvImport });
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

export async function runTaskWithCredits<T extends AiTask>(task: T, input: TaskInput[T]): Promise<TaskOutput[T]> {
  const result = await request<{ output: TaskOutput[T]; credits: number }>(`/ai/${task}`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
  await updateBalance(result.credits);
  if (task === "parse-cv") {
    const billing = await billingItem.getValue();
    if (billing) await billingItem.setValue({ ...billing, freeCvImport: false });
  }
  return result.output;
}

async function updateBalance(credits: number) {
  const session = await sessionItem.getValue();
  if (session) await sessionItem.setValue({ ...session, user: { ...session.user, credits } });
}
