# ResumeProof

Evidence-based candidate matching, claim verification, and honest resume optimization.

> Don't just match the resume. Examine the evidence.

This product implements the ResumeProof engineering plan as a working web application, then goes deeper module by module. Every scoring path is **deterministic** (rule engines + regex + explainable formulas). Optional GitHub lookup uses the public API only to corroborate a handle — it never invents experience.

## What was built

### Recruiter modules (original plan)

| Module | What it does |
| --- | --- |
| Resume parser | Sections, skills, projects, contact, GitHub/LinkedIn URLs, career preferences |
| JD extractor | Mandatory / preferred requirements, categories, synonym expansion |
| Context engine | Negation, action verbs, coursework, weak phrasing, competency phrasing |
| Evidence engine | Requirement → snippet → section → strength 🟢🟡🟠🔴⛔ |
| Claim verification | 5-point checklist: verb, tools, method, metric, production context |
| Mode evaluator | **STRICT** / **BALANCED** / **BEST MATCH** with published formulas |
| Ranking engine | Shortlist first, then score, then strong-evidence tie-break + explanation |
| Skill-gap engine | Strong / partial / missing / verify buckets |
| Preference engine | Role, domain, dream-company alignment |
| Discovery engine | Multi-term AND search across the pool |
| Interview intelligence | Priority questions + STAR guides from weak evidence and gaps |

### Suggested modules (also implemented)

| Module | Why it is here |
| --- | --- |
| Four-layer honest optimizer | Repair → career logic → recruiter rewrite → JD match. **Green writes, yellow asks, red is blocked.** |
| Timeline / logic validator | Overlaps, impossible dates, claimed years vs dated span, intern vs executive claims |
| Synonym lexicon | ML ↔ machine learning, CV ↔ OpenCV, Git ↔ GitHub, and domain aliases |
| ATS score | Contact, headings, length, bullets, keyword coverage, stuffing detector |
| Evidence-bound cover letter | Only resume-backed proof; missing JD skills are listed as blocked |
| GitHub proof | Extract handle/URLs; optional public profile/repo overlap |
| PDF/DOCX upload | Parse into the same pipeline as pasted text |
| Interview studio | Same question engine with STAR coaching for hiring managers |

## Scoring (from the engineering plan)

- 🟢 Strong evidence: `1.00`
- 🟡 Partial: `0.60`
- 🟠 Unclear: `0.30`
- 🔴 Not found: `0.00`
- ⛔ Negative / not demonstrated: `-0.50`

**Strict:** any mandatory requirement that is missing, negative, or unclear → not shortlisted, score `0`.

**Balanced:** `0.65 * mandatory_ratio + 0.35 * preferred_ratio`. Missing/negative mandatory → not shortlisted, score still shown.

**Best match:** no elimination. Weighted by importance × category weight.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000

Seed resumes live in `data/resumes/` and job templates in `data/job_descriptions/` (AI/ML intern, software, finance, marketing, mechanical, renewable energy).

## API

- `GET/POST /api/jobs` — active JD, create or switch template
- `GET /api/sample-jobs`
- `GET/POST /api/candidates`
- `GET /api/search?q=`
- `GET /api/analyze?mode=STRICT|BALANCED|BEST_MATCH`
- `POST /api/optimize`
- `POST /api/ats`
- `POST /api/cover-letter`
- `POST /api/github-proof`
- `POST /api/parse` — multipart file upload

## Product rule

ResumeProof can help people **express real work more clearly**. It will not fabricate schools, employers, certificates, projects, metrics, tech stacks, or stories the candidate cannot defend in an interview.
