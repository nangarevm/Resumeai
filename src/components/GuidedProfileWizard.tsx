"use client";

import { useState } from "react";
import {
  buildResumeText,
  categorizeSkills,
  emptyGuidedProfile,
  EXPERIENCE_LEVEL_LABELS,
  IMPACT_OPTIONS,
  sentenceToBullet,
  suggestedCertifications,
  wizardStepOrder,
  type ExperienceLevel,
  type GuidedProfileData,
  type WizardCertification,
  type WizardEducation,
  type WizardExperience,
  type WizardProject
} from "@/lib/wizard/guided-profile";

const TOOL_CHIPS = ["Selenium", "Playwright", "Cypress", "Appium", "Excel", "SQL", "Figma", "Salesforce", "Other"];

let uid = 0;
function nextId(): string {
  uid += 1;
  return `w${Date.now()}-${uid}`;
}

function newExperience(): WizardExperience {
  return { id: nextId(), title: "", company: "", location: "", startDate: "", endDate: "", current: false, rawDescription: "", tools: [], impact: "" };
}
function newEducation(): WizardEducation {
  return { id: nextId(), degree: "", school: "", location: "", year: "", grade: "" };
}
function newProject(): WizardProject {
  return { id: nextId(), name: "", problem: "", role: "", tech: "", impact: "" };
}
function newCertification(): WizardCertification {
  return { id: nextId(), name: "", issuer: "", year: "", url: "" };
}

const STEP_META: Record<string, { title: string; why: string; optional?: boolean }> = {
  basics: { title: "About you", why: "Contact details recruiters and ATS software both need to find you." },
  goal: { title: "Your career goal", why: "This decides which sections we prioritize and how we tailor advice." },
  experience: { title: "Work experience", why: "Your strongest proof — even one role or internship helps.", optional: true },
  education: { title: "Education", why: "Degree, school, and year — keep it simple." },
  skills: { title: "Skills", why: "List what you know; we'll group it for you." },
  projects: { title: "Projects", why: "Projects prove skills when work history is thin.", optional: true },
  certifications: { title: "Certifications", why: "Only add ones you actually hold.", optional: true },
  achievements: { title: "Achievements", why: "Optional highlights not tied to one role.", optional: true },
  review: { title: "Review", why: "Confirm everything before we build your Career Vault." }
};

export default function GuidedProfileWizard({
  onComplete
}: {
  onComplete: (resumeText: string, meta: { targetRole: string; goals: string }) => void;
}) {
  const [data, setData] = useState<GuidedProfileData>(emptyGuidedProfile());
  const [stepIndex, setStepIndex] = useState(0);

  const steps = wizardStepOrder(data.experienceLevel);
  const stepId = steps[Math.min(stepIndex, steps.length - 1)];
  const meta = STEP_META[stepId];
  const isLast = stepIndex >= steps.length - 1;

  function update<K extends keyof GuidedProfileData>(key: K, value: GuidedProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function go(delta: number) {
    setStepIndex((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }

  function finish() {
    const resumeText = buildResumeText(data);
    onComplete(resumeText, { targetRole: data.targetTitle, goals: data.targetIndustry ? `Target industry: ${data.targetIndustry}` : "" });
  }

  const basicsValid = data.name.trim().length > 1 && /\S+@\S+\.\S+/.test(data.email) && data.phone.trim().length > 0;

  return (
    <div className="wizard">
      <div className="wizard-progress">
        <span className="muted">
          Step {stepIndex + 1} of {steps.length} — {meta.title}
        </span>
        <div className="progress" style={{ maxWidth: 320, margin: "6px 0 4px" }}>
          <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="muted" style={{ fontSize: 12 }}>{meta.why}</p>
      </div>

      {stepId === "basics" && (
        <div className="wizard-step">
          <div className="form-grid">
            <div>
              <label className="form-label">Full name</label>
              <input className="form-control" value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Rivera" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-control" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 555 0100" />
            </div>
            <div>
              <label className="form-label">Location (optional)</label>
              <input className="form-control" value={data.location} onChange={(e) => update("location", e.target.value)} placeholder="Austin, TX" />
            </div>
            <div>
              <label className="form-label">LinkedIn (optional)</label>
              <input className="form-control" value={data.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="linkedin.com/in/..." />
            </div>
            <div>
              <label className="form-label">Portfolio (optional)</label>
              <input className="form-control" value={data.portfolio} onChange={(e) => update("portfolio", e.target.value)} placeholder="yoursite.com" />
            </div>
            <div>
              <label className="form-label">GitHub (optional)</label>
              <input className="form-control" value={data.github} onChange={(e) => update("github", e.target.value)} placeholder="github.com/..." />
            </div>
          </div>
          {!basicsValid && <p className="hint warn">Add your name, a valid email, and a phone number to continue.</p>}
        </div>
      )}

      {stepId === "goal" && (
        <div className="wizard-step">
          <div className="form-grid">
            <div>
              <label className="form-label">Target job title</label>
              <input className="form-control" value={data.targetTitle} onChange={(e) => update("targetTitle", e.target.value)} placeholder="Senior Software Tester" />
            </div>
            <div>
              <label className="form-label">Target industry (optional)</label>
              <input className="form-control" value={data.targetIndustry} onChange={(e) => update("targetIndustry", e.target.value)} placeholder="IT / Software" />
            </div>
            <div>
              <label className="form-label">Preferred location (optional)</label>
              <input className="form-control" value={data.preferredLocation} onChange={(e) => update("preferredLocation", e.target.value)} placeholder="Remote / Austin, TX" />
            </div>
          </div>
          <label className="form-label" style={{ marginTop: 10 }}>
            Experience level
          </label>
          <div className="chips">
            {(Object.keys(EXPERIENCE_LEVEL_LABELS) as ExperienceLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`chip ${data.experienceLevel === lvl ? "pill active" : ""}`}
                onClick={() => update("experienceLevel", lvl)}
              >
                {EXPERIENCE_LEVEL_LABELS[lvl]}
              </button>
            ))}
          </div>
          {!data.experienceLevel && <p className="hint warn">Pick your experience level so we ask about the right things next.</p>}
        </div>
      )}

      {stepId === "experience" && (
        <div className="wizard-step">
          {data.experienceLevel === "fresher" && (
            <p className="muted">That&apos;s okay. Add an internship if you have one — otherwise skip, your projects and education carry the weight.</p>
          )}
          {data.experiences.length === 0 && (
            <p className="muted">
              {data.experienceLevel === "fresher"
                ? "Don't have a job yet? Skip this — academic projects and internships work too."
                : "Add your most recent role first."}
            </p>
          )}
          {data.experiences.map((exp, idx) => (
            <div className="wizard-entry" key={exp.id}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Job title</label>
                  <input className="form-control" value={exp.title} onChange={(e) => updateExperience(exp.id, { title: e.target.value })} placeholder="QA Engineer" />
                </div>
                <div>
                  <label className="form-label">Company</label>
                  <input className="form-control" value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input className="form-control" value={exp.location} onChange={(e) => updateExperience(exp.id, { location: e.target.value })} placeholder="Remote" />
                </div>
                <div>
                  <label className="form-label">Start date</label>
                  <input className="form-control" value={exp.startDate} onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })} placeholder="2021" />
                </div>
                <div>
                  <label className="form-label">End date</label>
                  <input
                    className="form-control"
                    value={exp.endDate}
                    disabled={exp.current}
                    onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                    placeholder="2023"
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(exp.id, { current: e.target.checked })} /> I currently work here
                  </label>
                </div>
              </div>
              <label className="form-label" style={{ marginTop: 8 }}>
                What did you do in this role? (plain sentences — we&apos;ll turn it into a bullet)
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={exp.rawDescription}
                onChange={(e) => updateExperience(exp.id, { rawDescription: e.target.value })}
                placeholder="I tested web applications and created automation scripts."
              />
              <label className="form-label" style={{ marginTop: 8 }}>
                Which tools did you use? (optional)
              </label>
              <div className="chips">
                {TOOL_CHIPS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${exp.tools.includes(t) ? "pill active" : ""}`}
                    onClick={() =>
                      updateExperience(exp.id, { tools: exp.tools.includes(t) ? exp.tools.filter((x) => x !== t) : [...exp.tools, t] })
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="form-label" style={{ marginTop: 8 }}>
                Did this work improve anything? (only if true — skip is safe)
              </label>
              <div className="chips">
                {IMPACT_OPTIONS.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`chip ${exp.impact === i.id ? "pill active" : ""}`}
                    onClick={() => updateExperience(exp.id, { impact: i.id })}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
              {exp.rawDescription.trim() && (
                <p className="muted" style={{ marginTop: 8 }}>
                  Preview bullet: &ldquo;{sentenceToBullet(exp.rawDescription, exp.tools, exp.impact)}&rdquo;
                </p>
              )}
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeExperience(exp.id)}>
                Remove this role
              </button>
              {idx < data.experiences.length - 1 && <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />}
            </div>
          ))}
          <button type="button" className="chip" onClick={() => update("experiences", [...data.experiences, newExperience()])}>
            + Add {data.experiences.length ? "another role" : "a role"}
          </button>
        </div>
      )}

      {stepId === "education" && (
        <div className="wizard-step">
          {data.educations.length === 0 && <p className="muted">Add your most recent degree or program.</p>}
          {data.educations.map((ed, idx) => (
            <div className="wizard-entry" key={ed.id}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Degree</label>
                  <input className="form-control" value={ed.degree} onChange={(e) => updateEducation(ed.id, { degree: e.target.value })} placeholder="B.S. Computer Science" />
                </div>
                <div>
                  <label className="form-label">School</label>
                  <input className="form-control" value={ed.school} onChange={(e) => updateEducation(ed.id, { school: e.target.value })} placeholder="State University" />
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input className="form-control" value={ed.location} onChange={(e) => updateEducation(ed.id, { location: e.target.value })} placeholder="Austin, TX" />
                </div>
                <div>
                  <label className="form-label">Graduation year</label>
                  <input className="form-control" value={ed.year} onChange={(e) => updateEducation(ed.id, { year: e.target.value })} placeholder="2024" />
                </div>
                <div>
                  <label className="form-label">Grade/CGPA (optional)</label>
                  <input className="form-control" value={ed.grade} onChange={(e) => updateEducation(ed.id, { grade: e.target.value })} placeholder="3.8 GPA" />
                </div>
              </div>
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeEducation(ed.id)}>
                Remove
              </button>
              {idx < data.educations.length - 1 && <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />}
            </div>
          ))}
          <button type="button" className="chip" onClick={() => update("educations", [...data.educations, newEducation()])}>
            + Add {data.educations.length ? "another" : "education"}
          </button>
        </div>
      )}

      {stepId === "skills" && (
        <div className="wizard-step">
          <label className="form-label">List your skills, separated by commas</label>
          <textarea
            className="form-control"
            rows={3}
            value={data.skillsRaw}
            onChange={(e) => update("skillsRaw", e.target.value)}
            placeholder="Selenium, Java, API testing, Jira"
          />
          {data.skillsRaw.trim() && (
            <div style={{ marginTop: 10 }}>
              <p className="muted">We grouped these — edit the text above any time:</p>
              {categorizeSkills(data.skillsRaw).map((g) => (
                <div key={g.category} style={{ marginBottom: 6 }}>
                  <strong style={{ fontSize: 12 }}>{g.category}</strong>
                  <div className="tag-row">
                    {g.skills.map((s) => (
                      <span className="tag" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {stepId === "projects" && (
        <div className="wizard-step">
          {data.projects.length === 0 && <p className="muted">What project are you most proud of?</p>}
          {data.projects.map((p, idx) => (
            <div className="wizard-entry" key={p.id}>
              <div className="form-grid">
                <div className="span-3">
                  <label className="form-label">Project name</label>
                  <input className="form-control" value={p.name} onChange={(e) => updateProject(p.id, { name: e.target.value })} placeholder="Inventory tracker" />
                </div>
                <div className="span-3">
                  <label className="form-label">What problem did it solve?</label>
                  <input className="form-control" value={p.problem} onChange={(e) => updateProject(p.id, { problem: e.target.value })} placeholder="Manual stock counts were slow and error-prone" />
                </div>
                <div>
                  <label className="form-label">Your role</label>
                  <input className="form-control" value={p.role} onChange={(e) => updateProject(p.id, { role: e.target.value })} placeholder="Solo developer" />
                </div>
                <div>
                  <label className="form-label">Technologies used</label>
                  <input className="form-control" value={p.tech} onChange={(e) => updateProject(p.id, { tech: e.target.value })} placeholder="Python, SQLite" />
                </div>
                <div>
                  <label className="form-label">Result/impact (optional)</label>
                  <input className="form-control" value={p.impact} onChange={(e) => updateProject(p.id, { impact: e.target.value })} placeholder="Cut count time from 2 hours to 15 minutes" />
                </div>
              </div>
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeProject(p.id)}>
                Remove
              </button>
              {idx < data.projects.length - 1 && <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />}
            </div>
          ))}
          <button type="button" className="chip" onClick={() => update("projects", [...data.projects, newProject()])}>
            + Add {data.projects.length ? "another project" : "a project"}
          </button>
        </div>
      )}

      {stepId === "certifications" && (
        <div className="wizard-step">
          {data.certifications.length === 0 && <p className="muted">Only add certifications you actually hold — skip if you have none yet.</p>}
          {data.certifications.map((c, idx) => (
            <div className="wizard-entry" key={c.id}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Certification name</label>
                  <input className="form-control" value={c.name} onChange={(e) => updateCert(c.id, { name: e.target.value })} placeholder="ISTQB Foundation" />
                </div>
                <div>
                  <label className="form-label">Issuing organization</label>
                  <input className="form-control" value={c.issuer} onChange={(e) => updateCert(c.id, { issuer: e.target.value })} placeholder="ISTQB" />
                </div>
                <div>
                  <label className="form-label">Year</label>
                  <input className="form-control" value={c.year} onChange={(e) => updateCert(c.id, { year: e.target.value })} placeholder="2023" />
                </div>
                <div>
                  <label className="form-label">Credential URL (optional)</label>
                  <input className="form-control" value={c.url} onChange={(e) => updateCert(c.id, { url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => removeCert(c.id)}>
                Remove
              </button>
              {idx < data.certifications.length - 1 && <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid var(--border-color)" }} />}
            </div>
          ))}
          <button type="button" className="chip" onClick={() => update("certifications", [...data.certifications, newCertification()])}>
            + Add {data.certifications.length ? "another" : "a certification"}
          </button>
          {suggestedCertifications(data.targetTitle).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p className="muted">Suggested certifications for {data.targetTitle} — not added automatically:</p>
              <div className="tag-row">
                {suggestedCertifications(data.targetTitle).map((s) => (
                  <span className="tag pref" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {stepId === "achievements" && (
        <div className="wizard-step">
          <p className="muted">One achievement per line. Only include what you can back up in an interview.</p>
          <textarea
            className="form-control"
            rows={4}
            value={data.achievements}
            onChange={(e) => update("achievements", e.target.value)}
            placeholder="Employee of the month, Q2 2023&#10;Led onboarding for 5 new hires"
          />
        </div>
      )}

      {stepId === "review" && (
        <div className="wizard-step">
          <p className="muted">Here&apos;s what we&apos;ll build your Career Vault from — nothing beyond this is invented.</p>
          <pre className="pre" style={{ maxHeight: 320, overflow: "auto" }}>
            {buildResumeText(data) || "(add a few details in earlier steps)"}
          </pre>
        </div>
      )}

      <div className="vault-actions" style={{ marginTop: 14 }}>
        {stepIndex > 0 && (
          <button type="button" className="btn-ghost" onClick={() => go(-1)}>
            Back
          </button>
        )}
        {meta.optional && !isLast && (
          <button type="button" className="btn-ghost" onClick={() => go(1)}>
            Skip
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            className="btn-primary"
            disabled={(stepId === "basics" && !basicsValid) || (stepId === "goal" && !data.experienceLevel)}
            onClick={() => go(1)}
          >
            Continue
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={finish}>
            Build my Career Vault
          </button>
        )}
      </div>
    </div>
  );

  function updateExperience(id: string, patch: Partial<WizardExperience>) {
    update("experiences", data.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeExperience(id: string) {
    update("experiences", data.experiences.filter((e) => e.id !== id));
  }
  function updateEducation(id: string, patch: Partial<WizardEducation>) {
    update("educations", data.educations.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeEducation(id: string) {
    update("educations", data.educations.filter((e) => e.id !== id));
  }
  function updateProject(id: string, patch: Partial<WizardProject>) {
    update("projects", data.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removeProject(id: string) {
    update("projects", data.projects.filter((p) => p.id !== id));
  }
  function updateCert(id: string, patch: Partial<WizardCertification>) {
    update("certifications", data.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeCert(id: string) {
    update("certifications", data.certifications.filter((c) => c.id !== id));
  }
}
