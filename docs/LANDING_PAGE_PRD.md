# VORO landing page and downloads — PRD

Status: planned; no website or public release is deployed by this document.  
Owner: VORO / `usevoro` on GitHub.  
Date: September 8, 2026.

## 1. Outcome

Give game developers and 3D artists a clear introduction to VORO, demonstrate its review workflow, and get visitors to the right desktop download. Make the GitHub project, release history, and genuine star count easy to find.

The page should feel like a game-jam artbook: expressive, warm, and made by people who care about small details in game worlds. It must show a useful working product as prominently as its identity.

Primary action: download a supported build. Secondary actions: explore the workflow, visit GitHub, star the project, and read release notes. No account or email signup is needed to download.

## 2. Verified starting point

- VORO is an offline Electron application for local 3D asset review.
- GLB/glTF have thumbnails and interactive previews. Other cataloged model formats can receive reviews, but do not have preview adapters.
- The app supports full and compact previews, folder navigation, filters, review status, comments, local draft recovery, and portable JSON exports.
- The source repository is private. Its current package license is `UNLICENSED`; publishing source and selecting a license are separate decisions.
- There are no GitHub Releases yet. The existing macOS Apple Silicon package is a locally validated, unsigned development build.
- Forge currently produces a macOS ZIP. Windows, Linux, and Intel Mac distribution are not validated release capabilities.
- The brand suite already supplies the sprout mascot, lowercase wordmark, fonts, palette, and painted miniature-world artwork.

These facts constrain launch copy. Do not advertise “open source,” signed installers, universal format support, or downloads that do not exist.

## 3. Audience and jobs

| Audience                              | Job the page must support                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Indie developers and game-jam teams   | Understand how VORO fits beside an existing project folder and get started quickly.         |
| 3D artists and technical artists      | See the viewer, review notes, supported formats, and how feedback stays with source files.  |
| Developers evaluating or contributing | Find the actual GitHub repository, release notes, documentation, and issue reporting route. |

Within the first screen, visitors should understand that this is a desktop tool for reviewing local 3D assets. A mobile visitor should be able to explore the product and find desktop downloads without receiving an incompatible automatic download.

## 4. Scope

### Required for the first public website

- Responsive landing page with an artsy VORO identity and real product imagery.
- A downloads section showing macOS, Windows, and Linux, with architecture and availability for each target.
- Explicit version, release channel, minimum OS requirement, file type, and file size for available downloads.
- GitHub organization link, public project link when available, release notes, documentation, and an appropriate issue-reporting link.
- Real GitHub star count when a public canonical repository is configured, with a resilient fallback.
- Accessible navigation, keyboard controls, readable contrast, reduced-motion support, and basic search/social metadata.
- A small, documented release-data contract so the page can be maintained without editing scattered links.

### Outside this work

Desktop feature changes, Linear/Jira integration, accounts, cloud review storage, payments, email capture, a blog/CMS, community chat, automatic updates, app-store distribution, and publishing any repository or binary. Build/signing/release automation is a prerequisite workstream, not an implied completed feature.

## 5. Page structure and proposed copy

1. **Header:** sprout wordmark; Workflow, Downloads, and GitHub navigation; compact download action. The GitHub action may include the verified star count.
2. **Hero:** “Small details. Bigger worlds.” Supporting line: “A little room to explore your 3D assets, leave feedback, and get back to making games.” Include “A local 3D review workspace” nearby so the purpose is explicit. Primary action selects the appropriate available platform or opens Downloads. Secondary action goes to the public GitHub project or organization.
3. **Product demonstration:** a generous real screenshot of the full preview and review panel, using shareable sample assets and sanitized paths. A short optional video can show orbiting a model, leaving a note, and filtering the collection; provide controls, captions where relevant, and a static fallback.
4. **Workflow:** three concise steps—Open your folder; Find the detail; Leave a useful note. Show concrete UI details instead of generic feature-card filler.
5. **Why it fits:** local/offline use, no importing requirement, notes saved beside assets, and AI-readable JSON export. Describe export as structured data, not an existing AI or issue-tracker integration.
6. **Downloads:** all target platforms and architectures with their actual release state. Keep this accessible through a stable `#downloads` anchor.
7. **FAQ:** supported formats; where notes are stored; whether an account is needed; operating-system support; what JSON export includes; how to report a problem.
8. **Footer:** VORO identity, organization/project links, releases, docs, issue reporting, and published license/privacy information when those exist.

Copy is proposed for implementation, not a claim that every platform is already available. Do not add fabricated testimonials, adoption numbers, customer logos, or “trusted by” sections.

## 6. Visual direction

Reuse `brand/tokens.css`, `brand/identity.json`, and `brand/art/little-world.png`. Use Bricolage Grotesque for expressive short headings and DM Sans for body copy and controls. Preserve the sprout mascot, plum, apricot, butter, lilac, and warm-paper palette.

The painted world introduces the mood; actual app screenshots establish credibility. Keep 3D asset stages neutral. Give the composition an editorial rhythm, generous whitespace, and deliberate changes of scale. Avoid a generic SaaS dashboard hero, glowing technical grids, excessive pills, or a repetitive wall of identical cards.

The website is responsive even though the product is a desktop app. Review at 360, 768, and 1440 CSS pixels. On narrow screens, stack the hero and screenshots and use a readable download list. Long filenames, versions, and platform names must not collide with controls. Preserve the app’s corrected select-arrow gutter if selects are used.

## 7. Platform downloads

### Proposed target matrix

| Target                      | Proposed public package                             | Current evidence          | Enable download when                                                                       |
| --------------------------- | --------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| macOS Apple Silicon / arm64 | Signed and notarized DMG; ZIP may be an alternative | Local unsigned ZIP tested | Signing/notarization, minimum OS, install/launch checks, and public release asset verified |
| macOS Intel / x64           | Signed and notarized DMG or clearly labeled ZIP     | Not validated             | Native build and install/launch checks pass on the stated supported OS                     |
| Windows / x64               | Signed installer `.exe`                             | Not implemented           | Maker, signing, installation/uninstallation, and app workflow validated                    |
| Linux / x64                 | AppImage; `.deb` can be added later                 | Not implemented           | Package and runtime dependencies validated on named distributions                          |

Windows/Linux ARM64 are not promised in the first launch. They can be added through the same manifest after testing. Minimum OS versions and signing identities must be settled before a target becomes available.

All three operating-system sections appear from day one. An unavailable target says “Not available yet” with a short explanation; it does not expose a dead Download button or invent a delivery date. If every target is unavailable, the hero action reads “View platform availability.” An approved early-access release must be labeled explicitly and not silently substituted for stable.

### Download behavior

- Detect the OS only as a suggestion. Never auto-download or redirect on page load.
- If the architecture cannot be established reliably, ask the visitor to choose it. Do not infer Apple Silicon from a generic macOS browser user agent.
- Keep all alternatives visible and reachable. On mobile and unknown devices, show “View desktop downloads.”
- Use the release asset’s verified `browser_download_url`, not a guessed filename or a CI artifact URL requiring authentication.
- Show per-target version/channel when platform releases differ; never label an older platform binary with a newer global version.
- Include release notes and a checksum link beside downloads. Show human-readable file sizes and the actual package type.
- Successful click means navigation to/download from the asset URL. It is not evidence that installation succeeded.
- Links remain normal anchors and work without client-side JavaScript.

GitHub exposes release metadata and browser download URLs through its [Releases API](https://docs.github.com/en/rest/releases/releases). The implementation must distinguish published assets from drafts and prereleases.

## 8. GitHub visibility and star count

Canonical organization: `https://github.com/usevoro`. Application repository: `https://github.com/usevoro/voro`, transferred from Domogo and still private. The organization uses the VORO display name and the existing app icon.

The public website must not link anonymous visitors to inaccessible private source or release assets. Before public download launch, choose one of these models:

1. **Public application repository:** explicitly approve making the source public, choose a license, and publish release assets there. This is the simplest route for direct source links and a meaningful project star count.
2. **Private source with a public distribution repository:** keep `usevoro/voro` private and explicitly create an approved public companion for downloads, release notes, and issue reporting. Any displayed star count belongs to that companion and must be labeled accordingly. Do not call it the source repository.

Until a public target exists, link to the organization and omit project stars/download links. This PRD does not authorize changing repository visibility.

For a configured public repository, read `stargazers_count` from GitHub’s [repository endpoint](https://docs.github.com/en/rest/repos/repos#get-a-repository). Show the real integer, including zero. A compact number may be displayed above 1,000, with the exact value in the accessible label. “Star on GitHub” opens the canonical repository; the visitor chooses whether to star it there. There is no in-site OAuth or automatic starring.

Refresh metadata server-side or at build time, with a proposed one-hour cache. Do not make each visitor query GitHub directly. On timeout, rate limiting, or error, keep the last known count for up to 24 hours; after that, hide the number and retain the GitHub link. A failed fetch must never appear as zero. Cache behavior and refresh intervals are product choices designed around GitHub’s [API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## 9. Release-data contract and implementation approach

Prefer a statically rendered site with minimal client-side JavaScript. Reuse the existing brand source files rather than duplicating tokens. A `site/` directory in this repository is a reasonable starting point; hosting provider and domain remain implementation decisions.

Maintain one validated release manifest with:

- `schemaVersion`, `generatedAt`, organization URL, public project URL, docs/issues URLs.
- Per-platform/architecture entries: `status` (`available`, `planned`, `unavailable`), `version`, `channel`, `minimumOS`, package type, byte size, download URL, release-notes URL, checksum URL, signing status, and verification time.
- Optional star data: exact `count`, `fetchedAt`, and canonical repository URL.

Keep intended platform support in reviewed configuration; derive available asset metadata from published releases. Never enable a download solely because a filename looks plausible. Validate HTTPS URLs and the approved release host/repository, match platform and architecture explicitly, and reject duplicates or incomplete available entries.

Fetch releases during a deployment/build or bounded server refresh, not inside each visitor’s browser. A maintainer can withdraw a target in the manifest if a binary is broken. GitHub failure must not erase known-good links or break the page. If availability cannot be verified for a new release, retain the last verified version or show the unavailable state.

No tokens belong in browser bundles, HTML, or downloadable JSON. Static preview deployments must use sample/public metadata and must not expose private repository data. Direct GitHub release downloads are preferred over running a custom binary proxy.

## 10. Quality, accessibility, and privacy

- Semantic headings, visible keyboard focus, descriptive link labels, usable touch targets, and no hover-only information.
- Normal arrow cursor on reading text; text cursor only in editable fields. Respect reduced motion and avoid autoplaying decorative movement.
- Optimized responsive artwork, explicit image dimensions, lazy-loaded below-the-fold images, self-hosted fonts, and no initial Three.js viewer bundle.
- Proposed launch budgets: LCP ≤2.5 seconds, CLS ≤0.1, and INP ≤200 ms at the 75th percentile when field data becomes available. Use a mobile throttled lab check before traffic exists; label lab results as such.
- Include a descriptive page title, metadata, canonical URL, favicon, and a branded social-sharing image. Only declare supported platforms/version in structured metadata when verified.
- No analytics provider is required for v1. If approved later, measure aggregate download-link clicks, platform selections, GitHub clicks, and release-note clicks without collecting local file paths or asset/review content. Do not claim “zero tracking” before auditing the chosen host and analytics configuration.
- QA includes a signed-out browser, keyboard-only use, screen-reader labels, disabled/zero/stale star states, broken metadata, long copy, and mobile download selection.

## 11. Acceptance criteria

1. A new visitor can explain what VORO does and find the appropriate platform section from the first screen.
2. macOS, Windows, and Linux appear, with truthful per-architecture availability. Every enabled download resolves anonymously to the correct verified binary.
3. Missing targets, drafts, prereleases, malformed metadata, and unknown architectures never produce misleading stable download buttons.
4. Repository, documentation, release-note, and issue links are public and valid wherever shown.
5. Star count matches the configured repository; zero, stale, unavailable, and API failure states follow the rules above.
6. Core content and download links work without JavaScript. API failures do not prevent navigation.
7. The site uses the existing artbook identity and real sanitized product images, with no unsupported feature or open-source claims.
8. The page has no horizontal overflow at the three review widths, is fully keyboard usable, and remains usable with reduced motion.
9. A release update changes the relevant download metadata without manually editing links in multiple components.
10. No private source, contact details, credentials, unpublished binaries, or user project screenshots are inadvertently published.

## 12. Delivery plan and launch decisions

**Milestone 1 — Release foundation:** settle public-source versus public-distribution model, license, domain, supported OS/architectures, packaging/signing, and publish the first approved release assets. The landing page can be built with truthful unavailable states while this work proceeds.

**Milestone 2 — Landing page:** implement the responsive composition, copy, screenshots, navigation, platform selector, and release manifest. Review desktop and mobile together.

**Milestone 3 — GitHub data:** integrate validated release metadata and cached stars, then verify signed-out access, failures, and no-JavaScript behavior.

**Milestone 4 — Launch review:** verify every artifact on its target OS, complete accessibility/performance/link checks, approve final content, and deploy to the chosen domain. Publishing is a separate action from writing this PRD.

Open decisions: public repository model and license; domain/hosting; minimum OS versions; Intel Mac inclusion in initial downloads; signing credentials; early-access versus stable launch; whether privacy-preserving aggregate analytics is wanted.
