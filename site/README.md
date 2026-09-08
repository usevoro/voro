# VORO website

A static, responsive product website built from the existing VORO artbook identity. No runtime framework, analytics, third-party fonts, or 3D viewer bundle is shipped. The screenshot switcher progressively enhances ordinary links; the FAQ and platform/download information work without JavaScript.

## Develop

From the parent repository: `npm run site:build`, `npm run site:dev`, `npm run site:test`. The site is also self-contained: `cd site` then `npm run build` / `npm run dev` / `npm test`. Node 22+ is the only dependency. Rebuild after editing; the local server serves the latest `dist` output on port 4173. Website assets are excluded from the Electron package.

`npm run site:capture` in the parent repository launches the real desktop app with generated fixtures and refreshes both screenshots and the downloadable sample sidecar. It uses an isolated temporary project and never opens user assets. The machine-specific display path is replaced before capture. Preserve image provenance in `public/images/provenance.json`.

Brand assets in `public/brand` are distribution copies of the canonical parent `brand/` files. Font licenses are included. If the canonical brand changes, copy the same tokens, four WOFF2 files, font licenses, mascot SVGs, and native PNG into this directory. Do not independently redesign these copies.

## Deploy to Vercel

Import `usevoro/voro` in Vercel and set **Root Directory to `site`**. Keep the desktop repository private; Vercel’s GitHub connection must have access to it. Use **Framework Preset: Other**, **Node.js 22.x**, and the checked-in `vercel.json`. No Nitro adapter or server runtime is required.

The configuration runs `npm run refresh && npm test && npm run build` and serves `dist`. The install command only checks Node because this site has no dependencies; it will not install or package Electron. All required source and brand assets are inside `site`, so access to files outside the Root Directory is unnecessary. Keep Vercel’s system environment variables enabled.

Set `SITE_ORIGIN` to the approved production HTTPS origin. Without it, noindex previews use Vercel’s project production URL (then deployment URL), and local builds use `https://localhost` as a non-public metadata fallback. Public indexing requires an explicit production origin, preventing an accidental canonical URL on an ephemeral deployment.

For the first review, keep `SITE_INDEXABLE=false`. For public production, set `SITE_INDEXABLE=true` in **Production** only. Add your approved domain in Vercel before enabling indexing. Preview deployments always remain noindex. Do not redirect every unknown path to the home page; Vercel serves the generated `404.html` for missing pages.

The exact Vercel build sequence can be validated locally from `site`: `npm run refresh && npm test && npm run build`. The repository includes configuration; no Vercel project has been linked or deployed yet. A future Nitro migration makes sense if the site gains request-time APIs or cached server-rendered release data, but is unnecessary for the current static page.

Official setup references: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build), [vercel.json](https://vercel.com/docs/project-configuration/vercel-json), [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Public launch

The site defaults to `noindex`. `data/site.json` contains an optional canonical HTTPS origin and `indexable` flag. Set `SITE_ORIGIN` and `SITE_INDEXABLE=true` in the public production environment to enable indexing and the sitemap. Vercel preview/development environments remain noindex even when the flag is enabled. Noindex is an indexing directive, not access control; use Vercel Deployment Protection for restricted previews.

The current source repository, `usevoro/voro`, is private and has no published releases. Until a public source or distribution repository is explicitly approved, the site links to the public `usevoro` organization, omits repository stars, and shows all platform builds as unavailable. Changing this configuration does not change GitHub repository visibility. Do not publish desktop source or binaries as a side effect of website deployment.

To activate real downloads:

1. Agree on public distribution and licensing. Publish and validate each intended platform build, including signing/notarization and supported OS versions. Do not label a prerelease stable.
2. Set `publicRepository` to the approved public `usevoro/<repo>` in `data/site.json` and the same `repository` in `data/releases.json`. Optional documentation and issue links must resolve publicly inside that repository. Stars refer to this exact repository; use a source project name if a distribution-only repository would make the count misleading.
3. For each validated target, set `status: "available"`, `version`, exact `tag`, exact `assetName`, `channel` (`stable` or `prerelease`), `minimumOS`, `fileType`, `sizeBytes`, `url`, `releaseNotesUrl`, human-readable `signing`, and ISO `verifiedAt`. Optional `checksumUrl` points to a published checksum asset. Preserve all four target IDs; unsupported targets remain unavailable/planned.
4. Run `npm run refresh` from this directory. Anonymous GitHub API requests verify that the repository and each explicitly mapped asset are public, the release channel matches, and the download URL belongs to the repository. The script updates sizes and verification times, never guesses asset names. Withdrawn assets become unavailable. Re-enabling a withdrawn asset is an explicit manifest edit.
5. Run tests and build, then redeploy. Arrange an hourly refresh/build/deploy in the chosen production host before enabling public downloads or star counts. A static deployment keeps its build-time snapshot: the 24-hour expiry is checked at build, not by a live server. If scheduled publishing is unavailable, omit star counts and pause download availability until a manual verification/redeploy. Visitors never make GitHub API requests.

API failures retain the last cache. Build-time validation suppresses counts and available builds with verification older than 24 hours or in the future; zero stars is a valid value, not an error placeholder. HTTPS and approved GitHub repository paths are enforced. No credentials enter the client bundle.

## SEO and accessibility

HTML contains the full product explanation, descriptive title and metadata, canonical link, social preview, and truthful Organization/WebSite/SoftwareApplication JSON-LD. No price, ratings, release platforms, or customer claims are invented. SoftwareApplication markup describes the app; it does not claim eligibility for Google’s software rich result, which requires additional real commercial/review data.

Images have dimensions and descriptive alt text. The hero and local display font are prioritized; below-fold screenshots are lazy-loaded. Keyboard focus, skip link, native disclosure semantics, manual platform selection, and reduced-motion styling are included. Lighthouse/field Core Web Vitals have not been measured; the page makes no performance score claims.

Primary guidance: [Google SEO developer guide](https://developers.google.com/search/docs/fundamentals/get-started-developers), [SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app), [GitHub Releases API](https://docs.github.com/en/rest/releases/releases).
