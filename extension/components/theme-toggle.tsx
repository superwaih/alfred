import { resolveTheme, themeItem } from "@/lib/storage";
import { useStored } from "@/hooks/use-stored";

export function ThemeToggle() {
  const [theme, setTheme] = useStored(themeItem);
  const dark = resolveTheme(theme) === "neon";
  const next = dark ? "light" : "dark";

  return (
    <button
      type="button"
      disabled={theme === undefined}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => void setTheme(next)}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--r-control)] px-2.5 text-[12px] font-medium text-ink-soft transition-colors duration-200 hover:bg-sunken hover:text-ink disabled:opacity-40"
    >
      <span aria-hidden className={`h-3.5 w-3.5 rounded-full border border-current ${dark ? "bg-transparent" : "bg-current"}`} />
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
