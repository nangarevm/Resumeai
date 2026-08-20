"use client";

import type { CSSProperties } from "react";
import { findTemplate, parseResumeForRender, type ParsedResume } from "@/lib/resume-render";

export default function ResumeTemplatePreview({ text, templateId }: { text: string; templateId: string }) {
  const resume: ParsedResume = parseResumeForRender(text);
  const template = findTemplate(templateId);
  const contactItems = [resume.meta.location, resume.meta.phone, resume.meta.email, resume.meta.linkedin, resume.meta.github, resume.meta.portfolio].filter(
    Boolean
  );

  return (
    <div
      className={`resume-tpl tpl-${template.skeletonId}`}
      style={{ "--tpl-accent": template.accent, "--tpl-accent-soft": template.accentSoft } as CSSProperties}
      aria-label={`Resume preview, ${template.name} template`}
    >
      <header className="tpl-header">
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
  );
}
