import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@shared/profile";
import { formatLinks } from "@shared/url";
import { profileItem } from "@/lib/storage";
import { useStored } from "./use-stored";

export type ProfileUpdate = (next: Profile | ((previous: Profile) => Profile)) => void;

/**
 * Edits the profile with instant local state and a short debounced save.
 * Updates may be functions of the latest profile, so slow work (an AI CV
 * import) merges into what the user has typed meanwhile. Pending edits are
 * saved when the view closes.
 */
export function useProfileEditor(): [Profile | null, ProfileUpdate] {
  const [stored] = useStored(profileItem);
  const [profile, setProfile] = useState<Profile | null>(null);
  const latest = useRef<Profile | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (stored && !latest.current) {
      // Older profiles may hold links without https://; format them once.
      const formatted = { ...stored, links: formatLinks(stored.links) };
      latest.current = formatted;
      setProfile(formatted);
      if (JSON.stringify(formatted.links) !== JSON.stringify(stored.links)) {
        void profileItem.setValue(formatted);
      }
    }
  }, [stored]);

  const save = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (latest.current) void profileItem.setValue({ ...latest.current, updatedAt: new Date().toISOString() });
  }, []);

  const update = useCallback<ProfileUpdate>(
    (next) => {
      const base = latest.current;
      if (!base) return;
      const value = typeof next === "function" ? next(base) : next;
      latest.current = value;
      setProfile(value);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(save, 400);
    },
    [save],
  );

  useEffect(
    () => () => {
      if (timer.current !== undefined) save();
    },
    [save],
  );

  return [profile, update];
}
