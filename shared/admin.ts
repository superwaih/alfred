import type { AiTask } from "./ai";

export type AppSettings = {
  registrationsOpen: boolean;
  aiEnabled: boolean;
  starterCredits: number;
  ownKeyUnlockCost: number;
  taskCosts: Record<AiTask, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  owner: boolean;
  suspended: boolean;
  emailVerified: boolean;
  credits: number;
  ownKeyUnlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminSnapshot = {
  viewer: AdminUser;
  metrics: { users: number; suspended: number; verified: number; credits: number; tasksToday: number; failuresToday: number; creditsSpent: number };
  settings: AppSettings;
  services: { email: boolean; ai: boolean };
  activity: { id: string; action: string; actor: string; target: string; detail: string; createdAt: string }[];
  ledger: { id: string; email: string; delta: number; reason: string; task: string | null; createdAt: string }[];
};
