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

## What is implemented (MVP + market upgrades)

| SRS area | Status | Where |
| --- | --- | --- |
| Split candidate vs agency screens | Done | `/` chooser, `/candidate`, `/agency` |
| FR-1 Import resume PDF/DOCX/text + LinkedIn paste | Done | Candidate step 1, `/api/linkedin-import` |
| FR-3 Career Vault (typed evidence, approved-only generation) | Done | `/api/vault` |
| FR-4 Job intelligence (paste JD + public URL fetch) | Done | `/api/job-intel` |
| FR-2 Fit Score + sub-scores + disclaimer + parser preview | Done | Candidate step 3 |
| FR-5 Tailoring with accept/reject + full draft edit/export | Done | Candidate steps 4–5, `/api/resume-draft` |
| FR-1.6 / FR-5.6 Version snapshot before tailor | Done | `/api/tailor` |
| FR-6 Verification Remove/Confirm/Edit + export gate | Done | Candidate step 5, `/api/kit` |
| Application kit (resume, cover, email, LinkedIn, WhatsApp, thank-you, referral, checklist) | Done | Step 6 |
| Application tracker statuses + kanban + 3-day follow-up | Done | Step 7 |
| Interview copilot + STAR from vault + practice box | Done | Step 8 |
| Career Change Mode + 30–60–90 + learn-this-month | Done | Step 9 |
| Agency ranking STRICT/BALANCED/BEST MATCH | Done | `/agency` hiring desk |
| Agency ATS / optimizer / GitHub proof / cover in candidate modal | Done | `/agency` hiring desk modal |
| Agency discovery search + candidate pool + bulk upload | Done | `/agency` discovery & pool tabs |
| Agency shortlist CSV export + usage meters | Done | `/agency` hiring desk |
| Agency white-label + client seats + notes + compare | Done (MVP) | `/agency` |
| Job library (save/load past JDs) | Done | Candidate step 2, `/api/job-library` |
| Outcome overlay on Fit Score by band | Done | Candidate step 3 |
| WhatsApp apply bundle (one-click copy) | Done | Candidate step 6 |
| Naukri / Instahyre paste normalizers | Done | `/api/job-intel` |
| Client brief for coaches | Done | `/api/client-brief` |
| Free Markdown + print-to-PDF export | Done | Kit + Print |
| Privacy export / delete | Done | `/api/privacy` |
| Years-of-experience matcher | Done | Fit Score step 3 |
| One-click Apply pack (ZIP) | Done | Kit step 6, `/api/apply-pack` |
| DOCX export | Done | `/api/export-docx` |
| Greenhouse / Lever / JSON-LD URL fetch | Done | `/api/job-intel` |
| Outcome tracking by fit band | Done | Tracker, `/api/outcomes` |
| Referral flow + checklist | Done | Kit step 6 |
| Evidence-bound bullet rewrite (no LLM) | Done | Tailor step 4, `/api/rewrite` |
| AI Career & CV Optimizer (13-section report) | Done | Fit step 3, `OptimizerReportPanel`, `/api/export-report` |
| JD match breakdown (skills, exp, tech, duties, ATS, edu) | Done | `career-intelligence.ts` |
| Career Opportunity Score + opportunity detector | Done | Fit step 3 |
| Skill gap plan (🟢🟡🔴⭐) + market intel (curated) | Done | `skill-gap-plan.ts`, `data/market/role-signals.json` |
| Responsibility evidence map + soft-skill dimensions | Done | `responsibility-matcher.ts`, `soft-skill-scorer.ts` |
| Seamless Build optimized CV (tailor→verify→kit) | Done | Fit + Kit steps, `CandidateApp` |
| Evidence engines, claim checks, GitHub proof, ATS | Done | Agency modal + `/api/*` |
| API smoke tests | Done | `tests/api.test.ts` |

## What is left (Phase 2–3 / deferred)

| Item | Why it is not in this cut |
| --- | --- |
| Real consumer billing / Stripe / India pricing meters | Needs payment keys; usage meters are local counters only |
| Auth + per-user vault (magic link / OAuth) | Single `workspace.json` per deployment today |
| Postgres / multi-tenant database | File-based persistence |
| LinkedIn profile crawler | Privacy + TOS; paste-only |
| Interview answer grading | Needs optional LLM behind evidence gate |
| University SSO, enterprise RBAC, custom domains | Phase 3 |
| Native paginated PDF (beyond print CSS) | Deferred — career report exports Markdown; resume uses print CSS |
| Live `{{CURRENT_MARKET_DATA}}` API feed | Curated `role-signals.json` only today |
| Full 13-section DOCX career report | Markdown report only; resume/cover DOCX separate |
| LLM summary tailor / grading | Optional Phase D |
| Human Expert Review add-on | Marketplace / ops |
| WCAG audit | Improvement backlog |

## Product rule

ResumeProof can rephrase real work. It will not invent schools, employers, certificates, projects, metrics, or tech stacks.
