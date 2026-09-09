# Publisher signing

Signing is local. GitHub Actions remains disabled. No signing password, private key, API key, or certificate bundle belongs in this repository or in chat.

## macOS: Developer ID and notarization

Distribution outside the Mac App Store uses a **Developer ID Application** certificate, not an Apple Development or App Store distribution certificate. The certificate and matching private key must be installed in this Mac’s Keychain. The Apple Developer team is the publisher shown by the signature; VORO remains the application name.

1. Create a dedicated certificate request on the signing Mac. Keep the private key local; upload only the public CSR to Apple Developer → Certificates → Developer ID Application → G2.
2. Install the issued certificate with its matching private key into the Keychain. Keep a secure backup under your control; never commit it. `security find-identity -v -p codesigning` should list a valid Developer ID Application identity.
3. Store notarization credentials interactively in the Keychain:

   ```sh
   xcrun notarytool store-credentials voro-notary
   ```

   Use the Apple ID/app-specific-password flow or an existing appropriate App Store Connect API key. Enter secrets only in the local secure prompt. The command validates credentials with Apple. Do not put a password in a shell command or environment file.

4. Copy `.env.example` to `.env.signing` and set `VORO_MAC_SIGNING_IDENTITY` to the identity name or certificate SHA-1, and `VORO_NOTARY_PROFILE` to `voro-notary`. These are selectors, not credentials. The local file is ignored by git and is not included in packaged apps.
5. With Node 22, run:

   ```sh
   npm run release:mac
   ```

This preflights the Keychain identity and notarization login, signs both Mac architectures with hardened runtime, submits each app to Apple, and staples the accepted notarization ticket before archiving. Signature, stapled-ticket, and Gatekeeper checks must pass. A missing credential or rejection fails the build; it never falls back to ad-hoc signing.

Distribution artifacts go into `out/releases/<version>/signed/`; development cross-builds go into the separate `development/` directory. Inspect the per-artifact `signing` field in `build-manifest.json`. Only `developer-id-notarized` is a completed Mac distribution build. A local successful build does not replace native runtime testing on the target architecture.

If Keychain requests access for `codesign`, approve access to this dedicated signing key locally. Do not disable Keychain protection or grant unrelated tools access. Notarization can take several minutes or longer; retain the submission ID and inspect Apple’s rejection log before changing entitlements. Do not weaken the app’s renderer sandbox to resolve signing errors.

## Windows: separate certificate or service required

Apple membership does not sign Windows executables. A publicly trusted Windows code-signing certificate/service and its identity verification are separate. No provider has been purchased or provisioned for VORO. The owner has authorized an unsigned Windows x64 experimental archive in the early-access release. It is explicitly labeled unsigned; publisher signing remains unprovisioned.

The prepared certificate-store path supports a certificate backed by an installed key or provider on a **Windows build host**. Configure `VORO_WINDOWS_CERT_SHA1` with its thumbprint and run the release builder with `--signed windows-x64`. Forge uses SHA-256 Authenticode signing and a timestamp server; failures stop packaging, and the final executable must pass Windows signature validation. This path cannot run on the current Mac and has only configuration-level tests until a Windows signing host is supplied.

Cloud signing services can be integrated once a provider/account is chosen. Signing does not guarantee immediate SmartScreen reputation. Do not claim that warning-free launch is assured or reuse an Apple certificate for Windows.

## Linux

Linux archives include SHA-256 checksums. Those are integrity checks, not a trusted-publisher signature. A detached signing scheme or signed package repository can be added separately; neither is configured now.

## Publication

Rebuild from clean merged source, run `npm run test:release` and the relevant app tests, inspect signatures and archive contents, then publish only the verified artifacts. Keep all credentials outside git. Update the website’s exact release mappings and signing labels only after public upload and verification.

References: [Apple Developer ID](https://developer.apple.com/developer-id/), [Electron Forge macOS signing](https://www.electronforge.io/guides/code-signing/code-signing-macos), [Electron Forge Windows signing](https://www.electronforge.io/guides/code-signing/code-signing-windows).
