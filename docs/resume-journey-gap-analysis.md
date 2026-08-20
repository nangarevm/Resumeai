# Resume Creation/Update Journey — Gap Analysis

Scope: the standalone "build and maintain a resume" journey — importing, editing,
improving, and exporting a resume — independent of the job-matching/application
features. Findings below are verified against the actual codebase, not assumed.

## What's fully built (verified working)

### Getting a resume in
- Paste text
- Upload `.txt` / `.md` / `.pdf` / `.docx`
- LinkedIn paste
- Guided step-by-step Q&A wizard, for someone with no resume yet
- Load a sample resume
- Real parsing into structured sections: name, email, phone, skills, projects, experience

### Editing it
- Line-level editor — reorder any line or whole section up/down, add, delete
- Autosave, confirmed live ("✓ Saved just now" indicator)

### Making it better
All shipped this session, all deterministic (no LLM):
- Bullet Formula Check (Action + Technology + Scope + Result)
- Achievement Builder (guided quantification, never invents numbers)
- Skills Optimization (categorized SKILLS grouping)
- Generic Language Check (resume cliché detector)
- Truth Guard / Resume Integrity Check
- Resume Health Dashboard

### Getting it out
- 166 templates with a real, live WYSIWYG preview before export (not a blind download)
- PDF export via print
- DOCX export

### Confirmed standalone
This entire path works **without ever adding a target job** — resume-only usage
is a genuinely complete journey, not something bolted onto the job-matching flow.

### Account layer
Email/password registration + login, password reset, Google/GitHub OAuth,
magic-link — all shipped and verified end to end.

## Real gaps — all shipped

| # | Gap | Why it mattered | Effort | Status |
|---|---|---|---|---|
| 1 | **Version history has no UI** | The backend already auto-snapshotted the resume into a `versions[]` array on every save (`workspace-store.ts`), and an application record even links to `resumeVersionId`. But there was zero UI anywhere to view, name, or restore an old version. | Low | ✅ `VersionHistoryPanel` + `/api/versions` |
| 2 | **No multi-resume support** | One account = one master resume. No way to maintain, say, a "Frontend Engineer" resume and a "Backend Engineer" resume as two distinct named documents. | Medium | ✅ Pinned versions + `NamedResumesPanel` (save-as, switch, rename, delete) |
| 3 | **No undo for editing mistakes** | Delete a line or a whole section in the line editor and there was no direct "undo". | Low–Medium | ✅ Per-session draft-history stack (up to 20 steps) in the line editor |
| 4 | **Upload robustness gaps** | `/api/parse` had no warning when extraction yielded almost nothing — a scanned PDF extracting to a few stray characters still showed "File parsed" as if it worked, and a malformed file crashed the route with an unhandled 500. | Low (warning) / Higher (OCR) | ✅ Near-empty-extraction warning + clean error on corrupted files. OCR for scanned/image-only PDFs is still out of scope. |
| 5 | **No sharing/collaboration** | No way to generate a link for a mentor or friend to review a resume. | Medium | ✅ One-active-link-per-user share URLs (`/r/[token]`), contact info redacted by default, revoke support |
| 6 | **No photo/headshot support** | No template supported a photo — relevant for non-US-market users where a photo on a CV is expected. | Medium | ✅ Optional headshot upload, rendered across all 165 templates, included in PDF (print) and DOCX export |
| 7 | **No page-count/pagination control** | A senior candidate or academic CV with 2+ pages had no way to preview or manage page breaks. | Medium | ✅ Estimated page count + page-break markers in the template preview |

Every item from the original gap analysis is now implemented, tested, and verified end to end (typecheck, unit tests, production build, and a real-browser Playwright pass). The one deliberately deferred sub-scope is OCR for scanned/image-only PDF uploads (part of #4) — flagged above as materially higher effort than the rest of this list and not blocking the core resume-building journey.
