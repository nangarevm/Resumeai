# ResumeProof SRS v2.0

Two workspaces, one promise: **build from real career evidence and never fabricate experience.**

- Job seekers: [`/candidate`](/candidate)
- Recruiters / agencies / coaches: [`/agency`](/agency)

```bash
npm install
npm test
npm run dev
```

Then open the app (on this cloud VM the public preview is a tunnel; on your own machine use http://localhost:3000).

## What is implemented (MVP + suggestions)

| SRS area | Status | Where |
| --- | --- | --- |
| Split candidate vs agency screens | Done | `/` chooser, `/candidate`, `/agency` |
| FR-1 Import resume PDF/DOCX/text + LinkedIn paste | Done | Candidate step 1, `/api/linkedin-import` |
| FR-3 Career Vault (typed evidence, source, approved-only generation) | Done | `/api/vault` |
| FR-4 Job intelligence (paste JD + public URL fetch) | Done | `/api/job-intel` |
| FR-2 Fit Score + sub-scores + disclaimer + parser preview | Done | Candidate step 3 |
| FR-5 Tailoring with accept/reject + full draft edit/export | Done | Candidate steps 4–5, `/api/resume-draft` |
| FR-1.6 / FR-5.6 Version snapshot before tailor | Done | `/api/tailor` |
| FR-6 Verification Remove/Confirm/Edit + export gate | Done | Candidate step 5, `/api/kit` |
| Application kit (resume, cover, recruiter email, LinkedIn, WhatsApp, thank-you, referral, checklist) | Done | Step 6 |
| Application tracker statuses + kanban + 3-day follow-up | Done | Step 7 |
| Interview copilot + STAR from vault + practice box | Done | Step 8 |
| Career Change Mode + 30–60–90 + learn-this-month | Done | Step 9 |
| Agency ranking STRICT/BALANCED/BEST MATCH | Done | `/agency` hiring desk |
| Agency white-label + client seats + notes + compare | Done (MVP) | `/agency` brand, clients, hiring |
| Free Markdown + print-to-PDF export | Done | Kit + Print |
| Privacy export / delete | Done | `/api/privacy` |
| Evidence engines, claim checks, GitHub proof, ATS | Done | Existing `/api/*` used by agency |

## Market suggestions (2026) — implemented in this pass

Hiring tools (Teal, Huntr, Jobscan, Ashby-style desks) now win on **time-to-first-score**, **copy-to-WhatsApp/LinkedIn**, **honest scores**, and **pipeline follow-up** — not on inventing a “perfect ATS resume.” Each module below was reviewed against that market, then shipped.

| Module | Market pressure | What we shipped |
| --- | --- | --- |
| Onboarding | Users bounce if first value > 5 minutes | Sample resume/JD, journey %, landing “how to start” |
| Career Vault | Completeness meters (Teal) without fake profile scores | Family bar, archive/restore, LinkedIn paste import (no crawl) |
| Job intel | Boards block scrapers; paste-first is the real path | Paste-first copy, seniority/location, required vs preferred chips |
| Fit Score | ATS % skepticism; “what do I do next?” | Disclaimer, sub-scores, delta, next actions, honest score movers |
| Tailor / export | Edit and download the tailored resume | Inline suggestions + full draft editor, save version, .txt/.md export |
| Verify | AI-resume detection / export liability | Remove/confirm/edit gate; override is explicit |
| Application kit | India/WhatsApp + referrals + 24h thank-you | Copy buttons, WhatsApp, referral, thank-you, Markdown/PDF |
| Tracker | Huntr/Teal kanban + ghost-job follow-up | Kanban incl. Rejected, 3-day follow-up copy |
| Interview | Practice in the same tool you applied from | STAR from vault, practice box, post-interview thank-you |
| Career change | Career-switch spam resumes | Role chips, 30–60–90, “learn this month then vault it” |
| Privacy | DPDP / GDPR expectation even in MVP | Export JSON / delete vault |
| Agency | Compare two, notes, copy shortlist | Search, side-by-side, seat notes, copy shortlist |

## What is left (Phase 2–3 / deferred)

| Item | Why it is not in this cut |
| --- | --- |
| Real consumer billing / Stripe / India pricing meters | Needs payment keys; UI copy only |
| Native DOCX writer (we import DOCX; export is Markdown + print PDF) | Add `docx` library next |
| LinkedIn profile import / optimization crawler | Privacy + TOS; paste-only today (About/Experience/Skills) |
| Answer grading for interview practice | Needs optional LLM |
| University SSO, enterprise RBAC, invoice reconciliation | Phase 3 |
| Native mobile apps, video resumes, employer ATS, social network | Explicitly deferred in SRS |
| Autosave debounce 2s to a real user account | In-memory + JSON file workspace, no auth yet |
| Human Expert Review add-on | Marketplace / ops |

## How we can improve next

1. Add login (email magic link) so vaults are per-user, not a single workspace file.
2. Generate real `.docx` / paginated PDF from the kit.
3. Optional LLM only behind the same evidence gate (still no fabrication).
4. Outcome analytics: conversion by fit band (north-star metric).
5. Agency: invite links, seat billing, bulk JD upload.
6. WCAG pass on contrast, keyboard, and focus for the wizard.
7. Job URL parser per-board (LinkedIn/Greenhouse) instead of generic HTML strip.

## Product rule

ResumeProof can rephrase real work. It will not invent schools, employers, certificates, projects, metrics, or tech stacks.
