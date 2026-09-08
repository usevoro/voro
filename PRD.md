# Asset Reviewer — Product Requirements Document

Status: Ready for implementation planning; asset-format assumptions require validation
Date: 2026-09-08
Working name: Asset Reviewer
Architecture: Electron desktop application
Release approach: macOS first, with Windows and Linux supported by the architecture

## 1. Purpose

Build a local desktop application for browsing and reviewing 3D assets inside existing project folders. A user opens a folder, the app recursively catalogs its assets, and a thumbnail grid makes them easy to inspect. Each asset has an interactive viewer and persistent comments describing required changes.

The app works directly with the existing folder structure. It does not require importing a project into a managed library, uploading files, or modifying source assets. Review notes live in a small sidecar file beside each reviewed asset so they can travel with the project.

## 2. Users and primary workflow

The initial user is an individual reviewing assets in their own projects. Notes may later be shared through the project's existing Git, file-sharing, or sync workflow. Real-time collaboration is outside the first release.

Primary workflow:

1. Select **Open Folder** using the native directory picker.
2. See assets appear progressively as the app scans the root and all included subfolders.
3. Search and filter the thumbnail grid.
4. Select an asset to inspect it in an interactive 3D viewer.
5. Add a comment such as “Reduce polygon count on the chair legs” and set its review status.
6. Continue to the next asset using the keyboard or grid.
7. Reopen the project later and recover its comments and review statuses.

## 3. Product decisions and assumptions

| Decision | Initial direction |
| --- | --- |
| Desktop framework | Electron |
| UI | React and TypeScript |
| 3D renderer | Three.js, initially using WebGL2 |
| Build tooling | Vite for the UI; Electron Forge for packaging and distribution |
| Catalog | SQLite in the platform's application-data directory |
| Thumbnail storage | Disk cache outside the opened project |
| Notes | Versioned JSON sidecar per reviewed asset |
| Network requirement | None for scanning, viewing, or commenting |
| Launch platform | macOS; design and test for Windows and Linux as described below |
| MVP formats | GLB and glTF, subject to validating the user's real projects |

Actual asset formats, project sizes, minimum OS versions, and supported CPU architectures are not yet confirmed. Do not treat FBX, OBJ, USD, Blender, or engine-specific formats as working merely because their extensions are recognized. Validate representative assets before committing to the first release's format list.

## 4. Scope

### MVP requirements

- Open a directory and remember recent project roots.
- Recursively discover supported 3D files without moving or rewriting them.
- Show scan progress, discovered counts, errors, and a cancel action.
- Display a virtualized grid of cached thumbnails with filename, relative path, format, and review status.
- Search filenames and relative paths; filter by format, subfolder, review status, and presence of comments.
- Sort by filename, relative path, or modification time.
- Open a selected asset in an orbitable, zoomable, pannable 3D viewer.
- Frame/reset the camera, toggle wireframe, choose light/dark background, and show basic geometry statistics.
- Play/pause and select animation clips when the supported file exposes them.
- Add, edit, and delete comments, with created/updated timestamps.
- Set review status to **Unreviewed**, **Needs changes**, or **Approved**.
- Persist comments/status beside the asset and detect external changes.
- Watch the project for additions, updates, removals, and note changes.
- Reveal a source file in the operating system's file manager.
- Recover gracefully from unsupported, malformed, missing, or excessively costly assets.

### Explicitly outside MVP

- Editing meshes, materials, textures, or source assets.
- Cloud accounts, uploads, notifications, permissions, or live multi-user editing.
- Spatial comment pins, annotation drawing, or frame-specific comments.
- Native Blender, Unity, Unreal, or CAD project interpretation.
- Guaranteed visual equivalence to an asset's authoring tool or game engine.
- Batch format conversion, duplicate detection, asset relocation, or rename tools.
- Automatic updater infrastructure and plugin marketplaces.

## 5. User experience

### Window layout

- Toolbar: Open Folder, current project, search, filters, sort, and scan activity.
- Left sidebar: folder tree and review-status counts.
- Center: asset grid; selecting an asset opens an inspection area with its 3D view.
- Right inspector: filename/path, metadata, review status, and comment history/editor.
- Status area: scan/thumbnail progress and actionable errors.

The grid remains useful before all thumbnails are ready. Each card has an explicit state: queued, generating, ready, unsupported, or failed. Failures include a concise reason and retry action. Files that cannot be previewed remain cataloged and can still receive comments.

Keyboard navigation supports moving between cards, opening an asset, closing inspection, and focusing search. Controls have accessible labels and visible focus states. An unsaved comment draft must not disappear when selection or project changes; preserve it or request a decision before discarding it.

### Folder behavior

- Traverse all readable subfolders except declared exclusions.
- Default exclusions include version-control internals, dependency/build caches, and this app's generated files. Display exclusions in project settings and allow adjustment.
- Do not follow directory symlinks by default; report skipped links to avoid loops and unexpected traversal outside the chosen root.
- Continue after permission errors and report affected paths.
- Recognized model files become asset records. Referenced textures and buffers are dependencies, not separate 3D cards.
- Treat extension matching case-insensitively while preserving actual path spelling and platform path semantics.
- For glTF, list a missing texture or buffer as a dependency error with its relative path.

## 6. Rendering and format support

Use a format-adapter interface so additional formats can be introduced without changing catalog or notes behavior. Each adapter declares supported extensions, metadata extraction, dependency resolution, loading, and known limitations.

The first adapter supports GLB/glTF through Three.js GLTFLoader. Package any required Draco, Meshopt, and KTX2 decoding resources locally. Document the exact supported extensions and test them against fixtures; do not claim full glTF-extension coverage.

Preview defaults use a neutral environment, consistent lighting, automatic camera framing, and preserved source scale/orientation. Background and wireframe controls affect the preview only. Count triangles and vertices using a documented convention, and label statistics as preview-derived when that matters.

FBX and OBJ are subsequent candidates after testing real project files. USD and .blend require a separate import/conversion design if demanded by the user's projects. Any future converter runs in a child process with cancellation and timeout support, writes only to the app cache, and never overwrites originals.

Use image thumbnails in grid cells, not a live WebGL context per card. Keep one active interactive viewer and a bounded thumbnail-generation queue. Prioritize visible cards and the selected asset, dispose GPU resources when assets are unloaded, and release bitmap/texture resources explicitly.

Texture or buffer changes must invalidate affected previews even when the model file itself is unchanged.

## 7. Electron architecture

### Process boundaries

| Component | Responsibilities |
| --- | --- |
| Main process | Window lifecycle, native dialogs, project authorization, narrowly scoped IPC handlers, job orchestration, custom asset protocol, and sidecar write coordination |
| Preload bridge | Typed, minimal API exposed through contextBridge; no raw filesystem or arbitrary command access |
| UI renderer | React views, virtualized grid, Three.js interactive viewer, comments UI, and user-visible state |
| Catalog utility process | Directory scanning, dependency indexing, filesystem watching, SQLite access, cache bookkeeping, and expensive file hashing |
| Thumbnail renderer | Dedicated hidden sandboxed renderer using Three.js to render queued previews and return encoded thumbnail images |

Keep blocking filesystem work, database work, and CPU-heavy parsing away from the main/UI event loops. GPU rendering runs in a renderer with a graphics context; a Node worker alone is not the thumbnail renderer. Start with one thumbnail job at a time and tune concurrency from measured CPU/GPU/memory behavior.

Use a single application instance for MVP to simplify sidecar and catalog write coordination. A new open-folder request is routed to the existing instance.

### IPC and resource access

Expose explicit operations such as `openProject`, `queryAssets`, `getAsset`, `saveReview`, `retryPreview`, and `revealAsset`. Validate payloads at every trusted boundary. Use opaque project/asset IDs instead of granting arbitrary path operations to renderers.

Resource loading uses a registered local asset protocol that resolves authorized model dependencies relative to their source directories. Canonicalize paths and resolve symlinks before checking access. Handle URL encoding and Windows drive paths deliberately. Block paths outside the authorized root by default; if a project depends on external resources, identify them and let the user explicitly grant access to the additional directory.

Enable context isolation and renderer sandboxing, disable Node integration in renderers, use a restrictive content security policy, and block unexpected navigation/window creation. Display comments as text. Local asset content must not execute scripts or trigger external network fetches. Bundle viewer dependencies and lighting resources so the normal workflow works offline.

### Suggested source layout

```text
src/
  main/                 # Electron lifecycle, IPC, resource protocol
  preload/              # Typed renderer bridge
  renderer/             # React application and interactive viewer
  catalog/              # Scanner, watcher, database, dependency graph
  thumbnails/           # Hidden renderer and queue integration
  formats/              # Format adapters
  shared/               # Schemas, types, IPC contracts
tests/
  fixtures/             # Models, dependencies, sidecars, malformed inputs
  integration/
  e2e/
```

## 8. Catalog, cache, and change detection

SQLite is a rebuildable local index, never the only copy of saved comments. Store project identity/root, asset ID, relative path, format, size, modification time, load state, dependency references, thumbnail cache key, and indexed review fields. Keep caches separate from project files.

Initial scans stream asset batches to the UI. Query grid pages from SQLite instead of transferring the entire catalog. Filesystem events trigger debounced incremental updates, with reconciliation after watcher errors, app resume, and project reopening. Provide a manual rescan action because watcher events can be missed.

Use size/mtime as inexpensive change signals; use content hashes when necessary for ambiguity or validation. Include model/dependency fingerprints, viewer settings, and thumbnail pipeline version in cache invalidation. Never hash the entire project synchronously before displaying results.

Apply a bounded disk-cache policy with least-recently-used eviction and a user-visible clear-cache action. Cache deletion must not remove sidecars. Stop obsolete jobs when switching projects and discard results from stale job generations.

## 9. Notes persistence

### File naming and schema

Example:

```text
models/
  chair.glb
  .chair.glb.notes.json
```

Include the complete source filename, including extension, to avoid collisions between `chair.glb` and `chair.fbx`. Create a sidecar only when the user saves a comment or changes review status. A leading dot hides the file conventionally on macOS/Linux; on Windows, apply the hidden file attribute when available. Failure to apply that attribute must not prevent saving notes.

Example version 1 payload:

```json
{
  "schemaVersion": 1,
  "assetId": "d72c1f5d-d6f6-4ca8-b417-456dc572cdf8",
  "assetFile": "chair.glb",
  "status": "needs_changes",
  "updatedAt": "2026-09-08T10:30:00Z",
  "comments": [
    {
      "id": "0dd4c80d-3545-43bb-baf2-9185d36d981f",
      "text": "Reduce polygon count on the chair legs.",
      "createdAt": "2026-09-08T10:30:00Z",
      "updatedAt": "2026-09-08T10:30:00Z"
    }
  ]
}
```

Use stable UUIDs and UTC ISO timestamps. The filename/path associates a sidecar with its source; the stored asset ID preserves review identity when both files move together. Resolve accidentally duplicated asset IDs deterministically without silently combining unrelated reviews.

### Save and conflict behavior

- Save on explicit comment submission or status change; expose saving, saved, and failed states.
- Serialize writes per asset. Write to a temporary file in the same directory and replace the target atomically using a platform-tested implementation.
- Compare the on-disk revision/hash with the revision originally loaded before saving. If it differs, preserve the draft and require reload or explicit conflict resolution.
- This is optimistic protection, not a guarantee of atomic compare-and-swap against third-party editors or sync clients. Real-time shared editing is outside MVP.
- Reload externally changed notes automatically when there is no local draft. Otherwise preserve both states and surface the conflict.
- Preserve malformed, unsupported-version, or unreadable sidecars without overwriting them. Report a recoverable error.
- In read-only projects, browsing continues and saving is disabled with a clear explanation. Never silently save project notes exclusively in the local cache.
- A source file moved with its correctly named sidecar retains its notes on rescan. If only the source moves or is renamed externally, report orphaned notes and offer explicit reattachment; do not guess based only on filename or content hash.
- Sidecars are eligible for the user's existing version-control workflow. The app does not stage or commit them.

## 10. Performance and resilience targets

These are acceptance targets to measure, not promised framework capabilities. Record the hardware, OS, model complexity, and storage used in benchmarks.

- On a local SSD fixture containing 10,000 candidate assets and 50,000 total files, show initial catalog results within 2 seconds without waiting for thumbnail completion.
- On a warm reopen of that fixture, show cached grid results within 1 second.
- Keep scrolling and input responsive while scanning and generating thumbnails; target 60 fps on the agreed reference machine.
- Reflect a saved comment in the UI immediately and normally persist it within 500 ms on a writable local SSD.
- Reflect ordinary file changes within 2 seconds after the writer finishes and the debounce interval expires.
- Keep memory bounded by grid virtualization, bounded jobs, resource disposal, and cache limits. Establish a measured memory budget in the initial technical spike.
- Time out thumbnail jobs, initially at 30 seconds, and allow explicit retry. Large/complex models may need a configurable limit or manual load.
- A bad asset or crashed thumbnail renderer must not terminate the catalog or lose saved notes; restart the thumbnail renderer and mark the failed job.

GPU/driver faults may affect more than one renderer. Test recovery and surface failures; do not claim complete crash isolation from using separate renderer windows.

## 11. Acceptance criteria

1. Opening a nested fixture discovers every included supported model exactly once, with exclusions and symlinks handled as documented.
2. Assets appear before the scan completes, and canceling the scan leaves already discovered results usable.
3. A 10,000-asset catalog can be searched, filtered, and scrolled without creating a live viewer per card.
4. GLB and glTF fixtures render with their expected textures; supported animation clips can be selected and played.
5. Missing dependencies and unsupported files show useful errors without preventing other assets from loading.
6. Creating, editing, and deleting comments and changing status persist across app restarts through the documented sidecar schema.
7. Deleting the app's database/cache and reopening the project reconstructs reviews from sidecars.
8. External sidecar changes refresh the UI or produce a conflict that preserves the user's draft.
9. Malformed sidecars, read-only directories, and failed writes do not destroy prior notes or misreport a successful save.
10. Updating a referenced texture regenerates its model's thumbnail and invalidates the interactive preview appropriately.
11. Moving an asset with its named sidecar preserves its review; moving the asset alone does not silently attach someone else's notes.
12. Files outside approved roots and external network resources cannot be loaded through crafted model references or renderer IPC.
13. The workflow runs without an internet connection, including decoder-backed supported assets.
14. A packaged macOS build completes the open-folder → inspect → comment → restart workflow. Windows/Linux builds pass the same smoke test before those platforms are advertised as supported.

## 12. Implementation milestones

### M0 — Validate real assets and rendering architecture

Obtain representative project samples and confirm formats, scale, OS targets, and preview expectations. Prototype GLB/glTF loading, root-scoped dependency access, hidden-renderer thumbnails, and GPU cleanup in packaged Electron. Measure a catalog fixture and define the reference hardware/memory budget.

Exit: supported-format matrix and sample results recorded; no unresolved blocker in local loading or thumbnail generation.

### M1 — Project scanning and catalog grid

Build the Electron shell, native directory picker, typed preload API, catalog utility process, SQLite schema, recursive scanner, recent projects, and virtualized searchable grid. Add placeholders and scan/error states.

Exit: nested fixtures scan correctly and the grid meets initial responsiveness targets.

### M2 — Viewer and thumbnail cache

Implement the format adapter, local resource protocol, interactive viewer, thumbnail renderer, disk cache, dependency invalidation, and bounded job lifecycle.

Exit: supported fixtures render offline; failed assets are recoverable; the grid uses cached images.

### M3 — Comments and review status

Implement schema validation, sidecar reads/writes, review UI, indexed filters, external-change detection, conflict handling, and read-only behavior.

Exit: notes survive restarts and full catalog/cache deletion; failure cases preserve existing content.

### M4 — Change tracking and release readiness

Finish watchers/reconciliation, orphan-note handling, accessibility and keyboard flows, performance checks, process recovery, and packaged-app testing. Sign and notarize the macOS distribution when release credentials are available. Rebuild/package native SQLite dependencies for each target architecture.

Exit: all MVP acceptance criteria pass on the initial release target. Produce platform-specific CI builds and record Windows/Linux smoke-test results before enabling their releases.

## 13. Verification strategy

Use focused unit tests for path authorization, sidecar validation/conflicts, cache invalidation, and scan exclusions. Use integration tests with temporary project trees for scanning, watcher reconciliation, SQLite rebuilding, dependency changes, and note recovery. Include Windows-specific paths and hidden-attribute behavior in Windows CI.

Run end-to-end checks against packaged or production-equivalent Electron builds for folder selection, viewer loading, saving notes, restarting, offline decoder loading, and recovery from failed thumbnail jobs. Use representative small, large, animated, compressed, malformed, and missing-dependency assets. Check visual previews against agreed reference screenshots with tolerances for platform rendering differences.

Do not measure thumbnail performance using trivial placeholder meshes alone. Record cold scan, warm reopen, thumbnail throughput, scrolling responsiveness, memory growth after repeated selection, and behavior after the thumbnail process exits unexpectedly.

## 14. Decisions to confirm during M0

- Which file formats and exporter versions are present in the user's projects?
- Typical and largest project file counts, model sizes, texture sizes, and animation complexity.
- Whether macOS-only delivery is sufficient initially and which Windows/Linux environments matter later.
- Minimum OS versions and CPU architectures.
- Whether projects are on local disks, external drives, network shares, or sync folders.
- Whether status/comments alone suffice or named authors and spatial annotations are needed later.

These questions refine implementation and release scope; the agreed Electron architecture and sidecar-notes approach remain the baseline.

## 15. Technical references

- [Electron introduction](https://www.electronjs.org/docs/latest/)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Forge](https://www.electronforge.io/)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Three.js FBXLoader limitations](https://threejs.org/docs/pages/FBXLoader.html)

Select compatible maintained dependency versions during implementation and commit a lockfile. This PRD does not pin unverified package versions.
