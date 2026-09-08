# README screenshots

`inspection.jpg` and `collection.jpg` show the actual VORO Electron interface at 1480 × 960 logical pixels (2× capture), recorded on September 8, 2026. They were copied from the landing-page capture set in `site/public/images/`.

The capture script, `scripts/capture-site.ts`, generates disposable geometry through `scripts/fixtures.ts`, opens an isolated application profile, and adds illustrative review text. It replaces the displayed temporary machine path with **Little worlds / Assets** before capture. The images contain no user project, proprietary models, account details, or private review content.

To refresh them after a visible app change, run `npm run site:capture` on macOS, inspect the resulting images for private paths and accurate UI, then copy only the relevant screenshots here. The command regenerates the archived site’s capture assets; it does not publish a website. Retain attribution in [third-party notices](../../THIRD_PARTY_NOTICES.md).
