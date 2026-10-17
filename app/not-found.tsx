import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col justify-between bg-danfo px-4 py-8 text-night sm:px-[3vw]">
      <Link href="/" className="text-xl" aria-label="Alfred, home">
        <Wordmark />
      </Link>
      <div>
        <h1 className="display text-[17vw] sm:text-display">Not here.</h1>
        <p className="mt-8 max-w-[34rem] text-lead font-bold leading-snug tracking-[-0.02em]">
          This page has gone the way of a cover letter sent to the wrong company. Alfred has filed
          it accordingly.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-14 items-center rounded-full bg-night px-6 text-body font-bold text-danfo transition-transform duration-300 ease-spring active:scale-[0.98]"
        >
          Back to the front page
        </Link>
      </div>
      <p className="text-small">If you followed a link here, the link is out of date.</p>
    </main>
  );
}
