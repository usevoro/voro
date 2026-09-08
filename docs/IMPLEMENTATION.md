# Implementation and validation

## Implemented

- Electron shell, native folder selection, persisted recent projects, single instance.
- SQLite utility-process catalog, paginated queries, progressive recursive scans, cancel/rescan, exclusions, symlink reporting, debounced watching, dependency indexing, and resume reconciliation.
- Virtualized image grid, search/filter/sort, folder/status counts, keyboard controls, explicit loading/error states, retry and reveal actions.
- GLTF format adapter, orbit/pan/zoom/frame, preview background and wireframe controls, per-instance geometry statistics, animation selection/play/pause.
- One hidden thumbnail renderer, bounded queue prioritizing the visible/selected assets, generation checks, timeout/restart behavior, resource disposal, disk cache and eviction.
- Versioned sidecars, comment create/edit/delete, review status, optimistic conflict protection, draft persistence, malformed/read-only protection, external-note detection, explicit orphan reattachment.
- Root-scoped protocol, symlink canonicalization, explicit/revocable resource-folder grants, sandboxed renderers, IPC validation, offline decoders and network blocking.

## Verified build

On September 8, 2026, the macOS arm64 build passed:

- TypeScript type checking and repository formatting checks.
- Eight filesystem/catalog integration tests.
- Three end-to-end suites in both development and the packaged `.app`: the review/restart workflow, offline Draco/Meshopt/KTX2 rendering, and resource grants/thumbnail crash recovery/comment deletion.
- Forge packaging and ZIP creation using Node 22.23.2 and Electron 44.2.0.
- Runtime dependency audit with zero reported vulnerabilities.

Build outputs are in `out/VORO-darwin-arm64/` and `out/make/zip/darwin/arm64/`. The GitHub Actions workflow reproduces the macOS checks; it has been configured but has not been run remotely from this local folder.

## Format validation matrix

| Capability                          | Fixture and current evidence                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GLB 2.0 static meshes               | Generated chair, table, stool, lamp, sphere, knot and vessel; thumbnails and interactive viewing       |
| glTF 2.0 external buffer and PNG    | Generated cube, spaces and `#` in filename, referenced buffer and image                                |
| Animations                          | Generated quaternion turntable; clip selection and playback                                            |
| `KHR_draco_mesh_compression`        | Generated compressed knot; local decoder, thumbnail and viewer                                         |
| `EXT_meshopt_compression`           | Generated compressed vertex streams; local decoder, thumbnail and viewer                               |
| `KHR_texture_basisu`                | Generated cube with a CC0 Microsoft FlightHelmet KTX2 texture; local transcoding, thumbnail and viewer |
| Missing/malformed inputs            | Missing external buffer, invalid GLB header, malformed sidecars, stale revisions                       |
| FBX, OBJ, USD/USDA/USDC/USDZ, BLEND | Catalog and notes only; no preview support claim                                                       |

Three.js may support additional glTF extensions. They have **not** been validated here; this is not a claim of complete glTF conformance. Skinning, morph targets, HDR materials, exporter-specific behavior, large animation sets, and representative production assets still require sample-based testing. The KTX2 adapter uses Three.js worker internals, so keep the decoder smoke tests when updating Three.js.

## Deliberate limits

- Automatic and interactive previews reject source files above 256 MB, metadata JSON above 32 MB, and loaded scenes above 10 million vertices. Preview timeout is 30 seconds. These initial safety limits are fixed pending real-asset measurements.
- Statistics count positions and indexed/nonindexed triangle elements for each mesh instance. Shared geometry is counted again per instance. They describe the preview scene, not authoring-tool topology.
- Background lighting uses bundled-code hemisphere/directional studio lights. It does not reproduce an authoring application's environment.
- Cache invalidation includes the project/path, source and dependency size/mtime/ctime, and preview pipeline version/settings. It does not hash every source/dependency file; metadata-preserving edits can require clearing the cache.
- Sidecar protection is optimistic, not cross-process compare-and-swap. Sync clients can still race the final rename. Read-only detection and atomic replacement need platform-specific validation beyond macOS.
- Orphan reattachment retains the original as a recovery copy, so the orphan remains listed until the user manages it externally. The app never guesses matches.
- Only local relative dependency URIs (plus embedded data) are supported. Absolute file URIs and network references remain blocked, even with additional directory grants.
- Current thumbnails use a fixed studio camera/lighting. No asset editing, relocation, cloud collaboration, authorship, or spatial annotation is included.

## Measurements

`benchmark.json` records a catalog-only run on Apple M5 Max / 48 GB / macOS Darwin 25.6.0, local temporary storage:

- 10,000 repeated chair assets and 50,000 total files.
- First streamed results: about 1.90 seconds.
- Complete cold scan: about 5.59 seconds.
- Warm reopen and first query: about 15.6 ms.
- Search/page query mean: about 16.9 ms, maximum about 31.1 ms.

The recorded Node RSS includes fixture preparation and watcher/catalog allocations. It is **not** an isolated application or GPU memory budget. Do not extrapolate thumbnail throughput from the repeated small mesh. A sustained 60 fps scroll check, real-asset thumbnail throughput, and selection/GPU memory stress measurements remain release work.

## Release gates

1. Validate the user's real project formats, exporter versions, storage locations, asset complexity, and preview expectations.
2. Agree on minimum macOS version/CPU targets and establish a measured application/GPU memory budget.
3. Run longer GPU crash/large-model stress, read-only/network-share/sync-folder checks, and representative screenshot comparisons.
4. Run platform smoke tests on Windows and Linux before enabling their release makers; Windows hidden attributes and filesystem semantics need native validation.
5. Supply signing/notarization credentials for a distributable signed macOS release. Current app is an unsigned local development build.
6. Recheck dependency advisories before distribution. Runtime dependencies audit clean on the implementation date. Forge's current development dependency chain still reports advisories through `extract-zip`; tar/tmp overrides remove the reported critical tar and tmp findings. Do not force a Forge downgrade as an audit workaround.

The original PRD is unchanged. M0's real-asset and hardware decisions cannot be closed from synthetic fixtures alone.
