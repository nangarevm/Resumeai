import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

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
      /^(NAME|EMAIL|PHONE|SUMMARY|SKILLS|TECHNICAL SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS):?$/i.test(trimmed) ||
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
