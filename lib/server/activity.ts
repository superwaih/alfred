import "server-only";
import { ObjectId } from "mongodb";
import { activity } from "./db";

/** No prompts, CV text, passwords, or API keys are included in activity. */
export async function recordActivity(action: string, actor: string, target = "", detail = "") {
  try {
    await (await activity()).insertOne({ _id: new ObjectId(), action, actor, target, detail, createdAt: new Date() });
  } catch (error) {
    // Operational logging must not turn a completed AI task or login into a failure.
    // Administrative mutations use their own mandatory, transactional audit writes.
    console.error("Activity recording failed", action, error instanceof Error ? error.name : "unknown");
  }
}
