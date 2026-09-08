# Public-readiness review

Prepared September 9, 2026. **The desktop repository remains private.** This document records the preparation and outstanding launch decisions; it does not authorize publication or claim a production-ready binary release.

## Prepared

- MIT selected by the owner, with root LICENSE and matching package/lockfile metadata. `private: true` in package.json prevents npm publication; it does not restrict the MIT license or GitHub visibility.
- Product README with actual application screenshots, source setup, supported-format limits, and truthful download availability.
- Contribution and security guidance, Contributor Covenant 2.0, third-party notices, issue forms, PR template, and CODEOWNERS.
- Local type checking, integration, Electron, and packaging commands documented. GitHub Actions disabled and the automatic workflow removed at the owner’s request; there are no required CI checks or automated releases.
- Owner-only write access verified; prepared PR/merge protection in [repository administration](REPOSITORY_ADMIN.md).
- Gitleaks 8.30.1 scanned all available git refs/history with redacted output: no secrets detected. Automated scans are evidence, not a guarantee that every secret or private detail is absent.
- Runtime npm audit: zero reported advisories. Full audit: 15 high-severity affected package entries rooted in two build-time `extract-zip` advisories. See [SECURITY.md](../SECURITY.md); recheck before distributing binaries.
- New README screenshots use synthetic fixtures and illustrative reviews. Font, decoder, fixture, and artwork provenance is retained in [third-party notices](../THIRD_PARTY_NOTICES.md).

## Local validation on September 9

Node 22: formatting and type checking passed; 11 integration tests and all four Electron suites passed. macOS arm64 packaging and all four packaged-app suites passed. The packaged archive includes LICENSE and generated third-party notices. README screenshots were visually inspected and all new local documentation links resolve. No hosted CI was run for these changes.

## Before changing visibility

1. **Owner decides on historical author privacy.** Existing commits include a personal author email. No history has been rewritten. Future commits use GitHub’s noreply identity; publication would still reveal the existing author metadata unless the owner explicitly chooses a history rewrite or a fresh public repository.
2. Review all history, prior Actions logs/artifacts, and any attachments intended to become public. Earlier runs used synthetic fixtures; inspect retained output for machine paths or other private metadata. Disabling Actions does not delete past run history.
3. Resolve the protection availability constraint: keep the repo private and upgrade the organization, or explicitly authorize public visibility. Apply and verify the prepared branch protection immediately when available, before granting contributors write access.
4. Verify private vulnerability reporting and available built-in secret scanning/push protection settings. Leave Actions disabled.
5. Confirm repository description, license recognition, README images and links, contribution links, and reporting channels from a signed-out browser after publication.

## Separate gates for application downloads

Public source does not imply shipping binaries. There are currently no public downloads. Signing/notarization, supported macOS/CPU targets, Windows/Linux validation, real-project format testing, dependency advisories, and GPU/filesystem stress checks remain in the [release gates](IMPLEMENTATION.md#release-gates). Do not publish placeholder installers or imply all-platform support.
