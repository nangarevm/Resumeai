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

## Real gaps

| # | Gap | Why it matters | Effort |
|---|---|---|---|
| 1 | **Version history has no UI** | The backend already auto-snapshots the resume into a `versions[]` array on every save (`workspace-store.ts`), and an application record even links to `resumeVersionId`. But there is zero UI anywhere to view, name, or restore an old version. Data's already being captured — it just needs a screen. | Low |
| 2 | **No multi-resume support** | One account = one master resume. No way to maintain, say, a "Frontend Engineer" resume and a "Backend Engineer" resume as two distinct named documents. Confirmed no such concept exists in the code. | Medium |
| 3 | **No undo for editing mistakes** | Delete a line or a whole section in the line editor and there's no direct "undo" — only the invisible auto-versioning from #1, which isn't user-facing yet. | Low–Medium |
| 4 | **Upload robustness gaps** | `/api/parse` has no OCR fallback for scanned/image-only PDFs (silently returns near-empty text), no legacy `.doc` support (only `.docx`), and — the concerning one — no warning when extraction yields almost nothing. The upload handler only checks `if (data.text)` is truthy, so a scanned PDF that extracts to a few stray characters still shows "File parsed" as if it worked. | Low (warning) / Higher (OCR) |
| 5 | **No sharing/collaboration** | No way to generate a link for a mentor or friend to review a resume. | Medium |
| 6 | **No photo/headshot support** | No template supports a photo — relevant for non-US-market users where a photo on a CV is expected. | Medium |
| 7 | **No page-count/pagination control** | A senior candidate or academic CV with 2+ pages has no way to preview or manage page breaks. | Medium |

## Recommended priority

**Fix first — real correctness gaps, not missing nice-to-haves:**
- **#1** (surface the version history that already exists) — needs almost no new backend work, the data's already there.
- **#4** (warn on near-empty extraction) — right now it actively misleads a user into thinking their upload worked when it didn't.

**Genuine new features, worth scoping deliberately:**
- #2 (multi-resume support)
- #3 (undo)
- #5–7 (sharing, photos, pagination) — lower priority polish.
