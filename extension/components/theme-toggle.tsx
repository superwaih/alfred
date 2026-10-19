import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { resolveTheme, themeItem } from "@/lib/storage";
import { useStored } from "@/hooks/use-stored";

export function ThemeToggle() {
  const [theme, setTheme] = useStored(themeItem);
  const dark = resolveTheme(theme) === "dark";
  const next = dark ? "light" : "dark";

  return (
    <button
      type="button"
      disabled={theme === undefined}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => void setTheme(next)}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-control)] text-ink-soft transition-colors duration-200 hover:bg-sunken hover:text-ink disabled:opacity-40"
    >
      {dark ? <SunIcon aria-hidden className="h-[18px] w-[18px]" /> : <MoonIcon aria-hidden className="h-[18px] w-[18px]" />}
    </button>
  );
}
