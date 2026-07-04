# Deploy notes — GitHub Pages

Live at **https://oeponn.github.io/castle-conquest-remastered/** (repo renamed
from `flashgames-revived` on 2026-07-04). This doc covers how
the deploy works, and the 2026-07-04 debugging session that got it working —
the failure was subtle and worth remembering.

## How deployment works

- `.github/workflows/deploy-pages.yml` runs on every push to `main` (and can
  be run manually from the Actions tab via "Run workflow"). It builds the
  Vite app in `web/` and publishes only `web/dist` — never the repo root.
- **Repo setting that must stay put**: Settings → Pages → Build and
  deployment → Source = **"GitHub Actions"**. If this ever reverts to
  "Deploy from a branch", GitHub resumes running its automatic Jekyll
  workflow, which publishes a snapshot of the raw repo (no `index.html` at
  root → 404) and races our workflow for the same site.
- **Base path**: project pages are served under `/<repo-name>/`, not at the
  domain root. The workflow builds with
  `--base=/${{ github.event.repository.name }}/` (so it survives repo
  renames), and the four asset-URL helpers in the app (`App.tsx`, `Hud.tsx`,
  `world.ts`, `audio.ts`) prefix `import.meta.env.BASE_URL` instead of
  hardcoding `/games/...`. A plain `npm run build` still produces
  root-relative paths, so local dev and Vercel are unaffected.
- The site is **public** (GitHub Pages on a public repo is always publicly
  reachable; private Pages requires GitHub Enterprise).

## The 2026-07-04 failure: "Deployment failed, try again later"

Every layer of this was a separate problem wearing the same error message.
In order:

1. **There was no workflow at all.** The first failing run
   (`actions/deploy-pages@v5`, "Deployment failed, try again later") was
   GitHub's *automatic* "pages build and deployment" workflow — the one
   Pages runs itself when the source is "Deploy from a branch". It was
   Jekyll-processing the raw repo root, which could never have served the
   game anyway (the Vite app needs `npm run build`).
2. **First 404: the two workflows raced.** After adding our workflow, both
   it and the automatic Jekyll one ran on the same push (the source setting
   was still branch mode). The Jekyll snapshot won: `/web/index.html` and
   `/PORTING_NOTES.html` served 200 while the root 404'd (no root
   `index.html` in a repo snapshot).
3. **Second 404: deployments "succeeded" but never took effect.** With the
   source switched to GitHub Actions, our runs went green and the
   deployments API showed them *active* — yet never-before-requested paths
   (immune to CDN caching) proved the origin still served the old Jekyll
   snapshot. The Actions-pipeline deployments were silently not being
   ingested.
4. **Unpublishing made it worse, diagnostically better.** "Unpublish site"
   deletes the Pages site record entirely. After that, every deployment
   failed *overtly* in processing — same "try again later" error, ~10s after
   `in_progress`. Adding `actions/configure-pages` with `enablement: true`
   re-provisioned the site fine, but deploys still failed, which exonerated
   provisioning and the artifact contents (3.4 MB, 35 ordinary files, no
   symlinks).
5. **Root cause: stale action versions.** The workflow pinned
   `upload-pages-artifact@v3` / `deploy-pages@v4`, which talk to GitHub's
   *deprecated Actions artifact backend*. The upload "succeeded" and the
   deploy action could even see the artifact metadata, but the Pages
   processing service couldn't ingest the artifact — failing overtly after
   the unpublish, and silently no-op'ing before it (step 3). The Node 20
   deprecation warning in the logs was the tell that the pinned actions were
   generations old. Bumping to **`configure-pages@v6` /
   `upload-pages-artifact@v5` / `deploy-pages@v5`** fixed it immediately.

## Lessons / gotchas

- "Deployment failed, try again later" is a generic Pages *processing*
  error. It says nothing about the cause; check artifact ingestion (action
  versions), site provisioning, and the source setting before believing
  it's transient.
- A green `deploy-pages` run does **not** guarantee the content went live.
  Verify with a never-before-requested path (e.g. a specific asset file) —
  fresh paths bypass the CDN cache, so they reveal what the origin really
  has.
- Old major versions of the `actions/*-pages` actions break invisibly as
  GitHub retires backend APIs. When touching this workflow, check the
  actions' current releases rather than trusting existing pins.
- **Renaming the repo requires a redeploy.** The base path is baked into the
  build (`--base=/<repo-name>/`), so after a rename the live site serves an
  `index.html` whose asset URLs point at the old name → every asset 404s.
  Re-run the workflow and the new name is picked up automatically. Note that
  Pages URLs do *not* redirect after a rename (git remotes do) — the old
  `https://oeponn.github.io/flashgames-revived/` link is simply dead.
- If the Pages site ever gets into a stuck state again, escalation order:
  re-select the source setting → "Unpublish site" + redeploy → rename the
  repo and rename it back (forces full site-record recreation) → GitHub
  support.
