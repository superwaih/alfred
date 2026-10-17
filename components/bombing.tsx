import Image from "next/image";
import danfo from "@/public/images/danfo.jpg";
import traffic from "@/public/images/lagos-traffic.jpg";
import { STAGGER } from "@/lib/site";
import { PhotoDrift } from "./photo-drift";

const stair = [
  { text: "Fifty applications,", ink: "text-night" },
  { text: "the same answers,", ink: "text-deep" },
  { text: "typed fifty times.", ink: "text-night" },
];

// Indents step down the page like stairs.
const indents = ["pl-0", "pl-[8vw] lg:pl-[7vw]", "pl-[16vw] lg:pl-[14vw]"];

export function Bombing() {
  return (
    <section
      id="bombing"
      data-chapter="danfo"
      aria-labelledby="bombing-title"
      className="relative flex min-h-[100svh] flex-col justify-center bg-danfo px-4 py-24 text-night sm:px-[4vw] lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6"
    >
      <div className="lg:col-span-8">
        <h2 id="bombing-title" data-reveal className="display text-head text-night">
          We call it
          <br />
          bombing.
        </h2>
        <p className="mt-10 text-lead font-bold leading-[1.08] tracking-[-0.02em]">
          {stair.map((line, index) => (
            <span
              key={line.text}
              data-reveal
              className={`block ${indents[index]} ${line.ink} ${STAGGER[index + 1]}`}
            >
              {line.text}
            </span>
          ))}
        </p>

        <div className="mt-12 grid max-w-[52rem] gap-6 text-body text-night sm:grid-cols-2 sm:gap-10">
          <p data-reveal className={STAGGER[2]}>
            In Nigeria, bombing means treating a hard thing as a numbers game. You don’t wait for
            the one perfect opening; you go after every role that fits and let the odds work for
            you. For a lot of job seekers it’s simply how the search is done.
          </p>
          <p data-reveal className={STAGGER[3]}>
            The catch is the paperwork. Every portal wants your name, your number, your last three
            jobs and a fresh cover letter, each in its own order and wording. By the twentieth form
            you aren’t job hunting any more; you’re doing data entry. Alfred takes the data entry so
            you can keep the volume.
          </p>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-3 lg:col-span-3 lg:col-start-10 lg:mt-0 lg:grid-cols-1 lg:gap-5 lg:self-center">
        <figure>
          <PhotoDrift className="aspect-[3/2]">
            <Image
              src={danfo}
              alt="A yellow danfo minibus on a dusty Lagos road"
              sizes="(min-width: 1024px) 22vw, 46vw"
              className="h-full w-full object-cover object-[50%_62%]"
              placeholder="blur"
            />
          </PhotoDrift>
          <figcaption className="mt-2 text-small">A danfo: the yellow that runs Lagos.</figcaption>
        </figure>
        <figure>
          <PhotoDrift className="aspect-[3/2]">
            <Image
              src={traffic}
              alt="Traffic crossing a Lagos overpass beside a market"
              sizes="(min-width: 1024px) 22vw, 46vw"
              className="h-full w-full object-cover"
              placeholder="blur"
            />
          </PhotoDrift>
          <figcaption className="mt-2 text-small">Hours in traffic already. Not hours on forms too.</figcaption>
        </figure>
      </div>
    </section>
  );
}
