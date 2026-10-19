import Image from "next/image";
import livery from "@/public/images/royal-livery.jpg";
import { INSTALL_URL, STAGGER } from "@/lib/site";
import { ActionLink } from "./action-link";

const blocks = [
  {
    title: "Every hero needs an Alfred.",
    body: "You do the hard, visible part: finding the roles worth chasing, preparing for the interview, showing up brilliant on the day. Behind every one of those days is a pile of forms. Someone should keep it in order.",
  },
  {
    title: "He never wore the cape.",
    body: "Batman’s butler kept the house running, the suit pressed and the coffee hot, so the cape could go out and do the job. That’s the job we gave ours. And like the original, he knows the big decisions aren’t his to make: the Submit button stays yours.",
  },
];

export function WhyAlfred() {
  return (
    <section id="why-alfred" data-chapter="ground" aria-labelledby="why-title" className="px-[10px] py-[10px] sm:p-5">
      <div className="relative overflow-hidden bg-deep px-6 pb-0 pt-14 text-bone sm:px-14 lg:min-h-[110svh]">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <div>
            <h2 id="why-title" data-reveal className="display text-[8.5vw] lg:text-head">
              Because you’re
              <br />
              Batman.
            </h2>
            <p data-reveal className={`mt-8 max-w-[30rem] text-lead leading-snug ${STAGGER[1]}`}>
              Why name it after Batman’s butler? Because the job hunt already has a hero: you.
            </p>
          </div>

          <div className="mt-12 space-y-16 lg:mt-2">
            {blocks.map((block, index) => (
              <div key={block.title} data-reveal className={STAGGER[index + 1]}>
                <h3 className="text-lead font-bold leading-tight tracking-[-0.02em]">{block.title}</h3>
                <p className="mt-3 text-body text-bone">{block.body}</p>
              </div>
            ))}
            <div data-reveal className={STAGGER[3]}>
              <ActionLink href={INSTALL_URL} tone="bg-danfo text-night">
                Add to your browser
              </ActionLink>
            </div>
          </div>
        </div>

        <figure className="relative mx-auto mt-16 w-[86vw] translate-y-[25%] sm:w-[60vw] lg:absolute lg:bottom-0 lg:left-14 lg:mt-0 lg:w-[38vw] lg:translate-y-[20%]">
          <Image
            src={livery}
            alt="Hans Holbein’s portrait of a young man in red royal livery, cut to a circle"
            sizes="(min-width: 1024px) 38vw, 86vw"
            className="aspect-square w-full rounded-full object-cover object-[50%_52%] [clip-path:circle(41%_at_50%_51%)]"
            placeholder="blur"
          />
          <figcaption className="sr-only">
            Portrait of a Man in Royal Livery, Hans Holbein the Younger, about 1532–35. A servant of
            the royal household; no cape either.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
