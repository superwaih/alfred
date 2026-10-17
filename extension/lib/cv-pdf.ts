import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { TailoredCv } from "@shared/ai";
import { fullName, type Profile } from "@shared/profile";
import type { StoredFile } from "./storage";

/**
 * Builds a tailored CV as a real PDF, in the browser. Plain single-column
 * layout in Helvetica: the format applicant tracking systems read most
 * reliably.
 */

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = 54;
const INK = rgb(0.1, 0.1, 0.1);
const SOFT = rgb(0.36, 0.36, 0.34);

/** Swaps characters the standard PDF fonts can't encode for safe ones. */
function sanitize(text: string, font: PDFFont): string {
  const mapped = text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/₦/g, "NGN ")
    .replace(/ /g, " ")
    .replace(/[​-‍﻿]/g, "");
  let safe = "";
  for (const char of mapped) {
    try {
      font.encodeText(char);
      safe += char;
    } catch {
      // Not encodable in WinAnsi; leave it out rather than fail the whole file.
    }
  }
  return safe;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function tailoredCvPdf(cv: TailoredCv, profile: Profile, company: string): Promise<StoredFile> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const name = fullName(profile) || "CV";
  pdf.setTitle(`${name} - CV`);
  pdf.setAuthor(name);
  pdf.setCreator("Alfred");

  let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;
  const width = PAGE.width - MARGIN * 2;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - MARGIN;
    }
  };

  const text = (value: string, opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const font = opts.font ?? regular;
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    const lineHeight = size * 1.35;
    for (const line of wrap(sanitize(value, font), font, size, width - indent)) {
      ensure(lineHeight);
      page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color: opts.color ?? INK });
      y -= lineHeight;
    }
    y -= opts.gap ?? 0;
  };

  const heading = (label: string) => {
    ensure(30);
    y -= 10;
    page.drawText(sanitize(label.toUpperCase(), bold), { x: MARGIN, y: y - 9, size: 9, font: bold, color: INK });
    y -= 13;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, thickness: 0.6, color: rgb(0.78, 0.78, 0.76) });
    y -= 8;
  };

  // Header
  text(name, { font: bold, size: 20, gap: 2 });
  if (cv.headline) text(cv.headline, { font: bold, size: 11, gap: 3 });
  const p = profile.personal;
  const contact = [
    p.email,
    p.phone,
    [p.city, p.country].filter(Boolean).join(", "),
    profile.links.linkedin,
    profile.links.portfolio || profile.links.website,
    profile.links.github,
  ]
    .filter(Boolean)
    .map((part) => part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))
    .join("  |  ");
  if (contact) text(contact, { size: 9, color: SOFT, gap: 4 });

  if (cv.summary) {
    heading("Summary");
    text(cv.summary, { gap: 2 });
  }

  if (cv.roles.length) {
    heading("Experience");
    for (const role of cv.roles) {
      ensure(30);
      const title = sanitize(`${role.title}, ${role.company}`, bold);
      const dates = sanitize(role.dates, regular);
      const datesWidth = regular.widthOfTextAtSize(dates, 9.5);
      // Title on the left, dates right-aligned on the same line.
      const titleLines = wrap(title, bold, 10.5, width - datesWidth - 12);
      titleLines.forEach((line, index) => {
        ensure(15);
        page.drawText(line, { x: MARGIN, y: y - 10.5, size: 10.5, font: bold, color: INK });
        if (index === 0 && dates) page.drawText(dates, { x: MARGIN + width - datesWidth, y: y - 10.5, size: 9.5, font: regular, color: SOFT });
        y -= 14;
      });
      for (const bullet of role.bullets) {
        const lines = wrap(sanitize(bullet, regular), regular, 10, width - 12);
        lines.forEach((line, index) => {
          ensure(13.5);
          if (index === 0) page.drawText("•", { x: MARGIN + 2, y: y - 10, size: 10, font: regular, color: INK });
          page.drawText(line, { x: MARGIN + 12, y: y - 10, size: 10, font: regular, color: INK });
          y -= 13.5;
        });
      }
      y -= 6;
    }
  }

  if (profile.education.length) {
    heading("Education");
    for (const entry of profile.education) {
      const degree = [entry.degree, entry.field].filter(Boolean).join(" ");
      const years = [entry.start, entry.end].filter(Boolean).join(" - ");
      text([degree, entry.school].filter(Boolean).join(", ") + (years ? `  (${years})` : ""), { gap: 2 });
    }
  }

  if (cv.skills.length) {
    heading("Skills");
    text(cv.skills.join(", "));
  }

  const dataUrl = await pdf.saveAsBase64({ dataUri: true });
  const safeName = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const safeCompany = company.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const fileName = `${safeName || "CV"}-CV${safeCompany ? `-${safeCompany}` : ""}.pdf`;
  return { name: fileName, type: "application/pdf", dataUrl, size: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75) };
}
