"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { findTemplate, parseResumeForRender, type ParsedResume } from "@/lib/resume-render";

// US Letter is 11in tall; there's no @page rule in this app's print CSS, so
// printing falls back to the browser's own default margins (commonly ~0.5in
// top+bottom in Chrome). 11in - 1in of margin = 10in of usable content
// height per page, at the standard 96 CSS px/in. This is necessarily an
// estimate — the real margin varies by browser/OS/user print settings —
// and is labeled as one in the UI rather than presented as exact.
const PAGE_HEIGHT_PX = 960;

export default function ResumeTemplatePreview({
  text,
  templateId,
  photoDataUrl
}: {
  text: string;
  templateId: string;
  photoDataUrl?: string | null;
}) {
  const resume: ParsedResume = parseResumeForRender(text);
  const template = findTemplate(templateId);
  const contactItems = [resume.meta.location, resume.meta.phone, resume.meta.email, resume.meta.linkedin, resume.meta.github, resume.meta.portfolio].filter(
    Boolean
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setPageCount(Math.max(1, Math.ceil(el.scrollHeight / PAGE_HEIGHT_PX)));
  }, [text, templateId]);

  return (
    <div>
      <p className="muted tpl-page-estimate" style={{ marginBottom: 10, fontSize: 12.5 }}>
        {pageCount === 1
          ? "Fits on 1 page (estimate — actual print margins vary by browser)."
          : `≈${pageCount} pages when printed (estimate — actual print margins vary by browser). Dashed lines below mark roughly where each page break falls.`}
      </p>
      <div style={{ position: "relative" }}>
        <div
          ref={contentRef}
          className={`resume-tpl tpl-${template.skeletonId}`}
          style={{ "--tpl-accent": template.accent, "--tpl-accent-soft": template.accentSoft } as CSSProperties}
          aria-label={`Resume preview, ${template.name} template`}
        >
          <header className="tpl-header">
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- data: URI, not a static asset Next can optimize
              <img className="tpl-photo" src={photoDataUrl} alt={resume.meta.name ? `Photo of ${resume.meta.name}` : "Candidate photo"} />
            )}
            <div className="tpl-header-text">
              <h1>{resume.meta.name || "Your Name"}</h1>
              {contactItems.length > 0 && (
                <p className="tpl-contact">
                  {contactItems.map((item, i) => (
                    <span className="tpl-contact-item" key={`${item}-${i}`}>
                      {item}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </header>

          {resume.summary && (
            <section className="tpl-section">
              <h2>Summary</h2>
              <p>{resume.summary}</p>
            </section>
          )}

          {resume.sections.map((s, i) => (
            <section className="tpl-section" key={`${s.header}-${i}`}>
              <h2>{s.header}</h2>
              {s.header === "SKILLS" && !s.lines.some((l) => l.bullet) ? (
                <div className="tpl-skill-tags">
                  {s.lines
                    .flatMap((l) => l.text.split(","))
                    .map((skill) => skill.trim())
                    .filter(Boolean)
                    .map((skill, si) => (
                      <span className="tpl-skill-tag" key={`${skill}-${si}`}>
                        {skill}
                      </span>
                    ))}
                </div>
              ) : (
                <ul className="tpl-lines">
                  {s.lines.map((l, li) => (
                    <li className={l.bullet ? "tpl-bullet" : "tpl-plain"} key={li}>
                      {l.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        {Array.from({ length: pageCount - 1 }, (_, i) => (
          <div className="tpl-page-break" key={i} style={{ top: (i + 1) * PAGE_HEIGHT_PX }}>
            <span>Page {i + 2} starts here</span>
          </div>
        ))}
      </div>
    </div>
  );
}
