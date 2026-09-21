---
name: deploy
description: Build VitaLoop and deploy it to Firebase Hosting (vitaloop.web.app), then verify the deployed bundle hash matches the local build. User-only: deploy is a visible, production-affecting action.
disable-model-invocation: true
---

# Deploy VitaLoop

The sequence documented in CLAUDE.md's "Status / Fortschritt" for every merged PR so far. Only run this from the main checkout (not a worktree) — a worktree has no `.env`, so its build silently drops the entire app behind the `VITE_SUPABASE_URL` guard in `src/lib/supabase.ts`.

## Steps

1. **Confirm `master` is current and clean:**
   ```bash
   git status --short
   git log --oneline -1
   ```
   If there are uncommitted changes or the PR you expect isn't merged yet, stop and ask before proceeding.

2. **Install, build:**
   ```bash
   npm ci
   npm run build
   ```
   Note the built entry-chunk hash from the `npm run build` output (e.g. `dist/assets/index-XXXXXXXX.js`).

3. **Deploy:**
   ```bash
   firebase deploy --only hosting:vitaloop
   ```

4. **Hash-sanity-check** — confirm the live site serves the same build you just made, not a stale cache:
   ```bash
   curl -s "https://vitaloop.web.app/?cb=$(date +%s)" | grep -o 'index-[A-Za-z0-9_-]*\.js'
   ```
   This must match the hash from step 2. If it doesn't, wait a few seconds (CDN propagation) and retry before assuming something is wrong.

5. **Report** the matched hash and remind the user (or do it yourself if the task called for it) that a live-browser verification against production is still a separate step for anything user-facing — a passing hash check only proves the right bytes shipped, not that the feature works.
