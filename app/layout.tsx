import type { Metadata, Viewport } from "next";
import { Chivo } from "next/font/google";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const description =
  "Alfred is a Chrome extension for job seekers. Save your details once and Alfred fills matching application fields, tailors your CV and drafts a cover letter. You review and submit.";

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to the production address so share images resolve.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Alfred — Your job hunt. Handled.",
  description,
  openGraph: {
    type: "website",
    siteName: "Alfred",
    title: "Alfred — Your job hunt. Handled.",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Alfred — Your job hunt. Handled.",
    description,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
};

// Runs before first paint: applies a saved theme and marks that script is on,
// so entrance animations may hide content only when they can also reveal it.
const bootScript = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${chivo.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
