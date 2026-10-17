import { ArrowUpRight } from "./brand";

type ActionLinkProps = {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "lg";
  /** Colours for the fill and its ink; defaults to the ground's action. */
  tone?: string;
  external?: boolean;
};

/**
 * The page's one button shape: fully round, with the arrow in its own
 * nested circle that leans forward on hover and presses in on click.
 */
export function ActionLink({
  href,
  children,
  size = "lg",
  tone = "bg-action text-action-ink",
  external = true,
}: ActionLinkProps) {
  const sizing =
    size === "sm"
      ? "h-10 gap-2.5 pl-4 pr-1.5 text-small"
      : "h-14 gap-4 pl-6 pr-2 text-body";
  const bubble = size === "sm" ? "h-7 w-7" : "h-10 w-10";

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`group inline-flex shrink-0 items-center rounded-full font-bold transition-transform duration-300 ease-spring active:scale-[0.98] ${sizing} ${tone}`}
    >
      {children}
      <span
        className={`grid place-items-center rounded-full bg-current/15 transition-transform duration-500 ease-spring group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 ${bubble}`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </span>
      {external && <span className="sr-only">(opens in a new tab)</span>}
    </a>
  );
}
