/**
 * Reads the text out of a CV file, entirely in the browser. The libraries are
 * loaded only when a file is actually read, so the panel stays light.
 */

export class CvReadError extends Error {}

export const CV_ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function kindOf(file: File): "pdf" | "docx" | "text" | "unsupported" {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) return "text";
  return "unsupported";
}

/**
 * CVs often show "LinkedIn" or "Portfolio" as clickable words with the real
 * address hidden in the link. Those addresses are collected separately and
 * appended to the text, so both the instant pass and the AI can see them.
 */
type Extracted = { text: string; links: string[] };

function withLinks({ text, links }: Extracted): string {
  const unique = [...new Set(links.map(cleanLink).filter(Boolean))].filter((link) => !text.includes(link));
  return unique.length ? `${text}\n\nLINKS IN THIS CV:\n${unique.join("\n")}` : text;
}

function cleanLink(raw: string): string {
  const link = raw.trim();
  if (/^mailto:/i.test(link)) return link.replace(/^mailto:/i, "").split("?")[0] ?? "";
  if (/^tel:/i.test(link)) return link.replace(/^tel:/i, "");
  return /^https?:\/\//i.test(link) ? link : "";
}

export async function extractCvText(file: File): Promise<string> {
  try {
    return await readText(file);
  } catch (error) {
    if (error instanceof CvReadError) throw error;
    // Anything unexpected from the PDF or Word libraries: log it, and give the
    // user a way forward instead of a technical message.
    console.error("Alfred: couldn't read CV file", error);
    throw new CvReadError("Alfred couldn't read this file. Your CV is saved for attaching; paste its text below to fill your profile.");
  }
}

async function readText(file: File): Promise<string> {
  let text: string;
  switch (kindOf(file)) {
    case "pdf":
      text = withLinks(await pdfText(await file.arrayBuffer()));
      break;
    case "docx":
      text = withLinks(await docxText(await file.arrayBuffer()));
      break;
    case "text":
      text = await file.text();
      break;
    default:
      throw new CvReadError("Alfred reads PDF and Word (.docx) files. Save your CV as one of those, or paste its text instead.");
  }

  const cleaned = text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length < 40) {
    throw new CvReadError(
      "Alfred couldn't find any text in that file. It may be a scanned image. Try a PDF exported from Word or Google Docs, or paste the text instead.",
    );
  }
  return cleaned;
}

async function pdfText(data: ArrayBuffer): Promise<Extracted> {
  // The legacy build includes polyfills for the newest JavaScript features
  // pdf.js uses (Map.getOrInsertComputed and others), so PDFs open in any
  // current Chromium browser, not only the very latest Chrome.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerUrl } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task = pdfjs.getDocument({ data });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new CvReadError("That PDF couldn't be opened. It may be damaged or password protected.");
  }

  const pages: string[] = [];
  const links: string[] = [];
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number);
    // Clickable links live in annotations, not in the page text.
    for (const annotation of (await page.getAnnotations()) as { subtype?: string; url?: string; unsafeUrl?: string }[]) {
      const url = annotation.url ?? annotation.unsafeUrl;
      if (annotation.subtype === "Link" && url) links.push(url);
    }
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      } else if (item.str && !item.str.endsWith(" ")) {
        line += " ";
      }
    }
    if (line.trim()) lines.push(line);
    pages.push(lines.map((l) => l.trimEnd()).join("\n"));
  }
  await task.destroy();
  return { text: pages.join("\n\n"), links };
}

async function docxText(arrayBuffer: ArrayBuffer): Promise<Extracted> {
  const mammoth = (await import("mammoth")).default;
  try {
    const [raw, html] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      // The HTML conversion keeps hyperlink targets that the plain text drops.
      mammoth.convertToHtml({ arrayBuffer }),
    ]);
    const anchors = new DOMParser().parseFromString(html.value, "text/html").querySelectorAll("a[href]");
    return { text: raw.value, links: Array.from(anchors, (a) => a.getAttribute("href") ?? "") };
  } catch {
    throw new CvReadError("That Word file couldn't be read. Try saving it again as .docx or PDF.");
  }
}
