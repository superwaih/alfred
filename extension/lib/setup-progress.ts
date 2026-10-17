import type { SetupState } from "./storage";

/** Whether first-run setup is finished (new single-screen setup, or the older one). */
export function setupComplete(setup: SetupState): boolean {
  if (setup.done) return true;
  const c = setup.confirmed;
  return Boolean(c?.details && c.experience && c.preferences);
}
