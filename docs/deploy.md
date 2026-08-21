# Deploying ResumeProof to a public URL

## Why not just push to Vercel?

This app stores all data as JSON files on local disk (`data/users/<id>/workspace.json`,
`data/accounts/accounts.json`, `data/shares/shares.json`) — there's no database. That's fine on a
normal, always-on server with a persistent disk, but it silently breaks on serverless platforms
like Vercel: every request can land on a different, ephemeral instance, so saved resumes and
accounts can randomly vanish. Until this app moves to a real database, deploy it somewhere that
runs Node as a normal long-lived process with a persistent volume — Render, Railway, or Fly.io all
work. These instructions cover **Render**, since it has the simplest one-click "Blueprint" flow
that provisions the disk for you automatically from the `render.yaml` in this repo.

**A note on cost:** persistent disks require a paid instance type on Render — the free tier
doesn't support them. Check Render's current pricing during signup; using the free tier instead
(by editing `plan: starter` to `plan: free` and deleting the `disk:` block in `render.yaml`) will
deploy successfully but **will lose all saved resumes/accounts on every restart or redeploy** —
not recommended.

## Deploy steps (Render)

1. **Push this repo to GitHub** if it isn't already (Render deploys from a Git repo).
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the GitHub repo. Render will detect `render.yaml` at the repo root and show you the
   `resumeproof` web service it defines, plus a 1GB persistent disk mounted at `/var/data`.
4. Render will prompt you for the one required secret:
   - **`ANTHROPIC_API_KEY`** — get this from [console.anthropic.com](https://console.anthropic.com)
     (API Keys section). Without it, the app still runs, but AI-assisted resume tailoring returns
     a clear "not configured" error instead of working.
5. Click **Apply** / **Deploy Blueprint**. Render builds (`npm install && npm run build`) and
   starts the service (`npm run start`), listening on the port Render assigns via `$PORT`
   (already wired up in `package.json`).
6. Once live, Render gives you a URL like `https://resumeproof-xxxx.onrender.com`. Visit
   `<that-url>/api/health` — you should get back `{"ok":true,"product":"ResumeProof","engines":13}`.
7. **Set `NEXTAUTH_URL`** (you couldn't know this URL before step 6): in the Render dashboard →
   your service → **Environment** → add `NEXTAUTH_URL` = your actual `https://...onrender.com`
   URL → save (triggers a redeploy). This makes magic-link emails, password-reset links, and
   OAuth callbacks point at the right place instead of `localhost`.

At this point the app is fully live with email/password login, password reset, and AI tailoring.
Everything below is optional, added the same way (dashboard → Environment → add variable → save):

| Feature | Env vars | Where to get them |
|---|---|---|
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth client ID. Set the authorized redirect URI to `<your-url>/api/auth/callback/google`. |
| GitHub sign-in | `GITHUB_ID`, `GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps. Set the callback URL to `<your-url>/api/auth/callback/github`. |
| Real email delivery (magic links, password reset) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | Any SMTP provider (e.g. a transactional email service). Without these set, the app falls back to returning the link directly in the API response instead of emailing it — functional for testing, not for real users. |

None of these are required to get a working deploy — the app is designed to degrade gracefully
without them (conditional OAuth providers, dev-mode link fallback for email).

## Alternative: Railway

Railway also runs Next.js as a normal Node process and supports persistent volumes, without
needing a dedicated config file — point it at this GitHub repo, it auto-detects the build/start
commands from `package.json`, and you attach a volume via its dashboard (mount it at whatever path
you then set `RESUMEPROOF_DATA_DIR` to, same as the Render instructions above). The same env var
table applies.

## What `RESUMEPROOF_DATA_DIR` does

By default the app writes its data files to `<repo>/data` — fine for local dev, but on most
platforms that directory resets on every deploy. Setting `RESUMEPROOF_DATA_DIR` (already set to
`/var/data` in `render.yaml`, matching the disk mount path) redirects all user data — workspaces,
accounts, share links — onto the persistent volume instead, in one place, without needing a
separate override per store file.
