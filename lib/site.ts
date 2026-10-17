// Replace with the extension's Chrome Web Store listing once it is published.
export const INSTALL_URL = "https://chromewebstore.google.com/";

export const CHAPTERS = [
  { id: "bombing", label: "Bombing" },
  { id: "how-it-goes", label: "How it goes" },
  { id: "tailoring", label: "Tailoring" },
  { id: "why-alfred", label: "Why Alfred" },
  { id: "questions", label: "Questions" },
] as const;

/** Found pictures, credited in the footer. Recorded in assets/credits.json. */
export const PICTURE_CREDITS = [
  {
    title: "The Lagos public transport bus popularly known as Danfo",
    creator: "DemoBebz",
    licence: "CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/w/index.php?curid=87937196",
  },
  {
    title: "2010 traffic Lagos Nigeria",
    creator: "satanoid",
    licence: "CC BY 2.0",
    href: "https://commons.wikimedia.org/wiki/File:2010_traffic_Lagos_Nigeria_4576800053.jpg",
  },
  {
    title: "Portrait of a Man in Royal Livery",
    creator: "Hans Holbein the Younger, The Met",
    licence: "CC0",
    href: "https://www.metmuseum.org/art/collection/search/436660",
  },
] as const;

/** Entrance stagger steps (see [data-reveal] in globals.css). */
export const STAGGER = ["[--i:0]", "[--i:1]", "[--i:2]", "[--i:3]", "[--i:4]", "[--i:5]"] as const;
