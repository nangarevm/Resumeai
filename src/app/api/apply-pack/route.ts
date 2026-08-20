import { NextResponse } from "next/server";
import JSZip from "jszip";
import { buildApplicationKit } from "@/lib/engines/application-kit";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";
import { hasBlockingFindings } from "@/lib/engines/verification";
import { plainTextToDocxBuffer, resumeTextToDocxBuffer } from "@/lib/export/docx-builder";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { override?: boolean; draft?: string };
  const seeker = await getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  if (hasBlockingFindings(seeker.findings) && !body.override) {
    return NextResponse.json({ error: "Resolve verification findings or pass override: true." }, { status: 409 });
  }

  const fallback = applyAcceptedSuggestions(seeker.profile.rawResumeText, seeker.suggestions);
  const tailored = typeof body.draft === "string" ? body.draft : seeker.tailoredDraft?.trim() || fallback;
  const kit = buildApplicationKit(seeker.profile, seeker.activeJob, seeker.vault, seeker.suggestions, tailored);

  const role = seeker.activeJob.title.replace(/[^\w.-]+/g, "-").slice(0, 40);
  const zip = new JSZip();
  zip.file("README.txt", [
    "ResumeProof Apply Pack",
    "Every line is bound to your Career Vault — review before submitting.",
    "",
    "Files:",
    "- tailored-resume.docx / .txt",
    "- cover-letter-3-line.txt",
    "- cover-letter-full.txt",
    "- linkedin-note.txt",
    "- recruiter-email.txt",
    "- referral-checklist.txt"
  ].join("\n"));
  zip.file("tailored-resume.txt", kit.tailoredResume);
  zip.file("cover-letter-3-line.txt", kit.shortCover);
  zip.file("cover-letter-full.txt", kit.coverLetter);
  zip.file("linkedin-note.txt", kit.linkedinNote);
  zip.file("linkedin-headline.txt", kit.linkedinHeadline);
  zip.file("linkedin-about.txt", kit.linkedinAbout);
  zip.file("recruiter-email.txt", kit.recruiterEmail);
  zip.file("whatsapp-note.txt", kit.whatsappNote);
  zip.file("referral-note.txt", kit.referralNote);
  zip.file("referral-checklist.txt", kit.referrerChecklist.map((c, i) => `${i + 1}. ${c}`).join("\n"));

  const resumeDocx = await resumeTextToDocxBuffer(kit.tailoredResume, `${seeker.profile.name} — Resume`);
  const coverDocx = await plainTextToDocxBuffer(kit.shortCover, "Cover — 3 lines");
  zip.file("tailored-resume.docx", resumeDocx);
  zip.file("cover-letter-3-line.docx", coverDocx);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="resumeproof-apply-pack-${role}.zip"`
    }
  });
}
