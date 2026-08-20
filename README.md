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
| Native PDF career report | Done | `/api/export-report?format=pdf`, `@react-pdf/renderer` |
| Live market data feed (npm + GitHub + cache) | Done | `live-market-feed.ts`, refreshed on job analyze |
| Auth + per-user vault (magic link + GitHub OAuth) | Done | `/login`, NextAuth, `data/users/{id}/workspace.json` |
| Summary auto-inject on tailor | Done | `/api/tailor` applies JD-aligned summary to draft |
| API test workspace isolation | Done | `tests/setup.ts`, `RESUMEPROOF_WORKSPACE_FILE` |
| Seamless Build optimized CV (tailor→verify→kit) | Done | Fit + Kit steps, `CandidateApp` |
| Evidence engines, claim checks, GitHub proof, ATS | Done | Agency modal + `/api/*` |
| API smoke tests | Done | `tests/api.test.ts` |
| Any-field market coverage (22 role families: healthcare, education, legal, hospitality, sales, trades, logistics, manufacturing, creative, admin, support, HR, + tech/finance/marketing) | Done | `data/market/role-signals.json`, `market-intelligence.ts` |
| AI/agent-era skill vocabulary (LLM, RAG, AI agents, MCP, LangChain, Kubernetes, Terraform, Go, Rust) | Done | `synonym-lexicon.ts`, `jd-extractor.ts` |
| Free-form AI cover letter / summary generator (opt-in, clearly labeled, not evidence-checked — see Product rule) | Done | Kit step 6, `/api/ai-generate` (needs `ANTHROPIC_API_KEY`) |
| Email application directly to a recruiter | Done | Kit step 6 — opens the user's own email client with recipient/subject/cover letter filled in (no SMTP needed; resume is attached manually since browsers can't attach files from JS) |
| Structured resume editor (add/edit/delete lines, not just one raw textarea) | Done | Tailor + Verify steps, `ResumeSectionEditor` |
| Guided step-by-step profile builder (Welcome → goal → About You → Experience → Education → Skills → Projects → Certifications, fresher vs. experienced ordering, deterministic bullet-writing, never-invent AI follow-ups) | Done | Career Vault step, `GuidedProfileWizard`, `lib/wizard/guided-profile.ts` |
| 166 professional resume templates (18 layout skeletons × color palette, filterable by style/color, ATS-recommended ones flagged) with live preview, print-to-PDF, and per-template DOCX export | Done | Templates step, `ResumeTemplatePreview`, `lib/resume-render.ts`, `lib/export/docx-builder.ts` |

## What is left (Phase 2–3 / deferred)

| Item | Why it is not in this cut |
| --- | --- |
| Real consumer billing / Stripe / India pricing meters | Needs payment keys; usage meters are local counters only |
| Postgres / multi-tenant database | File-based per-user JSON today |
| SMTP magic-link email delivery | Dev link + GitHub OAuth; wire SMTP for production email |
| LinkedIn profile crawler | Privacy + TOS; paste-only |
| Interview answer grading | Needs optional LLM behind evidence gate |
| University SSO, enterprise RBAC, custom domains | Phase 3 |
| Resume native paginated PDF | Career report PDF done; resume still print CSS |
| Full 13-section DOCX career report | Markdown + PDF report; resume/cover DOCX separate |
| Server-side email sending (SMTP/API) | "Email to recruiter" currently opens the user's own email client instead |
| Human Expert Review add-on | Marketplace / ops |
| WCAG audit | Improvement backlog |
| 3-pane live CV editor (controls / editor / live preview) | Editing today is the structured `ResumeSectionEditor`, not a WYSIWYG live-preview layout |
| Multi-CV versioning (duplicate a CV, tailor per job, manage named versions) | Job Library saves JDs; there's no "CV 1 / CV 2 / CV 3" version manager yet |
| CV upload → structured "here's what we found" confirmation screen | Upload/paste already extracts text via `/api/parse`; there's no field-by-field extraction-confirmation UI on top of it |

## Product rule

The default path is evidence-bound: ResumeProof can rephrase real work, but every automatic rewrite, suggestion, and export
is built only from your Career Vault. It will not invent schools, employers, certificates, projects, metrics, or tech stacks
on that path.

One explicit exception: the optional "Generate with AI" button in the Application kit step calls an LLM with a free-form
prompt to draft a cover letter or summary. That text is *not* evidence-checked — it's labeled as an AI draft in the UI,
shown separately from the evidence-bound cover letter, and the user is told to review it before sending. It exists because
that's what most competing tools do by default; here it's opt-in and clearly marked as the one place ResumeProof isn't
vouching for what was written.
