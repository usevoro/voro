# Development and architecture

## Brand system

The interface uses a game-jam artbook identity: deep plum navigation, a curious sprout mascot, Bricolage Grotesque headings, DM Sans controls, apricot accents, and painted miniature-world key art. Neutral model stages and rounded selection outlines keep review tasks clear. The same system covers first run, the gallery, viewer, reviews, and settings.

Open the [visual brand guide](../brand/index.html) for logos, palette, typography, voice, and examples. The [suite README](../brand/README.md) explains the export formats and licenses; [DESIGN.md](../DESIGN.md) records the implemented system. Edit `brand/tokens.css` and `brand/identity.json` as the canonical sources.

```sh
npm run brand:build    # Regenerate logos, icon, presentation cover, token JSON
npm run brand:capture  # Capture desktop and minimum-size workflows using synthetic assets
```

VORO is the display name. The original bundle identifier, `asset-reviewer` package name, storage directories, sidecar schema, and environment-variable names remain compatible, preserving existing projects and drafts.

The app bundles fonts and artwork locally. The native macOS icon is included when packaging. Review captures live in `.impeccable/review/`; brand source files and review metadata are excluded from the packaged app.

## Run

Use **Node.js 22.13 or newer in the 22.x LTS line** (`nvm use`). Node 26 can build and run the app, but the current Forge ZIP extraction dependency silently exits during packaging on Node 26; use Node 22 for packaging.

```sh
npm ci
npm start
```

Choose **Open folder**. GLB/glTF assets get cached thumbnails and an interactive preview. FBX, OBJ, USD variants, and Blender files remain reviewable catalog entries with an explicit unsupported-preview state.

To generate a sample project without touching existing assets:

```sh
npm run fixtures -- /tmp/asset-reviewer-sample
```

Open that folder in the app. The sample includes furniture, objects, animation, an external buffer/texture, and deliberate failure cases.

## Workflow

- Use folder carets to expand or collapse the project and nested branches; click folder names to filter assets. Collapsing keeps the active filter and nested disclosure state during scans.
- Search filenames or relative paths; filter by folder, status, format, comments, and preview availability; sort by name, path, or modification time.
- Select a card to open a large preview with notes beside it. Use **Compact view** to browse the gallery alongside the inspector, or **Back to assets** to return. Drag to orbit, right-drag to pan, scroll to zoom. Frame, wireframe, background, and animation controls are below the viewer.
- **Filters → Preview available** hides queued, failed, and unsupported previews. Assets appear as their previews finish.
- **Export reviews** saves all cataloged project reviews to a portable JSON file, independent of gallery filters. Device-only drafts are excluded; unreadable and orphaned notes are reported in the export. See the [review format and JSON Schemas](REVIEW_FORMAT.md).
- Add/edit/delete comments and choose Unreviewed, Needs changes, or Approved. Saves are explicit and report their result.
- Drafts stay on this device across selection changes and restarts. External review changes preserve drafts and ask you to load the latest review before saving.
- Project settings control exclusions, explicitly authorized external dependency folders, and the thumbnail cache. A rescan button recovers missed watcher events.
- Scan notices list skipped symlinks, errors, and orphaned notes. Explicit reattachment copies an orphan to the selected asset and preserves the orphan as a recovery copy.

Keyboard: **⌘/Ctrl F** focuses search; arrow keys move between focused cards; **Enter/Space** opens a card; **Escape** closes inspection or dialogs; **⌘/Ctrl Enter** submits a comment.

## Persistence and security

Reviews use the PRD's version 1 JSON schema and naming convention, for example `.chair.glb.notes.json`. The full filename avoids extension collisions. Saves are serialized, revision-checked, flushed to a same-directory temporary file, and atomically renamed. Invalid/unknown-version notes are preserved. The correctly named sidecar is authoritative after an external rename; its stored UUID retains review identity. Duplicate UUIDs remain separate by source path and produce a notice.

SQLite and the 512 MB thumbnail cache live in Electron's `userData` directory (normally `~/Library/Application Support/asset-reviewer` in development). Deleting them does not delete saved reviews. Drafts live in the UI's local storage in the same application-data directory and are not shared with the project.

The main process owns native dialogs and validates a narrow IPC API. Scanning, SQLite, dependency indexing, and sidecar I/O run in an Electron utility process. The UI and hidden thumbnail renderer are sandboxed with Node integration disabled. Canonical resource paths must fall inside the project or explicitly granted resource folders. Network requests, unexpected navigation, window creation, and permission requests are blocked.

KTX2/Basis requires generated JavaScript bindings. Only its **static bundled worker** has `unsafe-eval` in its own CSP; UI renderers do not. Draco and Meshopt are bundled locally too. No model content is evaluated as JavaScript.

## Build and verify

```sh
npm run typecheck
npm test
npm run test:e2e
npm run package
npm run make
```

Forge packages the current architecture. ZIP makers are enabled for macOS, Windows, and Linux. Cross-built archives are early access and do not imply native runtime validation; see [downloads](DOWNLOADS.md). SQLite uses Electron's bundled `node:sqlite`, so there is no separate native SQLite addon to rebuild.

To run the same smoke tests against the packaged macOS executable:

```sh
ASSET_REVIEWER_EXECUTABLE="$PWD/out/VORO-darwin-arm64/VORO.app/Contents/MacOS/VORO" npm run test:e2e
```

The native directory picker is stubbed to temporary fixtures in automated tests. Rendering, sandboxing, IPC, processes, files, watchers, saves, and restarts are real. Screenshots are written to `test-results/`.

```sh
npm run benchmark
```

This creates and removes a temporary 10,000-asset / 50,000-file fixture and records catalog measurements in `docs/benchmark.json`. It is not a representative rendering or scrolling benchmark.

See [implementation and validation notes](IMPLEMENTATION.md) for tested formats, limits, and remaining release gates.
