import { describe, expect, it } from "vitest";
import { resumeTextToTemplatedDocxBuffer, STYLE_PROFILES } from "@/lib/export/docx-builder";
import { RESUME_TEMPLATES, TEMPLATE_SKELETONS } from "@/lib/resume-render";

const SAMPLE = `NAME: Jane Rivera
EMAIL: jane.rivera@example.com
PHONE: 555-0100
LOCATION: Austin, TX

SUMMARY
Registered nurse with 4 years of experience in med-surg units.

SKILLS
Patient care, EHR (Epic), vital signs monitoring

WORK EXPERIENCE
St. Mary Hospital | Registered Nurse | 2021-Present
- Provided direct patient care for a 20-bed med-surg unit
- Documented clinical notes in Epic EHR system

EDUCATION
- BSN, State University, 2020`;

/** Resume "shapes" spanning distinct streams/experience levels, so the
 *  exhaustive template pass below isn't just re-testing one tech resume:
 *  a fresher with no work history, a dense 8+-year executive resume, a
 *  trades resume with certifications, a creative resume with only
 *  projects, and one with unusual/edge-case content. */
const STREAM_RESUMES: Record<string, string> = {
  healthcare_nurse: SAMPLE,
  fresher_no_experience: `NAME: Alex Chen
EMAIL: alex.chen@example.com
PHONE: 555-0199

SKILLS
Python, SQL, Excel

PROJECTS
- Test automation framework — built a Python framework for regression testing

EDUCATION
- B.S. Computer Science, University of Washington (2025)`,
  senior_executive_dense: `NAME: Morgan Reyes
EMAIL: morgan.reyes@example.com
PHONE: 555-0222
LOCATION: New York, NY
LINKEDIN: linkedin.com/in/morganreyes

SUMMARY
VP of Engineering with 12 years leading platform teams across fintech and healthtech.

SKILLS
Leadership, roadmap planning, budget ownership, cross-functional alignment, cloud architecture, Kubernetes, Terraform, stakeholder communication, hiring, mentoring

WORK EXPERIENCE
Acme Fintech | VP Engineering | 2020-Present
- Grew engineering org from 12 to 60 across 4 teams
- Owned a $9M annual cloud infrastructure budget
- Set technical strategy for the platform migration to Kubernetes

Beta Health | Director of Engineering | 2016-2020
- Led the payments platform rebuild serving 2M daily transactions
- Hired and mentored 3 engineering managers

Gamma Systems | Senior Engineering Manager | 2013-2016
- Managed a 15-person distributed team across 3 time zones
- Drove adoption of Terraform across all infrastructure teams

EDUCATION
- M.S. Computer Science, Carnegie Mellon University (2013)
- B.S. Computer Science, University of Michigan (2011)

CERTIFICATIONS
- AWS Certified Solutions Architect — Professional (2019)`,
  trades_electrician: `NAME: Pat Nguyen
EMAIL: pat.nguyen@example.com
PHONE: 555-0125

SKILLS
Electrical wiring, plumbing basics, HVAC, welding, OSHA safety certification, blueprint reading

WORK EXPERIENCE
BuildRight Contractors | Electrician | 2021-Present
- Installed electrical wiring for commercial buildings
- Maintained OSHA safety certification
- Read blueprints on site

CERTIFICATIONS
- OSHA 30-Hour Construction Safety (2022)`,
  creative_projects_only: `NAME: Charlie Voss
EMAIL: charlie.voss@example.com
PHONE: 555-0128

SKILLS
Graphic design, Adobe Creative Suite, Figma, branding

PROJECTS
- Rebrand for a local coffee chain — led full visual identity redesign across 12 locations
- Album art series — designed cover art for an independent record label`,
  edge_case_minimal: `NAME: J
EMAIL: j@example.com
PHONE: 555-0000

SKILLS
Communication`
};

describe("STYLE_PROFILES coverage", () => {
  it("has an explicit profile for every declared skeleton — no silent fallback", () => {
    for (const s of TEMPLATE_SKELETONS) {
      expect(STYLE_PROFILES[s.id], `missing STYLE_PROFILES entry for skeleton "${s.id}"`).toBeDefined();
    }
  });
});

describe("resumeTextToTemplatedDocxBuffer", () => {
  it("produces a valid non-empty .docx (zip) buffer for a template", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue");
    expect(buf.length).toBeGreaterThan(1000);
    // .docx files are zip archives — magic bytes "PK".
    expect(buf.slice(0, 2).toString("ascii")).toBe("PK");
  });

  it("falls back safely for an unknown template id instead of throwing", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "not-a-real-template");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("handles an empty resume without throwing", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer("", "ats-classic-black");
    expect(buf.length).toBeGreaterThan(500);
  });

  it("embeds a photo (PNG) as an ImageRun without corrupting the docx", async () => {
    // 1x1 transparent PNG, smallest valid PNG payload.
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const withPhoto = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue", tinyPng);
    const withoutPhoto = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue");
    expect(withPhoto.slice(0, 2).toString("ascii")).toBe("PK");
    expect(withPhoto.length).toBeGreaterThan(withoutPhoto.length);
  });

  it("skips a photo docx can't embed (e.g. webp) instead of throwing or corrupting output", async () => {
    const webp = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue", webp);
    expect(buf.slice(0, 2).toString("ascii")).toBe("PK");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("ignores a null/undefined photo the same as omitting it", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue", null);
    expect(buf.slice(0, 2).toString("ascii")).toBe("PK");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it(
    "generates a valid, non-empty .docx for every one of the 166 templates, across every stream/experience shape",
    async () => {
      const failures: string[] = [];
      for (const [streamName, resumeText] of Object.entries(STREAM_RESUMES)) {
        for (const template of RESUME_TEMPLATES) {
          const buf = await resumeTextToTemplatedDocxBuffer(resumeText, template.id);
          const isValidZip = buf.slice(0, 2).toString("ascii") === "PK";
          if (!isValidZip || buf.length < 500) {
            failures.push(`${streamName} / ${template.id}: valid=${isValidZip} size=${buf.length}`);
          }
        }
      }
      expect(failures, failures.join("\n")).toEqual([]);
    },
    60000
  );
});
