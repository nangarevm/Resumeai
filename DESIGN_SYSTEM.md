# ResumeProof Design System

A reference for the visual language and reusable UI components used across the
Candidate app (`/candidate`), Agency Desk (`/agency`), and the landing page.
Everything here reflects what's actually implemented in `src/app/globals.css`
and `src/components/` — this is a description of the system, not a spec for
one that doesn't exist yet.

## Core principle

The product's promise is that nothing is fabricated: every claim on a
generated resume, cover letter, or email traces back to something the
candidate actually provided. The UI has a matching promise — never present
an unsupported or uncertain state as if it were settled fact. Two rules that
follow from this and show up throughout the components below:

- **Status is never color-alone.** Every colored badge, dot, or icon ships
  with a text label next to it (`✅ Proven`, `🔴 Cannot add — no supporting
  evidence`, `Shortlisted` / `Rejected`). A colorblind user or a black-and-white
  printout should be able to read the same information a sighted user gets
  from color.
- **Confidence is shown in plain language, not raw numbers.** `High/Medium/Low
  confidence` instead of `Confidence: 84%`; `3 of 6 preparation steps
  complete` instead of a bare percentage. See `confidenceLabel()` in
  `CandidateApp.tsx` and `ReadinessScore.tsx`.

## Color tokens

All defined as CSS custom properties on `:root` in `globals.css`. Every pair
below meets WCAG AA contrast (4.5:1+) against `--bg-dark`.

| Token | Value | Use |
|---|---|---|
| `--bg-dark` | `#090d16` | Page background |
| `--bg-card` | `rgba(22,27,34,0.85)` | `.card` background (blurred) |
| `--border-color` | `rgba(240,246,252,0.1)` | Default border on cards, inputs, chips |
| `--text-primary` | `#f0f6fc` | Headings, body text |
| `--text-secondary` | `#8b949e` | `.muted` — captions, hints, metadata |
| `--accent-blue` | `#58a6ff` | Primary actions, links, active nav state |
| `--accent-green` | `#3fb950` | Success / approved / shortlisted |
| `--accent-yellow` | `#d29922` | Warning / partial / medium confidence |
| `--accent-red` | `#f85149` | Blocked / rejected / high-risk |
| `--accent-purple` | `#a371f7` | Secondary accent (gradients, brand mark) |

Status badges (`.badge.ok`, `.badge.no`, `.badge.mid`) use a 15%-opacity tint
of the accent as background with the full accent as text color — never the
accent alone as a background fill, which would fail contrast for white text.

The 166 resume templates (`src/lib/resume-render.ts`) use a **separate**
11-color palette (`TEMPLATE_COLORS`) plus 3 neutral "ink" shades
(`NEUTRAL_SHADES`) — these are print/export colors for generated documents,
not part of the app UI palette above, and are deliberately kept apart so
changing one never accidentally changes the other.

## Typography

Single font stack, no separate heading font: `"Segoe UI", Inter,
-apple-system, BlinkMacSystemFont, Roboto, sans-serif`.

| Role | Size | Weight | Example |
|---|---|---|---|
| Page/step title (`h2` in topbar) | 22px | default | "Career Vault" |
| Card heading (`h3`) | ~16px | default | "3. ResumeProof Fit Score" |
| Body text | 13–14px | default | paragraph copy, `.pre` blocks |
| `.muted` (secondary/caption) | 13px | default | hints, disclaimers |
| Small label (`.form-label`, `.label`, table headers) | 11–12px | 600–700, uppercase, letter-spaced | "APPLICATION READINESS" |
| Metric value (`.metric strong`) | 22px | default | "83" (Fit Score) |
| Badge / chip text | 11–12px | 700 | "Shortlisted" |

## Spacing & shape

- Card padding: `14px 16px`. Card radius: `14px`. Border: `1px solid var(--border-color)`.
- Buttons/chips/pills: radius `999px` (pill) for `.btn-primary`/`.btn-ghost`/`.chip`, `10–12px` for form controls and smaller cards.
- Standard gap between stacked controls: `8px`. Section spacing: `12–20px`.
- Mobile touch targets: primary controls (`.btn`, `.btn-primary`, `.btn-ghost`, `.chip`, `.nav-btn`, `.category-chip`, form fields) get `min-height: 44px` under `max-width: 980px`. Small utility buttons (remove ×, Archive) are deliberately excluded so dense rows don't balloon.

## Layout shell

Every full-screen app (`CandidateApp`, `AgencyApp`) shares one shell:

```
.app-shell (flex row)
├── .sidebar        — brand mark, grouped nav, footer link
└── .main           — .topbar (title + actions) → step/tab content
```

- **Desktop (>980px):** sidebar is a static 232px column.
- **Mobile (≤980px):** sidebar becomes a fixed off-canvas drawer
  (`transform: translateX(-100%)` → `.sidebar-open` for `translateX(0)`),
  opened by a `.hamburger-btn` in the topbar and closed by a
  `.sidebar-backdrop` click or by selecting a nav item. **Any new full-screen
  app that reuses `.sidebar` must also implement this hamburger/backdrop
  pattern itself** — the CSS is shared, the toggle state is not. (This was
  missed once for Agency Desk and caused a real regression; see git history
  for `AgencyApp.tsx`.)
- Wide content (data tables, resume previews) must be wrapped in
  `.table-wrap { overflow: auto }` so it scrolls in its own box instead of
  forcing the whole page to scroll horizontally on mobile.

## Reusable components (`src/components/`)

| Component | Purpose |
|---|---|
| `NextBestAction` | Priority-ordered banner telling the user the single next step, driven by pure function `computeNextBestAction()` in `src/lib/next-best-action.ts` |
| `ReadinessScore` | "N of M preparation steps complete" bar — replaces a raw/misleading percentage |
| `AutosaveStatus` | idle/saving/saved/error indicator for background saves |
| `LoadingProgress` | Spinner + step-aware label shown whenever an async action is in flight |
| `EmptyState` | Icon + title + detail + optional CTA for any screen that could otherwise render blank |
| `HealthCard` | Checklist-style completeness summary (checkmark/empty-box + label per item), used for Career Vault |
| `ApplicationKitCard` | Icon + title + description card for one Application Kit deliverable (recruiter email, cover letter, etc.), grid-laid-out, expands to full width when open |
| `CompactSearch` | Icon + input + clear button + live match count, for filtering a list in place |
| `ComparisonTable` | Side-by-side requirement-by-requirement comparison of two evaluated candidates |
| `ResumeTemplatePreview` | Renders a parsed resume through one of 166 skeleton×color template combinations |
| `ResumeSectionEditor` | Structured add/edit/delete editor for a resume draft |
| `OptimizerReportPanel` | AI Career & CV Optimizer report (JD match, skill gaps, market intelligence) |
| `GuidedProfileWizard` | Step-by-step intake for candidates without an existing resume |
| `CopyButton` | One-click copy-to-clipboard with a confirmation flash |
| `AuthBar` | Sign-in / account status control in the topbar |

## Patterns for new screens

- **Never render a blank screen.** If a list, report, or generated artifact
  could be empty, use `EmptyState` with a CTA that moves the user forward
  (usually `setStep`/`setTab` to wherever the missing input comes from).
- **Never leave an async action silent.** Either disable the triggering
  button and show `LoadingProgress`, or flash `AutosaveStatus` for
  background saves.
- **Progressive disclosure for anything past the primary decision.** The
  Fit Score screen is the reference case: apply-readiness, the headline
  score, and "do this next" stay visible; the sub-score breakdown and raw
  parser output sit behind `<details>` toggles (see `.opt-section` /
  `.kit-card` styling).
- **Reuse before you build.** Check this table first — a new "N of M done"
  indicator is `ReadinessScore`, a new "nothing here yet" screen is
  `EmptyState`, a new filterable list is `CompactSearch`, not a bespoke
  implementation of the same idea.
- **Verify on a real phone width before calling a screen done.** 390px
  (`iPhone 12/13/14` class) is the floor. Confirm
  `document.body.scrollWidth === window.innerWidth` — a mismatch means
  something is forcing horizontal page scroll, almost always a bare
  `<table>` without `.table-wrap` or a `white-space: nowrap` element
  without a constrained parent width.
