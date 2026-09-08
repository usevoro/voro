# Contributing to VORO

VORO is a local 3D asset review app for game artists and developers. Small fixes can go straight to a pull request. For a new format adapter, storage change, large redesign, or new dependency, open a focused proposal first. Website work belongs in [usevoro/website](https://github.com/usevoro/website).

## Start here

1. Fork the repository and create a descriptive branch from `main`. While the repository is private, access is invitation-only.
2. Install Node.js 22.13+ in the 22.x line; `nvm use` reads `.nvmrc`.
3. Run `npm ci`, then `npm start`.
4. Generate a disposable project with `npm run fixtures -- /tmp/voro-sample` and open it in the app.
5. Keep changes focused and commit in understandable chunks.

Packaging and native smoke tests currently target macOS. Windows/Linux contributions are welcome, but verify on the target OS before claiming support. Never work against irreplaceable project files when testing persistence changes.

## Check your change

```sh
npm run format:check
npm run typecheck
npm test
npm run test:e2e
```

Run `npm run package` for changes to Electron, dependencies, build configuration, or bundled resources. Test the packaged executable as described in [development guidance](docs/DEVELOPMENT.md). GitHub Actions is disabled to avoid hosted CI usage. Run checks locally and include the results in your PR. There are no required CI checks or automatic releases.

Add a regression test for changes to saves, scans, resource authorization, exports, or preview behavior. Keep the existing malformed-file, conflict, and sandbox cases. Do not make a failing check pass by removing its assertions.

For visible changes, follow [DESIGN.md](DESIGN.md), test the normal and minimum window sizes (1480 × 960 and 1080 × 700), keyboard operation, light/dark themes, and loading/error states. Include before/after screenshots using synthetic assets. Source brand tokens live in `brand/tokens.css` and `brand/identity.json`.

## Pull requests and access

All contributions go through pull requests. Describe the problem, resulting behavior, and relevant validation; link an issue where useful. Maintainers review changes before merging. Contributors do not need repository write access: use forks. Do not push directly to `main`.

Only the owner currently has write access. The intended protection requires a pull request, resolved conversations, linear history, and owner-only merging. GitHub currently blocks enforcing branch protection on this private Free-plan repository. The exact configuration and activation checklist are in [repository administration](docs/REPOSITORY_ADMIN.md). Documentation and CODEOWNERS alone do not enforce these rules.

Update documentation when formats, persistence, security boundaries, or user workflows change. Do not promise platform builds, integrations, or complete glTF support without validation.

## Files, attribution, and conduct

Never commit credentials, `.env` files, proprietary models, personal project paths, or generated app packages. Check screenshots and log attachments before sharing them. Report vulnerabilities through [SECURITY.md](SECURITY.md), not public issues.

Contributions are provided under the repository’s MIT license. Identify material you did not create and preserve third-party notices. Fixture attribution lives in `tests/fixtures/ATTRIBUTION.md`; screenshot provenance lives in `docs/images/README.md`.

Participation follows the [Code of Conduct](CODE_OF_CONDUCT.md).
