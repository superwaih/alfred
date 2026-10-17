import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Credits on their way — Alfred",
  robots: { index: false },
};

/** Where Polar sends buyers after paying for credits. */
export default function CreditsThanks() {
  return (
    <main className="flex min-h-[100dvh] flex-col justify-between bg-naija px-4 py-8 text-night sm:px-[3vw]">
      <span className="text-xl">
        <Wordmark />
      </span>
      <div>
        <h1 className="display text-[17vw] sm:text-display">Paid. Noted.</h1>
        <p className="mt-8 max-w-[36rem] text-lead font-bold leading-snug tracking-[-0.02em]">
          Your credits are being added to your account. They usually arrive within a few seconds.
          You can close this tab and go back to Alfred in Chrome.
        </p>
        <p className="mt-5 max-w-[34rem] text-body">
          If your balance hasn’t changed after a minute, open Alfred’s Account tab and press
          Refresh. Your receipt is in your email from Polar, our payment provider.
        </p>
      </div>
      <p className="text-small">Alfred never stores your card details. Payments are handled by Polar.</p>
    </main>
  );
}
