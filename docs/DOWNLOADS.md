# Download VORO early access

[Version 0.1.0-alpha.1](https://github.com/usevoro/voro/releases/tag/v0.1.0-alpha.1) is available for Mac. Both builds are signed with Developer ID, notarized by Apple, and include stapled notarization tickets. The publisher is **Tapija d.o.o.**

| Download                                                                                                               | Requirements               | Validation                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Apple silicon ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-mac-arm64.zip) | macOS 13+, Apple silicon   | All four packaged-app workflow tests passed on the final archive.                                       |
| [Intel ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-mac-x64.zip)           | macOS 13+, Intel processor | Cross-built; archive, signature, ticket, and Gatekeeper verified. Native Intel runtime testing pending. |

The macOS baseline follows [Electron 44.2.0](https://github.com/electron/electron/blob/v44.2.0/README.md#platform-support); it is not a claim of testing every supported OS version. Intel is an experimental cross-build. Windows and Linux candidates exist locally but are **not published**; Windows publisher signing still needs a separate certificate/service, and native Windows/Linux runtime validation is outstanding.

## Install and update

1. Download the ZIP matching your Mac's processor and verify its checksum below.
2. Extract the ZIP and move `VORO.app` to Applications.
3. Open VORO. macOS may show its normal first-open confirmation for a downloaded application; no Gatekeeper bypass is part of the installation.

These are portable ZIP packages, not automatic installers. There is no auto-updater. To update, quit VORO and replace the app with the newer version. Do not delete project sidecars or application data. Use copies of important projects during early access and keep saved reviews backed up.

## Verify the download

Download [SHA256SUMS.txt](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/SHA256SUMS.txt) from the same release. Compare the matching checksum before opening the archive:

```sh
shasum -a 256 VORO-0.1.0-alpha.1-mac-arm64.zip
# For Intel:
shasum -a 256 VORO-0.1.0-alpha.1-mac-x64.zip
```

Checksums detect corrupted or changed downloads; publisher verification comes from the app's Developer ID signature and notarization. [build-manifest.json](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/build-manifest.json) records the exact source commit, Electron version, archive sizes, signing status, and hashes. GitHub also provides SHA-256 asset digests.

Both final archives passed strict signature, stapled-ticket, and Gatekeeper checks. Apple accepted both submissions with no reported issues. The release tag identifies the code used for the binaries; later documentation changes on main do not change those artifacts.

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
