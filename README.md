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
| FR-1 Import resume PDF/DOCX/text | Done | Candidate step 1 |
| FR-3 Career Vault (typed evidence, source, approved-only generation) | Done | `/api/vault` |
| FR-4 Job intelligence (paste JD + public URL fetch) | Done | `/api/job-intel` |
| FR-2 Fit Score + sub-scores + disclaimer + parser preview | Done | Candidate step 3 |
| FR-5 Tailoring with accept/reject + blocked fabrication | Done | Candidate step 4 |
| FR-1.6 / FR-5.6 Version snapshot before tailor | Done | `/api/tailor` |
| FR-6 Verification Remove/Confirm/Edit + export gate | Done | Candidate step 5, `/api/kit` |
| Application kit (resume, cover, recruiter email, LinkedIn, checklist) | Done | Step 6 |
| Application tracker statuses | Done | Step 7 |
| Interview copilot + STAR from vault | Done | Step 8 |
| Career Change Mode | Done | Step 9 |
| Agency ranking STRICT/BALANCED/BEST MATCH | Done | `/agency` hiring desk |
| Agency white-label + client seats | Done (MVP) | `/agency` brand & clients |
| Free Markdown + print-to-PDF export | Done | Kit + Print |
| Evidence engines, claim checks, GitHub proof, ATS | Done | Existing `/api/*` used by agency |

## What is left (Phase 2–3 / deferred)

| Item | Why it is not in this cut |
| --- | --- |
| Real consumer billing / Stripe / India pricing meters | Needs payment keys; UI copy only |
| Native DOCX writer (we import DOCX; export is Markdown + print PDF) | Add `docx` library next |
| LinkedIn profile import / optimization crawler | Privacy + TOS; paste-only today |
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
