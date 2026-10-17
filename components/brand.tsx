type MarkProps = {
  className?: string;
};

/** Alfred's signature: a bow tie, cut from two wings and a knot. */
export function BowTie({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden>
      <path d="M1 2.5 L16.5 8.4 L16.5 11.6 L1 17.5 Q3.2 10 1 2.5 Z" fill="currentColor" />
      <path d="M39 2.5 L23.5 8.4 L23.5 11.6 L39 17.5 Q36.8 10 39 2.5 Z" fill="currentColor" />
      <rect x="17.2" y="6.6" width="5.6" height="6.8" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BowTie className="h-[0.7em] w-auto" />
      <span className="font-black uppercase tracking-[-0.04em]">Alfred</span>
    </span>
  );
}

/** Arrow pointing up and to the right, drawn for the buttons. */
export function ArrowUpRight({ className }: MarkProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none">
      <path d="M4.5 11.5 L11.5 4.5 M5.5 4.5 H11.5 V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}
