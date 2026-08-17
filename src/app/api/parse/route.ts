import { NextResponse } from "next/server";
import { parseResume } from "@/lib/parsers/resume-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    text = buffer.toString("utf8");
  } else if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value;
  } else {
    return NextResponse.json({ error: "Supported uploads: .txt, .md, .pdf, .docx" }, { status: 400 });
  }

  const profile = parseResume("upload", text);
  return NextResponse.json({ text, profile });
}
