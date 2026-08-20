import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType, TextRun } from "docx";
import { findTemplate, parseResumeForRender } from "../resume-render";

export async function resumeTextToDocxBuffer(text: string, title = "Resume"): Promise<Buffer> {
  const lines = text.split("\n");
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1
    })
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    const isHeading =
      /^(NAME|EMAIL|PHONE|SUMMARY|PROFILE SUMMARY|PROFILE|CONTACT|SKILLS|TECHNICAL SKILLS|KEY SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS):?$/i.test(trimmed) ||
      (trimmed.endsWith(":") && trimmed.length < 40 && !trimmed.includes("@"));

    if (isHeading) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/:$/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        })
      );
    } else if (/^[-•*]/.test(line)) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^[-•*]\s*/, ""),
          bullet: { level: 0 }
        })
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun(trimmed)] }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });
  return Packer.toBuffer(doc);
}

export async function plainTextToDocxBuffer(text: string, title: string): Promise<Buffer> {
  const children = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    ...text.split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 120 }
        })
    )
  ];
  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}

/**
 * Per-template DOCX export. Word's layout model can't replicate every CSS
 * trick the HTML preview uses (rounded cards, connecting timeline lines,
 * pill-shaped tags), so this maps each of the 18 layout skeletons to the
 * closest real docx formatting — font family, a name treatment (plain /
 * colored band / centered+letterspaced / boxed), and a section-header
 * treatment (underline / double underline / left tab / boxed / plain
 * colored) — always in the template's actual accent color. Not pixel-
 * identical to the on-screen preview, but genuinely template-flavored
 * rather than the one generic style every template used to fall back to.
 */
type NameTreatment = "plain" | "band" | "centered" | "boxed-soft";
type HeaderTreatment = "underline" | "double-underline" | "left-tab" | "boxed" | "plain-color" | "no-border";

interface DocxStyleProfile {
  font: string;
  nameTreatment: NameTreatment;
  headerTreatment: HeaderTreatment;
  allCapsName: boolean;
  allCapsHeaders: boolean;
  letterSpaced: boolean;
}

const SERIF = "Georgia";
const MONO = "Consolas";
const SANS = "Calibri";

export const STYLE_PROFILES: Record<string, DocxStyleProfile> = {
  "ats-classic": { font: SANS, nameTreatment: "plain", headerTreatment: "underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  minimal: { font: SANS, nameTreatment: "plain", headerTreatment: "no-border", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "compact-ats": { font: SANS, nameTreatment: "plain", headerTreatment: "underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "serif-ats": { font: SERIF, nameTreatment: "plain", headerTreatment: "underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "modern-band": { font: SANS, nameTreatment: "band", headerTreatment: "underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "sidebar-accent": { font: SANS, nameTreatment: "plain", headerTreatment: "left-tab", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "two-tone-header": { font: SANS, nameTreatment: "band", headerTreatment: "plain-color", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "pill-contact": { font: SANS, nameTreatment: "plain", headerTreatment: "underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "boxed-sections": { font: SANS, nameTreatment: "plain", headerTreatment: "boxed", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "executive-serif": { font: SERIF, nameTreatment: "centered", headerTreatment: "no-border", allCapsName: true, allCapsHeaders: true, letterSpaced: true },
  "corporate-letterspaced": { font: SANS, nameTreatment: "plain", headerTreatment: "underline", allCapsName: true, allCapsHeaders: true, letterSpaced: true },
  "underline-bold": { font: SANS, nameTreatment: "plain", headerTreatment: "double-underline", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "technical-dark": { font: MONO, nameTreatment: "band", headerTreatment: "plain-color", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  timeline: { font: SANS, nameTreatment: "plain", headerTreatment: "left-tab", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "tab-accent": { font: SANS, nameTreatment: "plain", headerTreatment: "left-tab", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "rounded-cards": { font: SANS, nameTreatment: "plain", headerTreatment: "boxed", allCapsName: false, allCapsHeaders: false, letterSpaced: false },
  "editorial-spacious": { font: SANS, nameTreatment: "plain", headerTreatment: "no-border", allCapsName: false, allCapsHeaders: false, letterSpaced: true },
  "graduate-banner": { font: SANS, nameTreatment: "boxed-soft", headerTreatment: "plain-color", allCapsName: false, allCapsHeaders: false, letterSpaced: false }
};

function headerParagraph(label: string, profile: DocxStyleProfile, accent: string): Paragraph {
  const text = profile.allCapsHeaders ? label.toUpperCase() : label;
  const run = new TextRun({
    text: profile.headerTreatment === "boxed" ? ` ${text} ` : text,
    bold: true,
    color: profile.headerTreatment === "boxed" ? "FFFFFF" : accent,
    font: profile.font,
    characterSpacing: profile.letterSpaced ? 30 : undefined,
    shading: profile.headerTreatment === "boxed" ? { type: ShadingType.CLEAR, fill: accent } : undefined
  });

  const border =
    profile.headerTreatment === "underline"
      ? { bottom: { style: BorderStyle.SINGLE, color: accent, size: 6, space: 2 } }
      : profile.headerTreatment === "double-underline"
        ? { bottom: { style: BorderStyle.DOUBLE, color: accent, size: 8, space: 2 } }
        : profile.headerTreatment === "left-tab"
          ? { left: { style: BorderStyle.SINGLE, color: accent, size: 24, space: 4 } }
          : undefined;

  return new Paragraph({
    children: [run],
    spacing: { before: 220, after: 90 },
    border,
    indent: profile.headerTreatment === "left-tab" ? { left: 100 } : undefined
  });
}

function nameParagraphs(name: string, contact: string, profile: DocxStyleProfile, accent: string, accentSoft: string): Paragraph[] {
  const nameText = profile.allCapsName ? name.toUpperCase() : name;
  const isBand = profile.nameTreatment === "band";
  const isBoxedSoft = profile.nameTreatment === "boxed-soft";
  const nameRun = new TextRun({
    text: nameText,
    bold: true,
    size: 44,
    font: profile.font,
    color: isBand ? "FFFFFF" : accent,
    characterSpacing: profile.letterSpaced ? 40 : undefined,
    shading: isBand ? { type: ShadingType.CLEAR, fill: accent } : isBoxedSoft ? { type: ShadingType.CLEAR, fill: accentSoft } : undefined
  });
  const contactRun = new TextRun({
    text: contact,
    size: 20,
    color: isBand ? "FFFFFF" : "555555",
    font: profile.font,
    shading: isBand ? { type: ShadingType.CLEAR, fill: accent } : undefined
  });

  return [
    new Paragraph({
      children: [nameRun],
      alignment: profile.nameTreatment === "centered" ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [contactRun],
      alignment: profile.nameTreatment === "centered" ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 200 },
      border: profile.nameTreatment === "centered" ? { bottom: { style: BorderStyle.SINGLE, color: accent, size: 12, space: 6 } } : undefined
    })
  ];
}

/** docx's ImageRun only accepts jpg/png/gif/bmp raster data — a webp upload
 *  still renders fine in the browser preview/print, but is silently skipped
 *  here rather than embedding bytes docx can't actually decode. */
function photoParagraph(photoDataUrl: string): Paragraph | null {
  const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(photoDataUrl);
  if (!match) return null;
  const type = match[1].toLowerCase() === "jpeg" ? "jpg" : (match[1].toLowerCase() as "jpg" | "png");
  const data = Buffer.from(match[2], "base64");
  return new Paragraph({
    children: [new ImageRun({ type, data, transformation: { width: 80, height: 80 } })],
    spacing: { after: 120 }
  });
}

export async function resumeTextToTemplatedDocxBuffer(text: string, templateId: string, photoDataUrl?: string | null): Promise<Buffer> {
  const template = findTemplate(templateId);
  const profile = STYLE_PROFILES[template.skeletonId] || STYLE_PROFILES["ats-classic"];
  const resume = parseResumeForRender(text);
  const accent = template.accent;
  const accentSoft = template.accentSoft;

  const contact = [resume.meta.location, resume.meta.phone, resume.meta.email, resume.meta.linkedin, resume.meta.github, resume.meta.portfolio]
    .filter(Boolean)
    .join("   ·   ");

  const photo = photoDataUrl ? photoParagraph(photoDataUrl) : null;
  const children: Paragraph[] = [...(photo ? [photo] : []), ...nameParagraphs(resume.meta.name || "Your Name", contact, profile, accent, accentSoft)];

  if (resume.summary) {
    children.push(headerParagraph("Summary", profile, accent));
    children.push(new Paragraph({ children: [new TextRun({ text: resume.summary, font: profile.font })], spacing: { after: 120 } }));
  }

  for (const section of resume.sections) {
    children.push(headerParagraph(section.header, profile, accent));
    if (section.header === "SKILLS" && !section.lines.some((l) => l.bullet)) {
      const skills = section.lines.flatMap((l) => l.text.split(",")).map((s) => s.trim()).filter(Boolean);
      children.push(new Paragraph({ children: [new TextRun({ text: skills.join("   •   "), font: profile.font })], spacing: { after: 120 } }));
      continue;
    }
    for (const line of section.lines) {
      if (line.bullet) {
        children.push(new Paragraph({ children: [new TextRun({ text: line.text, font: profile.font })], bullet: { level: 0 } }));
      } else {
        children.push(
          new Paragraph({ children: [new TextRun({ text: line.text, bold: true, font: profile.font })], spacing: { before: 80 } })
        );
      }
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
