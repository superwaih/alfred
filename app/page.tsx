import { Bombing } from "@/components/bombing";
import { Hero } from "@/components/hero";
import { HowItGoes } from "@/components/how-it-goes";
import { InstallBand } from "@/components/install-band";
import { Questions } from "@/components/questions";
import { RevealObserver } from "@/components/reveal-observer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Tailoring } from "@/components/tailoring";
import { WhyAlfred } from "@/components/why-alfred";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Bombing />
        <HowItGoes />
        <Tailoring />
        <WhyAlfred />
        <Questions />
        <InstallBand />
      </main>
      <SiteFooter />
      <RevealObserver />
    </>
  );
}
