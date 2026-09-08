# Public-readiness review

Published September 9, 2026, with the owner’s explicit authorization. **[usevoro/voro](https://github.com/usevoro/voro) is public.** This document records the preparation, active repository settings, and remaining binary-release work; public source does not imply a production-ready download.

## Prepared

- MIT selected by the owner, with root LICENSE and matching package/lockfile metadata. `private: true` in package.json prevents npm publication; it does not restrict the MIT license or GitHub visibility.
- Product README with actual application screenshots, source setup, supported-format limits, and truthful download availability.
- Contribution and security guidance, Contributor Covenant 2.0, third-party notices, issue forms, PR template, and CODEOWNERS.
- Local type checking, integration, Electron, and packaging commands documented. GitHub Actions disabled and the automatic workflow removed at the owner’s request; there are no required CI checks or automated releases.
- Owner-only write access and active PR/merge protection verified; exact policy in [repository administration](REPOSITORY_ADMIN.md).
- Gitleaks 8.30.1 scanned all available git refs/history with redacted output: no secrets detected. Automated scans are evidence, not a guarantee that every secret or private detail is absent.
- Runtime npm audit: zero reported advisories. Full audit: 15 high-severity affected package entries rooted in two build-time `extract-zip` advisories. See [SECURITY.md](../SECURITY.md); recheck before distributing binaries.
- New README screenshots use synthetic fixtures and illustrative reviews. Font, decoder, fixture, and artwork provenance is retained in [third-party notices](../THIRD_PARTY_NOTICES.md).

## Local validation on September 9

Node 22: formatting and type checking passed; 11 integration tests and all four Electron suites passed. macOS arm64 packaging and all four packaged-app suites passed. The packaged archive includes LICENSE and generated third-party notices. README screenshots were visually inspected and all new local documentation links resolve. No hosted CI was run for these changes.

## Publication and active settings

- Public visibility and anonymous access to the repository, README, license, and screenshot assets verified.
- Main requires pull requests, resolved conversations, linear history, and owner-only merging. Administrator enforcement is enabled; force pushes and deletion are disabled. There are no required CI checks.
- GitHub Actions remains disabled. No hosted CI or release automation was enabled for publication.
- Private vulnerability reporting, secret scanning, and secret push protection are enabled. Dependency-update automation remains disabled.
- Existing git history was published without rewriting it, including historical personal author-email metadata. New commits use the GitHub noreply identity. Earlier Actions runs and artifacts were not deleted by disabling Actions.
- MIT is recognized by GitHub. README screenshots and contribution/security links are included in the public source.

## Separate gates for application downloads

Public source does not imply shipping binaries. There are currently no public downloads. Signing/notarization, supported macOS/CPU targets, Windows/Linux validation, real-project format testing, dependency advisories, and GPU/filesystem stress checks remain in the [release gates](IMPLEMENTATION.md#release-gates). Do not publish placeholder installers or imply all-platform support.
