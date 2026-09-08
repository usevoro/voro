# Repository administration

## Current access

As checked on September 9, 2026, `usevoro/voro` is public, the organization is on GitHub Free, the default organization permission is read, and only `@Domogo` has repository write access (as owner/admin). No repository teams or deploy keys grant additional access. Ordinary contributors have no direct push permission.

The owner authorized publication on September 9, 2026. Main-branch protection was applied and verified immediately after publication. The committed policy below matches the active GitHub configuration. Keep routine contributors at read/triage and accept changes through forks; never grant admin for routine contributions.

GitHub Actions is disabled at the repository level, and the automatic workflow has been removed. No status check is required by the active protection. Do not enable hosted CI, dependency-update workflows, or publishing automation without the maintainer’s agreement. Validation runs locally.

## Active main protection

[`.github/main-protection.json`](../.github/main-protection.json) requires:

- Pull requests for all updates to `main`, including the owner’s changes.
- Only `@Domogo` may merge/update the protected branch; ordinary contributors work through forks and PRs.
- Resolved review conversations and linear history.
- No force pushes or branch deletion; enforcement also applies to administrators.
- No required CI checks, bots, or automatic build jobs.

There is one maintainer, so the required approval count is zero and code-owner approval is not mandatory. The owner’s merge is the maintainer acceptance step for contributed changes. CODEOWNERS requests their review; it is not a substitute for branch protection. This configuration does not claim independent peer review of the owner’s own work. If a second trusted maintainer joins, require one approving review and code-owner review, then update both CODEOWNERS and the allowed merge users. Repository admins can still deliberately change protection settings.

## Maintain and verify protection

The [publication record](PUBLIC_READINESS.md) documents the launch and validation. The following commands reapply and inspect protection; they do not change visibility or enable Actions:

```sh
gh api --method PUT repos/usevoro/voro/branches/main/protection \
  --input .github/main-protection.json

gh api repos/usevoro/voro/branches/main/protection
gh api repos/usevoro/voro/actions/permissions
```

Verify the response matches the committed policy, `required_status_checks` is null, Actions reports `enabled: false`, the correct owner is allowed to merge, and a PR reports the expected merge restrictions. Confirm force pushes and deletion are disabled. Do not claim activation if the API returns an error. The PUT replaces the branch’s protection, so compare any existing policy before running it against a repository that already has rules.

Repository merge settings allow squash or rebase merges (to preserve logical commits), disable merge commits, and delete merged branches automatically. There is no automated merge or release process.

## Launch settings

GitHub’s built-in private vulnerability reporting, secret scanning, and secret push protection are enabled and verified. These settings are separate from Actions; leave Actions disabled. Dependency-update automation remains disabled. Review collaborator, team, app, and deploy-key access before adding contributors. Keep signing credentials out of repository files and history.
