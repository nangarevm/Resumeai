"use client";

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^(NAME|EMAIL|PHONE|LINKEDIN|GITHUB|PREFERRED ROLE|PREFERRED DOMAIN|DREAM COMPANIES):/i.test(t) ||
    /^(SUMMARY|PROFILE SUMMARY|PROFILE|OBJECTIVE|CONTACT|SKILLS|TECHNICAL SKILLS|KEY SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS):?$/i.test(t)
  );
}

export default function ResumeDraftPreview({ text }: { text: string }) {
  if (!text?.trim()) return null;

  return (
    <div className="resume-draft-preview" aria-label="Formatted resume preview">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="resume-line spacer" />;
        }
        if (isSectionHeader(line)) {
          return (
            <div key={i} className="resume-section-head">
              {trimmed.replace(/:$/, "")}
            </div>
          );
        }
        if (/^[-•*]\s+/.test(trimmed)) {
          return (
            <div key={i} className="resume-bullet">
              {trimmed.replace(/^[-•*]\s+/, "")}
            </div>
          );
        }
        return (
          <div key={i} className="resume-line">
            {line}
          </div>
        );
      })}
    </div>
  );
}
