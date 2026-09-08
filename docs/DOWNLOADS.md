# Download VORO early access

**Release publication is on hold while publisher signing is configured.** Local 0.1.0-alpha.1 candidates exist, but no GitHub release has been published yet. The planned early-access packages are described below. These are portable ZIP packages, not automatic installers. There is no auto-updater. Use a copy of your project for early testing and keep saved review files backed up.

| Build               | Runtime baseline             | Validation and signing                                                                          |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| macOS Apple Silicon | macOS 13+                    | Packaged-app smoke suites on Apple Silicon; ad-hoc signed, not Developer ID signed or notarized |
| macOS Intel         | macOS 13+                    | Cross-built and archive-inspected; native Intel testing pending; ad-hoc signed, not notarized   |
| Windows x64         | Windows 10+                  | Cross-built and archive-inspected; native Windows testing pending; unsigned                     |
| Linux x64           | Current 64-bit desktop Linux | Cross-built and archive-inspected; native desktop testing pending; unsigned                     |

The OS baselines follow [Electron 44.2.0](https://github.com/electron/electron/blob/v44.2.0/README.md#platform-support), not a claim that VORO was tested on every listed OS. In particular, Linux needs compatible desktop libraries, a working Chromium sandbox, and graphics support. See release notes for the exact evidence and limitations. Windows ARM64 and Linux ARM64 packages are not included in this first release.

## Install and open

- **macOS:** extract the matching ZIP, move `VORO.app` into Applications, and open it. Because this build is not notarized, macOS may block the first launch. If you trust the downloaded release, use the per-app **Open Anyway** option in System Settings → Privacy & Security. Do not disable Gatekeeper globally. Do not try to run the Intel build on Apple Silicon without Rosetta.
- **Windows:** extract the entire ZIP into a folder, then run `VORO.exe` inside it. Keep the executable beside all its bundled files. SmartScreen may warn because the build has no publisher signature. Native Windows behavior is still experimental.
- **Linux:** extract the ZIP, open the extracted folder in a terminal, and run `./VORO`. Preserve executable permissions. If the system reports a missing shared library or unavailable Chromium sandbox, use a supported desktop environment and report the exact error. Do not run the app as root or disable its sandbox as a workaround.

To update, quit VORO and replace the application folder with a newer release. Project sidecars and application data are separate from the executable; do not delete them during updates.

## Verify the download

Download `SHA256SUMS.txt` from the same release. Compare the matching checksum before opening an archive:

```sh
# macOS
shasum -a 256 VORO-0.1.0-alpha.1-mac-arm64.zip
# Linux
sha256sum VORO-0.1.0-alpha.1-linux-x64.zip
```

```powershell
# Windows PowerShell
Get-FileHash .\VORO-0.1.0-alpha.1-windows-x64.zip -Algorithm SHA256
```

Checksums detect corrupted or changed downloads; they are not publisher signatures. `build-manifest.json` records source commit, Electron version, archive sizes, and hashes. GitHub also displays SHA-256 asset digests.

## Build without hosted CI

With Node 22 and dependencies installed:

```sh
npm ci
npm run release:build
# Or just one target:
npm run release:build -- windows-x64
```

The script writes archives, `SHA256SUMS.txt`, and `build-manifest.json` to `out/releases/<version>/development/`. For Developer ID signed and notarized Mac builds, use `npm run release:mac`; see [publisher signing](SIGNING.md). It builds four targets by default; macOS packaging requires a Mac for ad-hoc signing. The ZIP maker and Windows resource editor support cross-packaging without Wine. Packaging is not native runtime validation. The command never publishes or enables Actions.

Before publishing, merge the source PR, rebuild from clean `main`, run native checks where available, inspect archives and licenses, verify checksums, and publish a GitHub prerelease at that exact source commit. Do not publish a manifest with `sourceDirty: true`. Preserve an existing release’s artifacts; use a new version for replacements. Update the website manifest only after the release assets are publicly accessible.
