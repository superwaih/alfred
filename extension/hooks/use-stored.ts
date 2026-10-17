import { useEffect, useState } from "react";
import type { WxtStorageItem } from "wxt/utils/storage";

/**
 * Reads a storage item and stays in sync with changes from anywhere
 * (other views, the content script, another window).
 */
export function useStored<T>(item: WxtStorageItem<T, Record<string, unknown>>): [T | undefined, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    void item.getValue().then((initial) => {
      if (alive) setValue(initial);
    });
    const unwatch = item.watch((next) => setValue(next));
    return () => {
      alive = false;
      unwatch();
    };
  }, [item]);
  return [value, (next: T) => item.setValue(next)];
}
