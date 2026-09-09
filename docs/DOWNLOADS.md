# Download VORO early access

[Version 0.1.0-alpha.1](https://github.com/usevoro/voro/releases/tag/v0.1.0-alpha.1) includes Mac, Windows, and Linux ZIP archives. Mac builds are Developer ID signed and Apple-notarized. Windows and Linux are **unsigned experimental cross-builds**.

| Download                                                                                                               | Requirements              | Validation                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Apple silicon ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-mac-arm64.zip) | macOS 13+, Apple silicon  | Signed/notarized; all four packaged-app workflow tests passed on the final archive.                                            |
| [Intel Mac ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-mac-x64.zip)       | macOS 13+, Intel          | Signed/notarized; signature, ticket, and Gatekeeper checked. Native Intel runtime testing pending.                             |
| [Windows x64 ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-windows-x64.zip) | Windows 10+, x64          | Unsigned; ZIP, PE architecture, bundled app, notices, and checksums verified. Native runtime testing pending.                  |
| [Linux x64 ZIP](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/VORO-0.1.0-alpha.1-linux-x64.zip)     | Current x64 desktop Linux | Unsigned; ZIP, ELF architecture/executable mode, bundled app, notices, and checksums verified. Native runtime testing pending. |

The runtime baselines follow [Electron 44.2.0](https://github.com/electron/electron/blob/v44.2.0/README.md#platform-support); this does not mean VORO was tested on every supported OS. Linux requires compatible desktop libraries, graphics support, and a working Chromium sandbox. Intel Mac, Windows, and Linux are experimental until native runtime testing is completed. An earlier Linux launch attempt under local x64 container emulation exited with code 137 and did not establish runtime compatibility. Windows/Linux ARM64 packages are not included.

## Install and update

- **Mac:** extract the ZIP for your processor, move `VORO.app` to Applications, and open it. The publisher is **Tapija d.o.o.** Both Mac builds include stapled notarization tickets. No Gatekeeper bypass is part of installation.
- **Windows:** extract the entire ZIP to a folder and run `VORO.exe`. Keep it beside the bundled resources. This archive has no Authenticode publisher signature, so Windows/SmartScreen may show an unknown-publisher warning. A trusted Windows signing certificate/service is not yet provisioned.
- **Linux:** extract the ZIP while preserving executable permissions and run `./VORO` from the extracted folder. If desktop libraries or the Chromium sandbox are unavailable, report the error with your distribution/version; do not run as root or disable the sandbox as a workaround.

These are portable archives, not installers. There is no auto-updater. To update, quit VORO and replace the application folder. Do not delete project sidecars or application data. Use copies of important projects during early access and keep saved reviews backed up.

## Verify the download

Use the checksum file that matches your platform:

- [SHA256SUMS.txt](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/SHA256SUMS.txt) covers the original two Mac archives.
- [SHA256SUMS-windows-linux.txt](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/SHA256SUMS-windows-linux.txt) covers the added Windows and Linux archives.

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

Compare the result with the corresponding line in the checksum file. Checksums detect corrupted or changed downloads; they do not provide a trusted publisher signature for unsigned builds. GitHub also provides SHA-256 asset digests.

[build-manifest.json](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/build-manifest.json) covers Mac; [build-manifest-windows-linux.json](https://github.com/usevoro/voro/releases/download/v0.1.0-alpha.1/build-manifest-windows-linux.json) covers Windows/Linux. Both identify the same clean release source commit, `8717312549d227db815aa7336b6f26e27a38120c`. Existing Mac archives and their metadata were retained unchanged when adding platforms.

Both Mac archives passed strict signature, stapled-ticket, and Gatekeeper checks, and Apple accepted them with no reported issues. No equivalent publisher-signature claim applies to Windows or Linux.

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
