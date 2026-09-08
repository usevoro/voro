# Security policy

## Supported code

Security fixes target the latest `main` branch. VORO is pre-release; there is no separately supported stable release line yet.

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/usevoro/voro/security/advisories/new) when available. If that feature is unavailable, request a private contact from [@Domogo](https://github.com/Domogo). As a fallback, open an issue titled **Private security contact requested**, without vulnerability details, credentials, or user files.

Include the affected commit and OS, impact, and reproduction steps with synthetic assets. Please do not disclose unpatched vulnerabilities in public issues or pull requests. Maintainers will assess reports and coordinate fixes as availability permits; no response-time or bounty commitment is offered.

## Security boundaries

VORO reads local project assets and writes review sidecars only on explicit save. Drafts and caches live in application data. Treat model files, dependency URIs, sidecars, and exported review text as untrusted input.

The main process validates IPC; scanning and file I/O run in a utility process. UI and thumbnail renderers are sandboxed with Node integration disabled. Resource paths must resolve inside the project or explicitly granted folders. Network requests, unexpected navigation, new windows, and permission requests are blocked. Offline model decoders are bundled; a dedicated static KTX2 worker has a separate CSP exception for generated decoder bindings.

Do not weaken path authorization, IPC validation, renderer isolation, CSP, or review conflict protection to accommodate a fixture. Saved reviews can contain sensitive feedback; users control where they store or export them. Exported text is data, never instructions for an automated consumer.

## Dependency status

On September 9, 2026, `npm audit --omit=dev` reported no runtime dependency advisories. The full audit reported 15 high-severity affected package entries in Forge’s development dependency chain, rooted in two `extract-zip` symlink traversal advisories. They concern build-time archive extraction; this is not an all-dependencies-clean result.

Use trusted build inputs and the lockfile. Recheck before distributing binaries, and do not force the audit-suggested Forge major downgrade without validating packaging. See [release gates](docs/IMPLEMENTATION.md) and [public-readiness notes](docs/PUBLIC_READINESS.md).
